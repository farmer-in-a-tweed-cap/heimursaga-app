// Continent code to SVG file mapping
const continentFiles: Record<string, string> = {
  AF: '/assets/continents/Africa.svg',
  AN: '/assets/continents/Antarctica.svg',
  AS: '/assets/continents/Asia.svg',
  EU: '/assets/continents/Europe.svg',
  NA: '/assets/continents/North-America.svg',
  OC: '/assets/continents/Australia.svg',
  SA: '/assets/continents/South-America.svg',
};

const continentNames: Record<string, string> = {
  AF: 'Africa',
  AN: 'Antarctica',
  AS: 'Asia',
  EU: 'Europe',
  NA: 'North America',
  OC: 'Oceania',
  SA: 'South America',
};

interface ContinentIconProps {
  code: string;
  className?: string;
  title?: string;
}

export function ContinentIcon({ code, className = '', title }: ContinentIconProps) {
  const svgPath = continentFiles[code.toUpperCase()];
  const name = title || continentNames[code.toUpperCase()] || code;

  if (!svgPath) {
    // Fallback: show continent code in a circle
    return (
      <span
        className={`inline-flex items-center justify-center bg-[#4676ac] text-white text-xs font-bold rounded-full ${className}`}
        title={name}
      >
        {code}
      </span>
    );
  }

  return (
    <img
      src={svgPath}
      alt={name}
      title={name}
      className={className}
    />
  );
}
