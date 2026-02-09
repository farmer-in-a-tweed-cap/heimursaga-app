import { FileText, Target, Map, DollarSign } from "lucide-react";

export function ExplorerActivity() {
  const activities = [
    {
      type: 'journal_entry',
      explorer: 'Sarah C.',
      action: 'published entry to expedition',
      title: 'Cycling the Silk Road: Day 147',
      journal: 'Wandering Chronicles',
      time: '14 minutes ago',
    },
    {
      type: 'milestone',
      explorer: 'Ocean Warriors',
      action: 'expedition reached sponsorship goal',
      title: 'Pacific Cleanup: $31,240 sponsored',
      journal: 'Ocean Conservation Log',
      time: '1 hour ago',
    },
    {
      type: 'expedition',
      explorer: 'Alex R.',
      action: 'started new expedition',
      title: 'Traditional Weaving Techniques',
      journal: 'Textile Journeys',
      time: '2 hours ago',
    },
    {
      type: 'journal_entry',
      explorer: 'Marcus O.',
      action: 'uploaded media to expedition entry',
      title: 'Antarctic Research: Week 8',
      journal: 'Field Notes from the Edge',
      time: '3 hours ago',
    },
    {
      type: 'support',
      explorer: 'Anonymous Sponsor',
      action: 'sponsored $250 to expedition',
      title: 'Endangered Languages Documentation',
      journal: 'Linguistic Frontiers',
      time: '4 hours ago',
    },
    {
      type: 'journal_entry',
      explorer: 'Yuki T.',
      action: 'published entry to expedition',
      title: 'Traditional Crafts: Day 89',
      journal: 'Artisan Pathways',
      time: '5 hours ago',
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'journal_entry': return FileText;
      case 'milestone': return Target;
      case 'expedition': return Map;
      case 'support': return DollarSign;
      default: return FileText;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'journal_entry': return 'border-[#ac6d46]';
      case 'milestone': return 'border-[#ac6d46]';
      case 'expedition': return 'border-[#ac6d46]';
      case 'support': return 'border-[#4676ac]';
      default: return 'border-[#616161]';
    }
  };

  return (
    <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
      <div className="flex items-center justify-between mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
        <h3 className="text-sm font-bold dark:text-[#e5e5e5]">REAL-TIME PLATFORM ACTIVITY</h3>
        <span className="text-xs text-[#ac6d46] font-mono">● LIVE</span>
      </div>

      <div className="space-y-3">
        {activities.map((activity, idx) => {
          const Icon = getActivityIcon(activity.type);
          return (
            <div 
              key={idx}
              className={`border-l-4 ${getActivityColor(activity.type)} bg-[#f5f5f5] dark:bg-[#2a2a2a] p-3`}
            >
              <div className="flex items-start gap-2">
                <Icon className="h-4 w-4 mt-0.5 flex-shrink-0 text-[#616161] dark:text-[#b5bcc4]" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs leading-relaxed">
                    <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">{activity.explorer}</span>
                    {' '}
                    <span className="text-[#616161] dark:text-[#b5bcc4]">{activity.action}</span>
                    {' '}
                    <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">{activity.title}</span>
                  </div>
                  <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono mt-1">
                    Journal: {activity.journal}
                  </div>
                  <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono mt-1">
                    {activity.time}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Activity Stream Info */}
      <div className="mt-4 p-3 bg-[#f5f5f5] dark:bg-[#2a2a2a] border border-[#b5bcc4] dark:border-[#3a3a3a] text-xs">
        <div className="font-bold mb-1 dark:text-[#e5e5e5]">ACTIVITY STREAM DETAILS:</div>
        <div className="text-[#616161] dark:text-[#b5bcc4] space-y-1">
          <div>• Updates every 15 seconds</div>
          <div>• Showing last 6 events</div>
          <div>• 247 events in last 24 hours</div>
          <div>• Filter options available after login</div>
        </div>
      </div>
    </div>
  );
}