import React from 'react';

interface NovaLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  withGlow?: boolean;
  withBackground?: boolean;
}

export const NovaLogo: React.FC<NovaLogoProps> = ({
  size = 'md',
  className = '',
  withGlow = false,
  withBackground = false,
}) => {
  const containerSizes = {
    xs: 'w-4 h-4 p-0.5',
    sm: 'w-5 h-5 p-0.5',
    md: 'w-8 h-8 p-0.5',
    lg: 'w-10 h-10 p-1',
    xl: 'w-14 h-14 p-1.5',
  };

  const glowClass = withGlow
    ? 'drop-shadow-[0_0_12px_rgba(139,92,246,0.5)]'
    : '';

  const bgClass = withBackground
    ? 'bg-background-card/90 border border-border/80 rounded-lg shadow-sm'
    : 'bg-transparent';

  return (
    <div
      className={`inline-flex items-center justify-center flex-shrink-0 ${bgClass} ${containerSizes[size]} ${glowClass} ${className} transition-all`}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          {/* Upper Loop Gradient: Cosmic Violet & Neon Purple (NOVA Primary) */}
          <linearGradient id="nlOrbitUpperGrad" x1="15%" y1="0%" x2="95%" y2="100%">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="30%" stopColor="#7C3AED" />
            <stop offset="65%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#C084FC" />
          </linearGradient>

          {/* Lower Loop Gradient: Deep Cobalt to Electric Cyan (NOVA Accent) */}
          <linearGradient id="nlOrbitLowerGrad" x1="5%" y1="100%" x2="95%" y2="0%">
            <stop offset="0%" stopColor="#1D4ED8" />
            <stop offset="35%" stopColor="#2563EB" />
            <stop offset="70%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>

          {/* Upper Core Radial Glow (Cosmic Violet Orb) */}
          <radialGradient id="nlCoreUpperGrad" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#FAF5FF" />
            <stop offset="30%" stopColor="#C084FC" />
            <stop offset="70%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#581C87" />
          </radialGradient>

          {/* Lower Core Radial Glow (Quantum Cyan Orb) */}
          <radialGradient id="nlCoreLowerGrad" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#F0FDFF" />
            <stop offset="30%" stopColor="#67E8F9" />
            <stop offset="70%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#1E3A8A" />
          </radialGradient>

          <filter id="nlDropShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#000000" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Lower Orbital Loop (Cyan) */}
        <path
          d="M 67.5 59
             A 26 26 0 1 1 39 36.5
             L 40.5 48.5
             A 14 14 0 1 0 55.5 60.5
             Z"
          fill="url(#nlOrbitLowerGrad)"
          filter="url(#nlDropShadow)"
        />

        {/* Upper Orbital Loop (Violet) */}
        <path
          d="M 32.5 41
             A 26 26 0 1 1 61 63.5
             L 59.5 51.5
             A 14 14 0 1 0 44.5 39.5
             Z"
          fill="url(#nlOrbitUpperGrad)"
          filter="url(#nlDropShadow)"
        />

        {/* Lower Core Planetary Sphere */}
        <circle cx="42" cy="62" r="9.5" fill="url(#nlCoreLowerGrad)" />
        <circle cx="39.5" cy="59.5" r="3.5" fill="#FFFFFF" opacity="0.8" />

        {/* Upper Core Planetary Sphere */}
        <circle cx="58" cy="38" r="9.5" fill="url(#nlCoreUpperGrad)" />
        <circle cx="55.5" cy="35.5" r="3.5" fill="#FFFFFF" opacity="0.85" />
      </svg>
    </div>
  );
};
