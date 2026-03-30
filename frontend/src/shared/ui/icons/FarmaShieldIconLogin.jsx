const FarmaShieldIconLogin = ({ className = 'h-24 w-24' }) => (
  <svg viewBox="0 0 96 96" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="feLoginBadge" x1="8" y1="8" x2="88" y2="88" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFFFFF" />
        <stop offset="1" stopColor="#EFE8FF" />
      </linearGradient>
      <linearGradient id="feLoginShield" x1="30" y1="22" x2="66" y2="82" gradientUnits="userSpaceOnUse">
        <stop stopColor="#8E5DFF" />
        <stop offset="1" stopColor="#5F27CF" />
      </linearGradient>
    </defs>

    <rect x="8" y="8" width="80" height="80" rx="20" fill="url(#feLoginBadge)" />
    <rect x="8.75" y="8.75" width="78.5" height="78.5" rx="19.25" stroke="rgba(94, 39, 207, 0.26)" strokeWidth="1.5" />

    <g transform="translate(0,-4)">
      <path
        d="M48 25L69 37V52.6C69 66.2 60.5 75.9 48 81C35.5 75.9 27 66.2 27 52.6V37L48 25Z"
        stroke="url(#feLoginShield)"
        strokeWidth="5.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M48 40V60" stroke="url(#feLoginShield)" strokeWidth="5.2" strokeLinecap="round" />
      <path d="M39.3 50H56.7" stroke="url(#feLoginShield)" strokeWidth="5.2" strokeLinecap="round" />
    </g>
  </svg>
)

export default FarmaShieldIconLogin
