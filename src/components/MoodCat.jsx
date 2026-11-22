// Tiny pixel calico in the quota bar. mood: 'playful' | 'sleepy' | 'asleep'
export default function MoodCat({ mood = 'playful', size = 34 }) {
  const eyes = {
    playful: (
      <>
        <rect x="13" y="4" width="1" height="2" fill="#111" />
        <rect x="16" y="4" width="1" height="2" fill="#111" />
      </>
    ),
    sleepy: (
      <>
        <rect x="12.5" y="5" width="2" height="0.8" fill="#111" />
        <rect x="15.5" y="5" width="2" height="0.8" fill="#111" />
      </>
    ),
    asleep: (
      <>
        <path d="M12.5 5 q1 1 2 0" stroke="#111" strokeWidth="0.6" fill="none" />
        <path d="M15.5 5 q1 1 2 0" stroke="#111" strokeWidth="0.6" fill="none" />
      </>
    ),
  }[mood];

  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 24 14" className={`mood-cat mood-${mood}`} aria-hidden="true" shapeRendering="crispEdges">
      <g className="mood-body">
        {/* tail */}
        <g className="mood-tail">
          <rect x="2" y="5" width="1.5" height="4" fill="#e2782a" />
          <rect x="2" y="4" width="1.5" height="1" fill="#111" />
          <rect x="3.5" y="8" width="1.5" height="1.5" fill="#e2782a" />
        </g>
        {/* body */}
        <rect x="4" y="7" width="9" height="5" fill="#f4f4f1" />
        <rect x="4" y="7" width="3" height="3" fill="#e2782a" />
        <rect x="9" y="7" width="3" height="2" fill="#111" />
        {/* legs */}
        <g className="mood-legs">
          <rect x="5" y="12" width="1.5" height="2" fill="#f4f4f1" />
          <rect x="10.5" y="12" width="1.5" height="2" fill="#f4f4f1" />
        </g>
        {/* head */}
        <g className="mood-head">
          <rect x="11" y="2" width="8" height="7" fill="#f4f4f1" />
          <rect x="11" y="2" width="3" height="3" fill="#e2782a" />
          <rect x="17" y="2" width="2" height="3" fill="#111" />
          <path d="M11 2 L12 0 L13.5 2 Z" fill="#e2782a" />
          <path d="M16.5 2 L18 0 L19 2 Z" fill="#111" />
          {eyes}
          <rect x="14.6" y="6.4" width="0.9" height="0.7" fill="#e58d8d" />
          {mood === 'sleepy' && <ellipse className="mood-yawn" cx="15" cy="7.8" rx="1.1" ry="0.9" fill="#7a2e2e" />}
        </g>
      </g>
      {mood === 'asleep' && (
        <g className="mood-zzz" fill="#eeeeec" fontFamily="Silkscreen, monospace" fontSize="3.4">
          <text x="19.5" y="3">z</text>
          <text x="21.5" y="1.2" fontSize="2.6">z</text>
        </g>
      )}
    </svg>
  );
}
