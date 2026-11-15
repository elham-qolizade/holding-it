'use client';

import React, { useState } from 'react';
import { RetroWindow } from './RetroWindow';
import { SosPlace, Lang, ToiletCondition } from '@/types';
import { dictionaries, num, MIN } from '@/lib/i18n';
import {
  fetchPlacesNear,
  addPlaceWithDetails,
  reportStatus,
  reportPlace,
} from '@/lib/supabase';

interface SosFinderProps {
  isOpen: boolean;
  onToggle: () => void;
  session: string;
  lang: Lang;
}

const SEARCHES = [
  { kind: 'toilet' as const, q: 'toilets', types: ['toilets'], radius: 1500, limit: 40 },
  { kind: 'worship' as const, q: 'place of worship', types: ['place_of_worship'], radius: 800, limit: 40 },
  { kind: 'fuel' as const, q: 'petrol station', types: ['fuel'], radius: 800, limit: 40 },
  { kind: 'hospital' as const, q: 'hospital', types: ['hospital'], radius: 1500, limit: 40 },
  { kind: 'clinic' as const, q: 'clinic', types: ['clinic'], radius: 800, limit: 40 },
];

function metres([lat1, lon1]: [number, number], [lat2, lon2]: [number, number]): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(a));
}

const sameSpot = (a: SosPlace, b: SosPlace) =>
  a.kind === b.kind && metres(a.pos, b.pos) < (a.name && a.name === b.name ? 80 : 15);

