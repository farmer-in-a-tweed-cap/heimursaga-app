import { Compass, Calendar, Coffee, EyeOff } from 'lucide-react';

export type ExplorerStatus = 'EXPLORING' | 'EXPLORING_OFF_GRID' | 'PLANNING' | 'RESTING';

interface ExplorerStatusBadgeProps {
  status: ExplorerStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  currentExpeditionTitle?: string;
  daysActive?: number;
}

export function ExplorerStatusBadge({ 
  status, 
  size = 'md', 
  showIcon = true,
  currentExpeditionTitle,
  daysActive 
}: ExplorerStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'EXPLORING':
        return {
          label: 'EXPLORING',
          color: 'bg-[#ac6d46]',
          textColor: 'text-white',
          icon: Compass,
          description: currentExpeditionTitle ? `Currently on: ${currentExpeditionTitle}` : 'Active expedition',
        };
      case 'EXPLORING_OFF_GRID':
        return {
          label: 'EXPLORING \u2022 OFF-GRID',
          color: 'bg-[#6b5c4e]',
          textColor: 'text-white',
          icon: EyeOff,
          description: 'Currently on an off-grid expedition',
        };
      case 'PLANNING':
        return {
          label: 'PLANNING',
          color: 'bg-[#4676ac]',
          textColor: 'text-white',
          icon: Calendar,
          description: currentExpeditionTitle ? `Planning: ${currentExpeditionTitle}` : 'Planning next expedition',
        };
      case 'RESTING':
        return {
          label: 'RESTING',
          color: 'bg-[#616161]',
          textColor: 'text-white',
          icon: Coffee,
          description: 'No active or planned expeditions',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: {
      container: 'px-2 py-1 text-xs',
      icon: 'h-3 w-3',
    },
    md: {
      container: 'px-3 py-1.5 text-xs',
      icon: 'h-4 w-4',
    },
    lg: {
      container: 'px-4 py-2 text-sm',
      icon: 'h-5 w-5',
    },
  };

  return (
    <div className="inline-flex flex-col gap-1">
      <div className={`${config.color} ${config.textColor} font-bold font-mono inline-flex items-center gap-1.5 ${sizeClasses[size].container}`}>
        {showIcon && <Icon className={sizeClasses[size].icon} />}
        <span>{config.label}</span>
        {status === 'EXPLORING' && daysActive && (
          <span className="ml-1 opacity-90">• DAY {daysActive}</span>
        )}
      </div>
    </div>
  );
}

// Helper function to determine explorer status from expeditions
export function getExplorerStatus(expeditions: Array<{ status: string }>, activeExpeditionOffGrid?: boolean): ExplorerStatus {
  const hasActive = expeditions.some(e => e.status === 'active');
  const hasPlanned = expeditions.some(e => e.status === 'planned');

  if (hasActive && activeExpeditionOffGrid) return 'EXPLORING_OFF_GRID';
  if (hasActive) return 'EXPLORING';
  if (hasPlanned) return 'PLANNING';
  return 'RESTING';
}

// Helper function to get current expedition info
export function getCurrentExpeditionInfo(expeditions: Array<{ id: string; status: string; title: string; daysActive?: number }>) {
  const active = expeditions.find(e => e.status === 'active');
  if (active) return { id: active.id, title: active.title, daysActive: active.daysActive };

  const planned = expeditions.find(e => e.status === 'planned');
  if (planned) return { id: planned.id, title: planned.title, daysActive: undefined };

  return null;
}
