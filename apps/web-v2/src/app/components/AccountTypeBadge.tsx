interface AccountTypeBadgeProps {
  accountType: 'explorer' | 'explorer-pro' | 'expedition-guide' | 'sponsor';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AccountTypeBadge({
  accountType,
  size = 'md',
  className = ''
}: AccountTypeBadgeProps) {

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  if (accountType === 'expedition-guide') {
    return (
      <span
        className={`inline-flex items-center rounded-full bg-[#598636] text-white font-bold ${sizeClasses[size]} border border-[#598636] ${className}`}
        title="Expedition Guide - Verified guide with premium features"
      >
        EXPEDITION GUIDE
      </span>
    );
  }

  // Only show badge for Explorer Pro accounts
  if (accountType !== 'explorer-pro') {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center rounded-full bg-[#ac6d46] text-white font-bold ${sizeClasses[size]} border border-[#ac6d46] ${className}`}
      title="Explorer Pro - Premium account with sponsorship receiving capabilities"
    >
      EXPLORER PRO
    </span>
  );
}