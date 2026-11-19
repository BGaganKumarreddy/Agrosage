import React from 'react';

/**
 * MangoHeroIllustration
 *
 * High-fidelity vector recreation of the central agricultural fruit illustration
 * from the AgroSage reference design.
 *
 * Features:
 * - Floating levitation animation (gentle, organic vertical bobbing & micro-rotation)
 * - Dynamic ground shadow that expands/contracts with height
 * - Pulsing ambient radial glow matching the reference forest-green background
 * - Calibrated color palette and authentic asymmetric mango curvature
 */
export const MangoHeroIllustration = ({ className = 'w-24 h-24 sm:w-28 sm:h-28' }) => {
  return (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      {/* Ambient Lighting & Glow matching reference with gentle pulsing */}
      <div
        className="absolute inset-0 rounded-full blur-2xl pointer-events-none transform scale-125 animate-glow-pulse"
        style={{
          background:
            'radial-gradient(circle at 45% 45%, rgba(252, 235, 179, 0.4) 0%, rgba(245, 187, 79, 0.28) 35%, rgba(227, 132, 52, 0.18) 60%, rgba(16, 185, 129, 0.10) 80%, transparent 100%)',
        }}
        aria-hidden="true"
      />

      {/* Floating Mango Vector container */}
      <div className="relative w-full h-full animate-float flex items-center justify-center z-10">
        <svg
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_12px_24px_rgba(0,0,0,0.45)] hover:scale-105 transition-transform duration-300"
          aria-label="AgroSage Golden Mango Illustration"
          role="img"
        >
          <defs>
            {/* Main Fruit Body Gradient - Calibrated directly from reference screenshot pixels */}
            <radialGradient
              id="mangoBodyGrad"
              cx="40%"
              cy="36%"
              r="62%"
              fx="38%"
              fy="32%"
            >
              <stop offset="0%" stopColor="#FFFBEB" />        {/* Luminous highlight specular */}
              <stop offset="18%" stopColor="#FCEBB3" />       {/* Soft cream-golden */}
              <stop offset="42%" stopColor="#F5BB4F" />       {/* Golden Alphonso mango */}
              <stop offset="72%" stopColor="#E38434" />       {/* Warm ripe amber-orange */}
              <stop offset="92%" stopColor="#D2652A" />       {/* Deep apricot warmth */}
              <stop offset="100%" stopColor="#BC5021" />      {/* Soft warm shadow edge */}
            </radialGradient>

            {/* Leaf Gradient: Forest green to fresh emerald */}
            <linearGradient id="mangoLeafGrad" x1="0%" y1="0%" x2="100%" y2="80%">
              <stop offset="0%" stopColor="#538C61" />
              <stop offset="60%" stopColor="#296235" />
              <stop offset="100%" stopColor="#1B4323" />
            </linearGradient>

            {/* Stem Gradient */}
            <linearGradient id="mangoStemGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4A7C59" />
              <stop offset="100%" stopColor="#296235" />
            </linearGradient>

            {/* Soft Surface Sheen on Upper-Left */}
            <radialGradient id="mangoSheen" cx="38%" cy="34%" r="35%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
              <stop offset="55%" stopColor="#FEF3C7" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Stem - subtle natural twig at top */}
          <path
            d="M58 20 C57 15, 55 12, 54 8 C55 8, 57 10, 59 16 C60 18, 59 20, 58 20 Z"
            fill="url(#mangoStemGrad)"
          />

          {/* Green Leaf - extending gracefully to top-right matching reference */}
          <path
            d="M58 19
               C65 14, 78 8, 93 6
               C98 8, 94 15, 87 21
               C78 27, 67 24, 58 19 Z"
            fill="url(#mangoLeafGrad)"
          />
          {/* Leaf subtle spine */}
          <path
            d="M60 19 Q75 14, 91 8"
            stroke="#74B886"
            strokeWidth="0.75"
            strokeLinecap="round"
            opacity="0.65"
          />

          {/* Mango Body - Organic Asymmetric Silhouette matching reference contour */}
          <path
            d="M59 21
               C78 22, 90 35, 89 53
               C88 68, 85 79, 76 86
               C67 93, 54 100, 43 100
               C33 100, 18 94, 19 82
               C20 68, 24 55, 25 48
               C27 35, 38 23, 59 21 Z"
            fill="url(#mangoBodyGrad)"
          />

          {/* Upper-Left Luminous Sheen Highlight */}
          <ellipse
            cx="42"
            cy="38"
            rx="18"
            ry="14"
            transform="rotate(-15 42 38)"
            fill="url(#mangoSheen)"
          />

          {/* Bottom subtle ambient shadow for 3D realism */}
          <path
            d="M32 96 C39 99, 49 99, 56 94 C48 98, 38 98, 32 96 Z"
            fill="#8C3512"
            opacity="0.25"
          />
        </svg>
      </div>

      {/* Dynamic floating ground shadow beneath the fruit */}
      <div
        className="w-12 h-2.5 rounded-full blur-[4px] bg-black/45 pointer-events-none -mt-1 animate-float-shadow z-0"
        aria-hidden="true"
      />
    </div>
  );
};
