import * as flags from 'country-flag-icons/react/3x2';

const flagComponents = flags as Record<string, any>;

interface CountryFlagProps {
  code: string;
  className?: string;
  title?: string;
}

export function CountryFlag({ code, className = '', title }: CountryFlagProps) {
  const FlagComponent = flagComponents[code.toUpperCase()];

  if (!FlagComponent) {
    // Fallback: show country code in a box
    return (
      <span
        className={`inline-flex items-center justify-center bg-[#616161] text-white text-xs font-bold ${className}`}
        title={title}
        style={{ aspectRatio: '3/2' }}
      >
        {code}
      </span>
    );
  }

  return <FlagComponent className={className} title={title} />;
}
