interface CoverPhotoFallbackProps {
  className?: string;
}

export function CoverPhotoFallback({ className = '' }: CoverPhotoFallbackProps) {
  return (
    <div className={`relative bg-[#2a2a2a] ${className}`}>
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern id="topo" patternUnits="userSpaceOnUse" width="400" height="400">
            <path d="M20 80 Q80 20 160 60 T320 40 T400 80" fill="none" stroke="#616161" strokeWidth="1" opacity="0.4" />
            <path d="M0 120 Q60 60 140 100 T300 80 T400 120" fill="none" stroke="#4676ac" strokeWidth="0.8" opacity="0.3" />
            <path d="M10 170 Q90 110 180 150 T340 130 T400 170" fill="none" stroke="#616161" strokeWidth="1" opacity="0.35" />
            <path d="M0 220 Q70 160 160 200 T320 180 T400 220" fill="none" stroke="#4676ac" strokeWidth="0.8" opacity="0.25" />
            <path d="M20 270 Q100 210 190 250 T350 230 T400 270" fill="none" stroke="#616161" strokeWidth="1" opacity="0.3" />
            <path d="M0 320 Q80 260 170 300 T330 280 T400 320" fill="none" stroke="#4676ac" strokeWidth="0.8" opacity="0.2" />
            <path d="M10 370 Q90 310 180 350 T340 330 T400 370" fill="none" stroke="#616161" strokeWidth="1" opacity="0.25" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#topo)" />
      </svg>
    </div>
  );
}
