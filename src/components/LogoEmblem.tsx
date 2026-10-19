import React from 'react';

interface LogoEmblemProps {
  className?: string;
  size?: number | string;
}

export const LogoEmblem: React.FC<LogoEmblemProps> = ({ className = 'w-9 h-9', size }) => {
  return (
    <svg
      viewBox="0 0 200 230"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      aria-label="Shop Emblem Logo"
    >
      {/* Outer Hexagonal Frame */}
      <polygon
        points="100,6 186,55 186,155 100,204 14,155 14,55"
        fill="#143d66"
        stroke="#143d66"
        strokeWidth="4"
        strokeLinejoin="round"
      />

      {/* Inner White Gap */}
      <polygon
        points="100,16 176,60 176,150 100,194 24,150 24,60"
        fill="#ffffff"
      />

      {/* Hexagonal Blue Core */}
      <polygon
        points="100,24 170,64 170,146 100,186 30,146 30,64"
        fill="#143d66"
      />

      {/* White Background Field */}
      <polygon
        points="100,32 162,68 162,142 100,178 38,142 38,68"
        fill="#ffffff"
      />

      {/* Stylized Monogram Graphic */}
      <g fill="#143d66">
        {/* Left 'A' Body */}
        <path d="M 44,72 L 95,72 L 95,168 L 78,168 L 78,135 L 70,135 L 70,168 L 44,168 Z" />
        
        {/* Right 'K' Body */}
        <path d="M 103,72 L 122,72 L 122,108 L 146,72 L 160,72 L 132,114 L 161,168 L 146,168 L 122,122 L 122,168 L 103,168 Z" />
      </g>

      {/* White Cutout in A */}
      <path d="M 60,88 L 82,88 L 82,108 L 60,108 Z" fill="#ffffff" />
      
      {/* White Claw Hammer Silhouette forming A's crossbar */}
      <path
        d="M 46,113 C 51,107 58,107 63,111 L 89,111 L 89,121 L 63,121 C 58,125 51,125 46,119 Z"
        fill="#ffffff"
      />
    </svg>
  );
};
