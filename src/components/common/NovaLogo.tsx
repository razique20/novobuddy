import React from 'react';

interface NovaLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  withGlow?: boolean;
}

export const NovaLogo: React.FC<NovaLogoProps> = ({
  size = 'md',
  className = '',
  withGlow = false,
}) => {
  const containerSizes = {
    xs: 'w-4 h-4 rounded-[4px] p-0.5',
    sm: 'w-5 h-5 rounded-md p-1',
    md: 'w-8 h-8 rounded-lg p-1.5',
    lg: 'w-10 h-10 rounded-xl p-2',
    xl: 'w-14 h-14 rounded-2xl p-3',
  };

  const glowClass = withGlow
    ? 'shadow-[0_0_16px_rgba(139,92,246,0.25)]'
    : 'shadow-sm';

  return (
    <div
      className={`inline-flex items-center justify-center flex-shrink-0 bg-background-card border border-border/80 ${containerSizes[size]} ${glowClass} ${className} transition-all`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="novaGradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
        </defs>

        {/* Minimalist 4-pointed Nova Star (Astroid Curve) */}
        <path
          d="M 12 2 C 12 7.523 7.523 12 2 12 C 7.523 12 12 16.477 12 22 C 12 16.477 16.477 12 22 12 C 16.477 12 12 7.523 12 2 Z"
          fill="url(#novaGradient)"
        />

        {/* Central Core */}
        <circle cx="12" cy="12" r="2" fill="#FFFFFF" opacity="0.95" />
      </svg>
    </div>
  );
};
