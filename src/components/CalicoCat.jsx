import { useEffect, useState } from 'react';

// Pixel-art calico (three-colour) cat drawn as horizontal scanlines,
// in the style of a low-res CRT / ASCII render.

const CAT = [
  '....K...............K...........',
  '...KOK.............KKK..........',
  '...KOOK...........KKKK..........',
  '..KOOOOK.........KKKKKK.........',
  '..KOOOOOKKKKKKKKKKKKKKK.........',
  '..KOOOOOOOWWWWWKKKKKKKK.........',
  '.KOOOOOOOOWWWWWKKKKKKKKK........',
  '.KOOOOOOOWWWWWWWKKKKKKKK........',
  '.KOOOOOOWWWWWWWWWKKKKKKK........',
  '.KOOOOEEWWWWWWWWEEKKKKKK........',
  '.KOOOOEKWWWWWWWWKEKKKKKK........',
  '.KOOOOOWWWWPPPWWWWKKKKKK........',
  '..KOOOWWWWWWKWWWWWWKKKK.........',
  '...KOOWWWWWKWKWWWWWKKK..........',
  '....KKWWWWWWWWWWWWWKK...........',
  '......KKWWWWWWWWWKK.............',
  '.....KWWWWWWWWWWWWWK............',
  '....KOOWWWWWWWWWWWKKK...........',
  '....KOOOWWWWWWWWWWKKKK..........',
  '...KOOOOWWWWWWWWWWWKKKK.........',
  '...KOOOOWWWWWWWWWWWKKKK.........',
  '...KOOOWWWWWWWWWWWWWKKK.........',
  '..KOOOWWWWWWWWWWWWWWKKKK........',
  '..KOOWWWKWWWWWWWKWWWWKKK........',
  '..KOWWWWKWWWWWWWKWWWWWKK........',
  '..KWWWWWKWWWWWWWKWWOOOWK........',
  '..KWWWWWKWWWWWWWKWWOOOWK........',
  '..KWWWWWKWWWKWWWKWWWWWWK........',
  '..KWWWWWKWWWKWWWKWWWWWWK........',
  '...KWWWKWWWWKWWWWKWWWWK.........',
  '...KKKKKKKKKKKKKKKKKKKK.........',
];

// Tail: [row, startCol, cells] drawn behind the body.
const TAIL = [
  [12, 28, 'KK'],
  [13, 27, 'KOOK'],
  [14, 27, 'KOKK'],
  [15, 27, 'KOOK'],
  [16, 27, 'KKOK'],
  [17, 27, 'KOOK'],
  [18, 27, 'KOKK'],
  [19, 27, 'KOOK'],
  [20, 27, 'KKOK'],
  [21, 27, 'KOOK'],
  [22, 26, 'KOOKK'],
  [23, 25, 'KOOOK'],
  [24, 24, 'KOOKK'],
  [25, 24, 'KKK'],
];

const COLORS = {
  K: 'var(--cat-black, #111111)',
  W: 'var(--cat-white, #b9b9b4)',
  O: 'var(--cat-orange, #e2782a)',
  E: 'var(--cat-eye, #e9b949)',
  P: 'var(--cat-nose, #e58d8d)',
};

const COLS = 34;
const LINES_PER_PX = 3;

// Eye cells per mood: [row, col, char]
const EYES = {
  open: [],
  closed: [
    [9, 6, 'O'], [9, 7, 'O'], [10, 6, 'K'], [10, 7, 'K'],
    [9, 16, 'K'], [9, 17, 'K'], [10, 16, 'E'], [10, 17, 'E'],
  ],
  happy: [
    [9, 6, 'K'], [9, 7, 'K'], [10, 6, 'O'], [10, 7, 'O'],
    [9, 16, 'E'], [9, 17, 'E'], [10, 16, 'K'], [10, 17, 'K'],
    [12, 4, 'P'], [12, 20, 'P'],
  ],
};