export const SosFinder: React.FC<SosFinderProps> = ({
  isOpen,
  onToggle,
  session,
  lang,
}) => {
  const t = dictionaries[lang];
  const [places, setPlaces] = useState<SosPlace[]>([]);
  const [statusText, setStatusText] = useState('');
  const [isWarn, setIsWarn] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState('');
  const [searching, setSearching] = useState(false);

  // Add place form state
  const [fee, setFee] = useState<'free' | 'paid' | 'unknown'>('unknown');
  const [initialStatus, setInitialStatus] = useState<ToiletCondition | ''>('');
  const [toiletType, setToiletType] = useState('unknown');
  const [hours, setHours] = useState('');
  const [note, setNote] = useState('');
  const [addStatus, setAddStatus] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const fmtDist = (m: number) =>
    m < 950
      ? t.metres(num(Math.max(10, Math.round(m / 10) * 10), lang))
      : t.kms(num((m / 1000).toFixed(1), lang));

  const handleSearch = () => {
    setPlaces([]);
    setFallbackUrl('https://www.google.com/maps/search/?api=1&query=public+toilet');
    if (!navigator.geolocation) {
      setStatusText(t.sosNoGeo);
      setIsWarn(true);
      return;
    }

    setStatusText(t.sosLocating);
    setIsWarn(false);
    setSearching(true);

    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        setFallbackUrl(
          `https://www.google.com/maps/search/?api=1&query=public+toilet+near+${latitude},${longitude}`
        );
        setStatusText(t.sosSearching);

        const found: SosPlace[] = [];
        const have = new Set<string>();

        // 1. Fetch community places from Supabase
        try {
          const mine = await fetchPlacesNear(latitude, longitude, 5000);
          found.push(
            ...mine.map(r => ({
              kind: 'toilet' as const,
              name: r.note || '',
              pos: [r.lat, r.lon] as [number, number],
              dist: metres([latitude, longitude], [r.lat, r.lon]),
              tags: {
                fee: r.fee === 'free' ? 'no' : r.fee === 'paid' ? 'yes' : undefined,
                toiletType: r.toilet_type,
                opening_hours: r.opening_hours || undefined,
              },
              community: {
                id: r.id,
                confirms: r.confirms,
                lastStatus: r.last_status,
                lastReportedAt: r.last_reported_at,
              },
            }))
          );
          if (found.length) setPlaces([...found]);
        } catch {}

        // 2. Fetch from OpenStreetMap Nominatim
        let requests = 0;
        for (const scale of [1, 3]) {
          const todo = SEARCHES.filter(s => !have.has(s.kind));
          for (const s of todo) {
            if (requests++) {
              await new Promise(r => setTimeout(r, 1100));
            }
            try {
              const [clat, clon] = [latitude.toFixed(3), longitude.toFixed(3)].map(Number);
              const dLat = (s.radius * scale) / 111_320;
              const dLon = dLat / Math.cos((clat * Math.PI) / 180);
              const r = await fetch(
                'https://nominatim.openstreetmap.org/search?' +
                  new URLSearchParams({
                    format: 'jsonv2',
                    q: s.q,
                    bounded: '1',
                    limit: String(s.limit),
                    extratags: '1',
                    viewbox: [clon - dLon, clat + dLat, clon + dLon, clat - dLat].join(','),
                  }),
                { signal: AbortSignal.timeout(10_000) }
              );
              if (r.ok) {
                const data = await r.json();
                const filtered = data
                  .filter(
                    (x: any) =>
                      s.types.includes(x.type) &&
                      (!x.extratags?.religion || x.extratags.religion === 'muslim')
                  )
                  .map((x: any) => {
                    const tags = x.extratags ?? {};
                    const posTag = tags['toilets:position'];
                    tags.toiletType =
                      /squat/.test(posTag) && /seated/.test(posTag)
                        ? 'both'
                        : /squat/.test(posTag)
                        ? 'iranian'
                        : /seated/.test(posTag)
                        ? 'western'
                        : 'unknown';
                    return {
                      kind: s.kind,
                      name: x.name || '',
                      tags,
                      pos: [+x.lat, +x.lon] as [number, number],
                      dist: metres([latitude, longitude], [+x.lat, +x.lon]),
                    };
                  });
                if (filtered.length) have.add(s.kind);
                for (const p of filtered) {
                  if (!found.some(f => sameSpot(f, p))) found.push(p);
                }
                setPlaces([...found]);
              }
            } catch {}
          }
        }

        setSearching(false);
        const toilets = found.filter(p => p.kind === 'toilet');
        if (!found.length) {
          setStatusText(t.sosNone);
          setIsWarn(true);
        } else if (!toilets.length) {
          setStatusText(t.sosNoMapped);
          setIsWarn(true);
        } else {
          setStatusText('');
          setIsWarn(false);
        }
      },
      () => {
        setSearching(false);
        setStatusText(t.sosDenied);
        setIsWarn(true);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    );
  };

  const handleAddSubmit = () => {
    if (!navigator.geolocation) {
      setAddStatus(t.sosNoGeo);
      return;
    }
    setAddStatus(t.sosAdding);
    setIsAdding(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const placeId = await addPlaceWithDetails({
            p_session: session,
            p_lat: coords.latitude,
            p_lon: coords.longitude,
            p_fee: fee,
            p_note: note.trim() || null,
            p_toilet_type: toiletType,
            p_opening_hours: hours.trim() || null,
          });

          if (initialStatus) {
            await reportStatus({
              p_session: session,
              p_place_id: placeId,
              p_status: initialStatus,
            }).catch(() => {});
          }

          setAddStatus(t.sosAdded);
          setNote('');
          setHours('');
          setToiletType('unknown');
          setInitialStatus('');
        } catch (e: any) {
          setAddStatus(
            /already/.test(e.message)
              ? t.sosAddAlready
              : /limit/.test(e.message)
              ? t.sosAddLimit
              : t.sosAddError
          );
        }
        setIsAdding(false);
      },
      () => {
        setAddStatus(t.sosDenied);
        setIsAdding(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  };

  const handleUpdateStatus = async (place: SosPlace, status: ToiletCondition) => {
    if (!place.community) return;
    try {
      const res = await reportStatus({
        p_session: session,
        p_place_id: place.community.id,
        p_status: status,
      });
      setPlaces(prev =>
        prev.map(p => {
          if (p.community && place.community && p.community.id === place.community.id) {
            return {
              ...p,
              community: {
                ...p.community,
                lastStatus: res.status as ToiletCondition,
                lastReportedAt: res.reported_at,
              },
            };
          }
          return p;
        })
      );
    } catch {}
  };

  const handleReportWrong = async (place: SosPlace) => {
    if (!place.community) return;
    try {
      await reportPlace({ p_session: session, p_id: place.community.id });
    } catch {}
  };

  const toilets = places.filter(p => p.kind === 'toilet').sort((a, b) => a.dist - b.dist).slice(0, 5);
  const likely = SEARCHES.map(s => s.kind)
    .filter(k => k !== 'toilet')
    .flatMap(k => places.filter(p => p.kind === k).sort((a, b) => a.dist - b.dist).slice(0, 2));

  return (
    <RetroWindow
      id="sos"
      title={t.sosTitle}
      className="soswin"
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div className="body">
        <button
          id="sosBtn"
          type="button"
          className="btn"
          disabled={searching}
          onClick={handleSearch}
        >
          {searching ? t.sosSearching : t.sosFind}
        </button>

        {statusText && (
          <p id="sosStatus" className={isWarn ? 'warn' : ''} role="status">
            {statusText}
          </p>
        )}

        {isWarn && fallbackUrl && (
          <a
            id="sosFallback"
            className="rescue"
            href={fallbackUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.sosFallback}
          </a>
        )}

        <ul id="sosList">
          {toilets.length > 0 && <li className="group">{t.sosMapped}</li>}
          {toilets.map((p, idx) => (
            <PlaceItem
              key={`toilet-${idx}`}
              place={p}
              fmtDist={fmtDist}
              lang={lang}
              onUpdateStatus={handleUpdateStatus}
              onReportWrong={handleReportWrong}
            />
          ))}

          {likely.length > 0 && <li className="group">{t.sosLikely}</li>}
          {likely.map((p, idx) => (
            <PlaceItem
              key={`likely-${idx}`}
              place={p}
              fmtDist={fmtDist}
              lang={lang}
              onUpdateStatus={handleUpdateStatus}
              onReportWrong={handleReportWrong}
            />
          ))}
        </ul>

        <details id="sosAdd">
          <summary>{t.sosAddOpen}</summary>
          <p className="muted">{t.sosAddNote}</p>

          <div className="fee">
            <label>
              <input
                type="radio"
                name="fee"
                value="free"
                checked={fee === 'free'}
                onChange={() => setFee('free')}
              />
              <span>{t.sosFreeLabel}</span>
            </label>
            <label>
              <input
                type="radio"
                name="fee"
                value="paid"
                checked={fee === 'paid'}
                onChange={() => setFee('paid')}
              />
              <span>{t.sosPaidLabel}</span>
            </label>
            <label>
              <input
                type="radio"
                name="fee"
                value="unknown"
                checked={fee === 'unknown'}
                onChange={() => setFee('unknown')}
              />
              <span>{t.sosFeeUnknown}</span>
            </label>
          </div>

          <fieldset className="condition">
            <legend>{t.sosConditionLabel}</legend>
            <div className="condition-options">
              {(['usable', 'clean', 'dirty'] as const).map(c => (
                <label key={c}>
                  <input
                    type="radio"
                    name="initialStatus"
                    value={c}
                    checked={initialStatus === c}
                    onChange={() => setInitialStatus(c)}
                  />
                  <span>
                    {c === 'usable'
                      ? t.sosConditionUsable
                      : c === 'clean'
                      ? t.sosConditionClean
                      : t.sosConditionDirty}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <details className="sos-advanced">
            <summary>{t.sosAdvanced}</summary>
            <div className="detail-fields">
              <label>
                <span>{t.sosTypeLabel}</span>
                <select value={toiletType} onChange={e => setToiletType(e.target.value)}>
                  <option value="unknown">{t.sosTypeUnknown}</option>
                  <option value="iranian">{t.sosTypeIranian}</option>
                  <option value="western">{t.sosTypeWestern}</option>
                  <option value="both">{t.sosTypeBoth}</option>
                </select>
              </label>

              <label>
                <span>{t.sosHoursLabel}</span>
                <input
                  id="sosHoursIn"
                  maxLength={80}
                  placeholder={t.sosHoursPh}
                  value={hours}
                  onChange={e => setHours(e.target.value)}
                />
              </label>

              <label>
                <span>{t.sosNoteLabel}</span>
                <input
                  id="sosNoteIn"
                  maxLength={60}
                  placeholder={t.sosNotePh}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </label>
            </div>
          </details>

          <button
            id="sosAddBtn"
            type="button"
            className="btn small"
            disabled={isAdding}
            onClick={handleAddSubmit}
          >
            {isAdding ? t.sosAdding : t.sosAddGo}
          </button>
          {addStatus && <p id="sosAddStatus" role="status">{addStatus}</p>}
        </details>
      </div>
    </RetroWindow>
  );
};

interface PlaceItemProps {
  place: SosPlace;
  fmtDist: (m: number) => string;
  lang: Lang;
  onUpdateStatus: (place: SosPlace, status: ToiletCondition) => void;
  onReportWrong: (place: SosPlace) => void;
}

const PlaceItem: React.FC<PlaceItemProps> = ({
  place,
  fmtDist,
  lang,
  onUpdateStatus,
  onReportWrong,
}) => {
  const t = dictionaries[lang];
  const [showStatusBox, setShowStatusBox] = useState(false);
  const [reported, setReported] = useState(false);

  const { kind, name, tags, pos, dist, community } = place;
  const label =
    kind === 'toilet'
      ? t.sosToilet
      : kind === 'worship'
      ? tags.religion === 'muslim'
        ? t.sosKinds.mosque
        : t.sosKinds.worship
      : t.sosKinds[kind];

  const metaItems = [
    fmtDist(dist),
    name ? label : null,
    community ? t.sosCommunity : null,
    community && community.confirms > 1 ? t.sosConfirms(num(community.confirms, lang)) : null,
    tags.fee === 'yes' ? t.sosFee : tags.fee === 'no' ? t.sosFree : null,
    tags.wheelchair === 'yes' ? '♿' : null,
  ].filter(Boolean);

  const minsAgo = community?.lastReportedAt
    ? Math.max(0, Math.round((Date.now() - new Date(community.lastReportedAt).getTime()) / MIN))
    : null;

  const isClosedRecent = community?.lastStatus === 'closed' && (minsAgo ?? 0) <= 120;

  return (
    <li className={`place ${isClosedRecent ? 'closed' : ''}`}>
      <b>
        <bdi>{name || label}</bdi>
      </b>

      <a
        className="btn small"
        href={`https://www.google.com/maps/dir/?api=1&destination=${pos[0]},${pos[1]}&travelmode=walking`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {t.sosGo}
      </a>

      <span className="muted">{metaItems.join(' · ')}</span>

      <span className="badges">
        {tags.fee === 'yes' && <span className="badge money">💸 {t.sosFee}</span>}
        {tags.fee === 'no' && <span className="badge good">🟢 {t.sosFree}</span>}
        {tags.toiletType && tags.toiletType !== 'unknown' && (
          <span className="badge">🚽 {t.sosType[tags.toiletType]}</span>
        )}
        {tags.opening_hours && <span className="badge">🕐 {t.sosHours(tags.opening_hours)}</span>}
        {community?.lastStatus && minsAgo !== null && (
          <span
            className={`badge ${
              ['usable', 'clean'].includes(community.lastStatus)
                ? 'good'
                : community.lastStatus === 'paid'
                ? 'money'
                : 'bad'
            }`}
          >
            {t.sosStatuses[community.lastStatus]} · {t.sosAgo(num(minsAgo, lang))}
          </span>
        )}
      </span>

      {community && (
        <span className="place-tools">
          <button
            type="button"
            className="status-toggle"
            onClick={() => setShowStatusBox(prev => !prev)}
          >
            {t.sosUpdate}
          </button>

          {showStatusBox && (
            <span className="status-box">
              <span className="status-actions">
                {(['usable', 'clean', 'dirty', 'closed', 'paid'] as const).map(st => (
                  <button
                    key={st}
                    type="button"
                    title={t.sosStatuses[st]}
                    onClick={() => {
                      onUpdateStatus(place, st);
                      setShowStatusBox(false);
                    }}
                  >
                    {t.sosStatuses[st].split(' ')[0]}
                  </button>
                ))}
              </span>
            </span>
          )}

          <button
            type="button"
            className="report"
            disabled={reported}
            onClick={() => {
              onReportWrong(place);
              setReported(true);
            }}
          >
            {reported ? t.sosReported : t.sosReport}
          </button>
        </span>
      )}
    </li>
  );
};
