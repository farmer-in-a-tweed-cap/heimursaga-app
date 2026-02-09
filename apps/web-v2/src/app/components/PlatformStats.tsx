interface PlatformStatsProps {
  explorerCount: number;
  expeditionCount: number;
  entryCount: number;
}

export function PlatformStats({ explorerCount, expeditionCount, entryCount }: PlatformStatsProps) {
  const stats = [
    {
      label: 'EXPLORERS',
      value: explorerCount.toLocaleString(),
      detail: 'Registered explorers'
    },
    {
      label: 'EXPEDITIONS',
      value: expeditionCount.toLocaleString(),
      detail: 'Published expeditions'
    },
    {
      label: 'JOURNAL ENTRIES',
      value: entryCount.toLocaleString(),
      detail: 'Published entries'
    },
    {
      label: 'PLATFORM STATUS',
      value: '100%',
      detail: 'All systems operational'
    },
  ];

  return (
    <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
      <div className="flex items-center justify-between mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
        <h3 className="text-sm font-bold dark:text-[#e5e5e5]">PLATFORM STATISTICS</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="border-2 border-[#b5bcc4] dark:border-[#3a3a3a] p-4 hover:border-[#ac6d46] dark:hover:border-[#ac6d46] transition-all"
          >
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-1 font-mono">{stat.label}</div>
            <div className="text-2xl font-bold text-[#202020] dark:text-[#e5e5e5] mb-1">{stat.value}</div>
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] border-t border-[#b5bcc4] dark:border-[#3a3a3a] pt-2">
              {stat.detail}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
