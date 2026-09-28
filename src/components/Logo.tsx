export function Logo({ light = false }: { light?: boolean }) {
  const ink = light ? '#f6efe6' : '#241910'
  return (
    <svg className="logo" viewBox="0 0 86 86" aria-hidden="true">
      <circle cx="43" cy="43" r="40" fill="none" stroke={ink} strokeWidth="1.4" />
      <circle cx="43" cy="43" r="34" fill="none" stroke={ink} strokeWidth="0.6" />
      <path
        d="M18 40c6-10 12-14 25-14s19 4 25 14"
        fill="none"
        stroke={ink}
        strokeWidth="0.8"
      />
      <path d="M22 36c2-2 4-3 6-2M64 36c-2-2-4-3-6-2" fill="none" stroke={ink} strokeWidth="0.7" />
      <text
        x="43"
        y="48"
        textAnchor="middle"
        fill={ink}
        fontFamily="Fraunces, Georgia, serif"
        fontSize="13"
        letterSpacing="1.5"
      >
        AUGUST
      </text>
      <text
        x="43"
        y="58"
        textAnchor="middle"
        fill={ink}
        fontFamily="Manrope, sans-serif"
        fontSize="5.2"
        letterSpacing="1.6"
      >
        CAFETERIA
      </text>
    </svg>
  )
}
