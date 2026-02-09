interface ProBadgeProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'badge' | 'tag' | 'inline';
}

export function ProBadge({ size = 'medium', variant = 'badge' }: ProBadgeProps) {
  if (variant === 'inline') {
    return (
      <span className="inline-flex items-center gap-1 text-[#ac6d46] font-bold text-xs">
        PRO
      </span>
    );
  }

  if (variant === 'tag') {
    return (
      <div className={`inline-flex items-center rounded-full bg-[#ac6d46] text-white ${
        size === 'small' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      } font-bold`}>
        PRO
      </div>
    );
  }

  // Badge variant (default)
  return (
    <div className={`inline-flex items-center bg-[#ac6d46] text-white ${
      size === 'small' ? 'px-2 py-1 text-xs' :
      size === 'large' ? 'px-4 py-2 text-base' :
      'px-3 py-1 text-sm'
    } font-bold border-2 border-[#ac6d46]`}>
      EXPLORER PRO
    </div>
  );
}