interface CoverPhotoFallbackProps {
  className?: string;
}

export function CoverPhotoFallback({ className = '' }: CoverPhotoFallbackProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Topo pattern layer */}
      <div className="absolute inset-0 topo-bg opacity-40" />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-[#202020]/60" />
    </div>
  );
}
