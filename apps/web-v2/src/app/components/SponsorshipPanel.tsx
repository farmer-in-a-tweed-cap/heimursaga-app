import { SponsorshipCard } from "@/app/components/SponsorshipCard";

export function SponsorshipPanel() {
  const expeditions = [
    {
      expeditionId: 'lang-doc-2025',
      title: 'Documenting Endangered Languages',
      explorer: 'Dr. Maria S.',
      journal: 'Linguistic Frontiers',
      category: 'Research',
      fundingGoal: 45000,
      fundingCurrent: 38240,
      fundingPercentage: 85.0,
      sponsors: 892,
      daysLeft: 12,
      daysActive: 124,
      entriesCount: 47,
      status: 'active' as const,
    },
    {
      expeditionId: 'route66-2025',
      title: 'Historic Route 66 Photo Book',
      explorer: 'Jake M.',
      journal: 'American Roads',
      category: 'Photography',
      fundingGoal: 15000,
      fundingCurrent: 8930,
      fundingPercentage: 59.5,
      sponsors: 234,
      daysLeft: 28,
      daysActive: 41,
      entriesCount: 28,
      status: 'active' as const,
    },
    {
      expeditionId: 'arctic-doc-2025',
      title: 'Arctic Wildlife Documentation',
      explorer: 'Dr. Helena K.',
      journal: 'Polar Observations',
      category: 'Research',
      fundingGoal: 62000,
      fundingCurrent: 44850,
      fundingPercentage: 72.3,
      sponsors: 1043,
      daysLeft: 45,
      daysActive: 67,
      entriesCount: 38,
      status: 'active' as const,
    },
  ];

  return (
    <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6 mb-6">
      <div className="flex items-center justify-between mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
        <h3 className="text-sm font-bold dark:text-[#e5e5e5]">ACTIVE EXPEDITION SPONSORSHIPS</h3>
        <span className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">134 TOTAL</span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {expeditions.map((expedition) => (
          <SponsorshipCard
            key={expedition.expeditionId}
            {...expedition}
            onViewExpedition={() => {}}
            onSponsor={() => {}}
          />
        ))}
      </div>

      {/* Create Expedition CTA */}
      <div className="mt-6 p-4 border-2 border-[#ac6d46] bg-[#f5f5f5] dark:bg-[#2a2a2a]">
        <div className="text-sm font-bold mb-2 dark:text-[#e5e5e5]">START YOUR OWN EXPEDITION</div>
        <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-3 leading-relaxed">
          Launch a new expedition within your journal and enable sponsorships. 
          Platform fee: 5% • Payment processing: 2.9% + $0.30 per transaction
        </p>
        <button className="w-full py-2 bg-[#ac6d46] text-white text-sm font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46]">
          CREATE EXPEDITION (REQUIRES LOGIN)
        </button>
      </div>
    </div>
  );
}