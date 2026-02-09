export function PlatformStats() {
  const stats = [
    { 
      label: 'EXPLORERS', 
      value: '2,847', 
      change: '+124 this week',
      detail: 'Active registered explorers'
    },
    { 
      label: 'ACTIVE EXPEDITIONS', 
      value: '1,293', 
      change: '+47 this week',
      detail: '18,492 total entries this month'
    },
    { 
      label: 'EXPEDITION SPONSORSHIPS', 
      value: '$3,847,293', 
      change: '+$42,381 today',
      detail: 'Avg per expedition: $28,710'
    },
    { 
      label: 'COUNTRIES DOCUMENTED', 
      value: '167', 
      change: '+3 this month',
      detail: '1,204 cities documented'
    },
    { 
      label: 'PLATFORM OPERATIONS', 
      value: '100%', 
      change: 'All systems operational',
      detail: 'Last incident: 14 days ago'
    },
  ];

  const lastUpdated = new Date();

  return (
    <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
      <div className="flex items-center justify-between mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
        <h3 className="text-sm font-bold dark:text-[#e5e5e5]">PLATFORM STATISTICS & SYSTEM STATUS</h3>
        <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
          Last Updated: {lastUpdated.toLocaleTimeString()}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {stats.map((stat, idx) => (
          <div 
            key={idx} 
            className="border-2 border-[#b5bcc4] dark:border-[#3a3a3a] p-4 hover:border-[#ac6d46] dark:hover:border-[#ac6d46] transition-all"
          >
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-1 font-mono">{stat.label}</div>
            <div className="text-2xl font-bold text-[#202020] dark:text-[#e5e5e5] mb-1">{stat.value}</div>
            <div className="text-xs text-[#ac6d46] mb-2">{stat.change}</div>
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] border-t border-[#b5bcc4] dark:border-[#3a3a3a] pt-2">
              {stat.detail}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}