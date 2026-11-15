import React from 'react';

const ICONS: Record<string, string[]> = {
  hourglass: [
    '#########',
    '.#.....#.',
    '.#.###.#.',
    '..#.#.#..',
    '...###...',
    '....#....',
    '...#.#...',
    '..#...#..',
    '.#..#..#.',
    '.#.###.#.',
    '#########',
  ],
  toilet: [
    '.####......',
    '.#..#......',
    '.#..#......',
    '.#..#......',
    '.#..#######',
    '.#........#',
    '.##......##',
    '..########.',
    '...#....#..',
    '...#....#..',
    '..########.',
  ],
  poop: [
    '....#......',
    '...###.....',
    '..#####....',
    '..#...#....',
    '.#######...',
    '#########..',
    '.#.......#.',
    '###########',
    '###########',
    '.#########.',
    '...........',
  ],
};

interface PixelIconProps {
  name: 'hourglass' | 'toilet' | 'poop';
  className?: string;
}

export const PixelIcon: React.FC<PixelIconProps> = ({ name, className = '' }) => {
  const rows = ICONS[name];
  if (!rows) return null;

  const width = rows[0].length;
  const height = rows.length;

  return (
    <span className={`px ${className}`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        {rows.map((row, y) =>
          row.split('').map((c, x) =>
            c === '#' ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" /> : null
          )
        )}
      </svg>
    </span>
  );
};