function buildGrid(mood) {
  const grid = Array.from({ length: CAT.length }, () => Array(COLS).fill('.'));
  TAIL.forEach(([r, c, cells]) => {
    [...cells].forEach((ch, i) => { grid[r][c + i] = ch; });
  });
  CAT.forEach((row, r) => {
    [...row].forEach((ch, c) => { if (ch !== '.') grid[r][c] = ch; });
  });
  (EYES[mood] || []).forEach(([r, c, ch]) => { grid[r][c] = ch; });
  return grid;
}

// Deterministic pseudo-random so the ragged edges are stable between renders.
function rand(seed) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function buildLines(mood) {
  const grid = buildGrid(mood);
  const lines = [];
  grid.forEach((row, r) => {
    // merge neighbouring same-colour cells into runs
    const runs = [];
    row.forEach((ch, c) => {
      const last = runs[runs.length - 1];
      if (ch === '.') return;
      if (last && last.ch === ch && last.end === c) last.end = c + 1;
      else runs.push({ ch, start: c, end: c + 1 });
    });
    for (let s = 0; s < LINES_PER_PX; s++) {
      const y = r + (s + 0.2) / LINES_PER_PX;
      const id = r * LINES_PER_PX + s;
      runs.forEach((run, i) => {
        const jitterL = (rand(id * 7 + i) - 0.5) * 0.5;
        const jitterR = (rand(id * 13 + i + 3) - 0.5) * 0.5;
        lines.push({
          key: `${id}-${i}`,
          x: run.start + jitterL,
          y,
          w: Math.max(0.2, run.end - run.start - jitterL + jitterR),
          fill: COLORS[run.ch],
          glitch: rand(id + 101) > 0.93 ? (rand(id + 7) > 0.5 ? 'a' : 'b') : null,
        });
      });
    }
  });
  return lines;
}

// Faint backdrop lines (top-right block + floor) like the reference render.
function buildBackdrop() {
  const out = [];
  for (let i = 0; i < 36; i++) {
    const y = -2 + i / LINES_PER_PX;
    const start = 21 + rand(i * 3.1) * 4 + i * 0.12;
    out.push({ key: `bg${i}`, x: start, y, w: COLS + 4 - start, o: 0.55 - i * 0.012 });
  }
  for (let i = 0; i < 6; i++) {
    const y = CAT.length + 0.3 + i / LINES_PER_PX;
    const start = 1 + rand(i * 5.7) * 3;
    out.push({ key: `fl${i}`, x: start, y, w: 28 - rand(i * 2.3) * 6, o: 0.5 - i * 0.07 });
  }
  return out;
}

const LINES = { open: buildLines('open'), closed: buildLines('closed'), happy: buildLines('happy') };
const BACKDROP = buildBackdrop();
const LINE_H = 0.42 / LINES_PER_PX * 1.6;

// mood: 'open' | 'closed' | 'happy'. blink: occasionally close the eyes.
export default function CalicoCat({ className = '', mood = 'open', blink = true, backdrop = true }) {
  const [blinking, setBlinking] = useState(false);

  useEffect(() => {
    if (!blink || mood !== 'open') return undefined;
    let t1;
    let t2;
    const loop = () => {
      t1 = setTimeout(() => {
        setBlinking(true);
        t2 = setTimeout(() => { setBlinking(false); loop(); }, 160);
      }, 2500 + Math.random() * 3500);
    };
    loop();
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [blink, mood]);

  const lines = LINES[mood === 'open' && blinking ? 'closed' : mood] || LINES.open;

  return (
    <svg
      className={`calico-cat ${className}`}
      viewBox={`-1 -3 ${COLS + 3} ${CAT.length + 6}`}
      role="img"
      aria-label="Pixel calico cat"
      preserveAspectRatio="xMidYMax meet"
    >
      {backdrop && <g>
        {BACKDROP.map((l) => (
          <rect key={l.key} x={l.x} y={l.y} width={l.w} height={LINE_H}
            fill="var(--cat-backdrop, #8a8a86)" opacity={Math.max(0, l.o)} />
        ))}
      </g>}
      <g className="calico-cat__body">
        {lines.map((l) => (
          <rect
            key={l.key}
            x={l.x}
            y={l.y}
            width={l.w}
            height={LINE_H}
            fill={l.fill}
            className={l.glitch ? `glitch-${l.glitch}` : undefined}
          />
        ))}
      </g>
    </svg>
  );
}
