// Run: npm install --prefix /tmp/holding-it-db-tests @electric-sql/pglite
// HOLDING_IT_PGLITE=/tmp/holding-it-db-tests/node_modules/@electric-sql/pglite/dist/index.js node tests/database.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.HOLDING_IT_PGLITE);
const db = new PGlite();
let passed = 0;
const q = async (sql, params=[]) => (await db.query(sql, params)).rows;
const scalar = async (sql,params=[]) => Object.values((await q(sql,params))[0])[0];
const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const headers = async ip => q("select set_config('request.headers', $1, false)",[JSON.stringify(ip ? {'x-real-ip':ip} : {})]);
const reset = async () => { await db.exec('truncate public.places, public.status_reports, private.status_report_attempts restart identity cascade'); await headers('192.0.2.1'); };
const add = async (n=1,lat=35,lon=51,type='western') => scalar('select public.add_place_with_details($1,$2,$3,$4,$5,$6,$7)',[uid(n),lat,lon,'free','test',type,'24/7']);
const report = async(n,id,status='closed') => scalar('select public.report_status($1,$2,$3)',[uid(n),id,status]);
const effective = async id => (await q('select * from public.effective_place_status($1)',[id]))[0]?.status ?? null;
const fails = async (fn,pattern) => assert.rejects(fn,pattern);
const test = async(name,fn) => {await reset();await fn();passed++;console.log(`PASS ${name}`);};
try {
 await db.exec('create role anon; create role authenticated;');
 const schema=fs.readFileSync(new URL('../supabase/schema.sql',import.meta.url),'utf8');
 await db.exec(schema);console.log('PASS fresh schema execution');passed++;
 // Legacy fixture models a pre-existing reaction RPC and data, independent of its implementation.
 await db.exec("create table public.event_reactions(id int primary key, reaction text); insert into public.event_reactions values(1,'legacy'); create function public.react_event(uuid,bigint,text) returns text language sql as $$select $3$$; grant execute on function public.react_event(uuid,bigint,text) to anon;");
 await db.exec(schema);await db.exec(schema);
 assert.equal(await scalar('select reaction from public.event_reactions where id=1'),'legacy');
 assert.equal(await scalar("select public.react_event($1,1,'legacy')",[uid(1)]),'legacy');
 console.log('PASS repeated migration preserves legacy rows and RPC');passed++;
 await test('atomic new place with details',async()=>{const id=await add();assert.deepEqual((await q('select toilet_type,opening_hours from public.places where id=$1',[id]))[0],{toilet_type:'western',opening_hours:'24/7'});});
 await test('details failure rolls back new place and permits retry',async()=>{await fails(()=>add(1,35,51,'invalid'),/bad details/);assert.equal(await scalar('select count(*)::int from public.places'),0);await add();});
 await test('details failure rolls back nearby confirmation and field changes',async()=>{const id=await add();await fails(()=>add(2,35,51,'invalid'),/bad details/);assert.equal(await scalar('select cardinality(by_sessions) from public.places where id=$1',[id]),1);assert.equal(await add(2),id);});
 await test('anonymous role can call atomic RPC but cannot read tables/helper',async()=>{await db.exec('set role anon');try{await add();await fails(()=>q('select * from public.places'),/permission denied/);await fails(()=>q('select * from public.status_reports'),/permission denied/);await fails(()=>q('select * from private.status_report_attempts'),/permission denied/);await fails(()=>q('select * from public.effective_place_status(1)'),/permission denied/);}finally{await db.exec('reset role');}});
 await test('single closure pending in RPC and nearby query',async()=>{const id=await add();assert.equal((await report(1,id)).status,null);assert.equal(await effective(id),null);const rows=await scalar('select public.places_near(35,51)');assert.equal(rows[0].last_status,null);});
 await test('session rotation on one network cannot confirm closure',async()=>{const id=await add();await report(1,id);assert.equal((await report(2,id)).status,null);assert.equal(await effective(id),null);});
 await test('two sessions and networks confirm closure consistently',async()=>{const id=await add();await report(1,id);await headers('192.0.2.2');assert.equal((await report(2,id)).status,'closed');assert.equal((await scalar('select public.places_near(35,51)'))[0].last_status,'closed');});
 await test('same session across networks is not independent',async()=>{const id=await add();await report(1,id);await db.exec("update public.status_reports set created_at=now()-interval '30 seconds'");await headers('192.0.2.2');assert.equal((await report(1,id)).status,null);});
 await test('missing network headers cannot confirm closure',async()=>{const id=await add();await headers(null);await report(1,id);assert.equal((await report(2,id)).status,null);});
 await test('closed expires after two hours',async()=>{const id=await add();await report(1,id);await headers('192.0.2.2');await report(2,id);await db.exec("update public.status_reports set created_at=now()-interval '121 minutes'");assert.equal(await effective(id),null);});
 await test('ordinary status expires after 24 hours',async()=>{const id=await add();assert.equal((await report(1,id,'clean')).status,'clean');await db.exec("update public.status_reports set created_at=now()-interval '25 hours'");assert.equal(await effective(id),null);});
 await test('20-second cooldown',async()=>{const id=await add();await report(1,id,'clean');await fails(()=>report(1,id,'dirty'),/too fast/);});
 await test('session quota survives revisions',async()=>{const id=await add();for(let i=0;i<20;i++){await db.exec("update public.status_reports set created_at=now()-interval '30 seconds'");await report(1,id,i%2?'clean':'dirty');}await fails(()=>report(1,id),/daily limit/);assert.equal(await scalar('select count(*)::int from private.status_report_attempts'),20);});
 await test('network quota survives session rotation',async()=>{const id=await add();for(let i=1;i<=40;i++)await report(i,id,'clean');await fails(()=>report(41,id,'clean'),/daily limit/);await headers('192.0.2.2');await report(41,id,'clean');});
 await test('expired quota entries no longer block',async()=>{const id=await add();await db.exec("insert into private.status_report_attempts(session,created_at) select '"+uid(1)+"'::uuid,now()-interval '25 hours' from generate_series(1,20)");await report(1,id,'clean');assert.equal(await scalar('select count(*)::int from private.status_report_attempts'),1);});
 await test('bad reports and hidden places are rejected',async()=>{const id=await add();await fails(()=>report(1,id,'invalid'),/bad report/);await db.exec('update public.places set hidden=true');await fails(()=>report(1,id),/missing place/);});
 await test('forced database write failure rolls back place and allows retry',async()=>{
  await db.exec("create function private.fail_details_test() returns trigger language plpgsql as $$begin raise exception 'forced details write failure'; end$$; create trigger fail_details_test before update of toilet_type on public.places for each row execute function private.fail_details_test();");
  try{await fails(()=>add(),/forced details write failure/);assert.equal(await scalar('select count(*)::int from public.places'),0);}
  finally{await db.exec('drop trigger fail_details_test on public.places; drop function private.fail_details_test();');}
  await add();
 });
 await test('RPC status works for anon and authenticated without helper access',async()=>{
  const id=await add();
  for(const role of ['anon','authenticated']){
   await db.exec(`set role ${role}`);
   try{assert.equal((await report(role==='anon'?2:3,id,'clean')).status,'clean');await q('select public.places_near(35,51)');}
   finally{await db.exec('reset role');}
  }
 });
 await test('invalid coordinates and duplicate submissions do not create places',async()=>{
  await fails(()=>add(1,95,51),/bad position/);await add();await fails(()=>add(),/already/);
  assert.equal(await scalar('select count(*)::int from public.places'),1);
 });
 await test('tables retain row-level security after repeated migration',async()=>{
  const rows=await q("select relname,relrowsecurity from pg_class where oid in ('public.events'::regclass,'public.places'::regclass,'public.status_reports'::regclass,'public.feedback'::regclass)");
  assert.equal(rows.length,4);assert.ok(rows.every(row=>row.relrowsecurity));
 });
 await test('feedback stores optional nickname',async()=>{await q("select public.submit_feedback($1,'bug','test message','tester','fa','web-21')",[uid(1)]);assert.equal(await scalar('select public_name from public.feedback order by id desc limit 1'),'tester');});
 console.log(`\n${passed} database checks passed.`);
}finally{await db.close();}
