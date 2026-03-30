const FarmaShieldIcon = ({ className = 'h-16 w-16', variant = 'default' }) => {
  const isInverse = variant === 'inverse'

  const bgStart = isInverse ? '#FFFFFF' : '#8E5DFF'
  const bgEnd = isInverse ? '#F3ECFF' : '#5F27CF'
  const strokeColor = isInverse ? '#6B31D6' : '#FFFFFF'

  return (
    <svg viewBox="0 0 96 96" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`feShieldBg-${variant}`} x1="8" y1="8" x2="88" y2="88" gradientUnits="userSpaceOnUse">
          <stop stopColor={bgStart} />
          <stop offset="1" stopColor={bgEnd} />
        </linearGradient>
      </defs>

      <rect x="8" y="8" width="80" height="80" rx="20" fill={`url(#feShieldBg-${variant})`} />
      {!isInverse && <rect x="8" y="8" width="80" height="80" rx="20" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" />}

      {/* Se aplica ajuste de centrado óptico para alinear el símbolo exactamente al cuadro. */}
      <g transform="translate(0,-4)">
        <path
          d="M48 25L69 37V52.6C69 66.2 60.5 75.9 48 81C35.5 75.9 27 66.2 27 52.6V37L48 25Z"
          stroke={strokeColor}
          strokeWidth="5.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M48 40V60" stroke={strokeColor} strokeWidth="5.2" strokeLinecap="round" />
        <path d="M39.3 50H56.7" stroke={strokeColor} strokeWidth="5.2" strokeLinecap="round" />
      </g>
    </svg>
  )
}

export default FarmaShieldIcon
