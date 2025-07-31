import { ShieldCheckIcon } from '@repo/ui/icons';

type Props = {
  variant?: 'badge' | 'text' | 'minimal';
  className?: string;
};

export const StripeSecurityBadge: React.FC<Props> = ({ 
  variant = 'badge',
  className = '' 
}) => {
  if (variant === 'minimal') {
    return (
      <div className={`flex items-center gap-2 text-xs text-gray-500 ${className}`}>
        <ShieldCheckIcon size={14} />
        <span>Secured by Stripe</span>
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div className={`flex items-center justify-center gap-2 text-sm text-gray-600 ${className}`}>
        <ShieldCheckIcon size={16} className="text-green-600" />
        <div className="text-center">
          <div className="font-medium">Payments secured by Stripe</div>
          <div className="text-xs text-gray-500">Your payment information is encrypted and secure</div>
        </div>
      </div>
    );
  }

  // Default 'badge' variant
  return (
    <div className={`flex items-center justify-center gap-3 p-3 bg-gray-50 rounded-lg border ${className}`}>
      <ShieldCheckIcon size={20} className="text-green-600" />
      <div className="text-center">
        <div className="text-sm font-medium text-gray-900">Powered by Stripe</div>
        <div className="text-xs text-gray-500">PCI DSS compliant • SSL encrypted</div>
      </div>
    </div>
  );
};