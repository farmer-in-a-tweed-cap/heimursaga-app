'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DollarSign } from 'lucide-react';

export function SponsorshipsPage() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/explorers') return pathname.startsWith('/explorer');
    if (path === '/expeditions') return pathname.startsWith('/expedition');
    if (path === '/entries') return pathname.startsWith('/entries') || pathname.startsWith('/entry');
    if (path === '/sponsorships') return pathname.startsWith('/sponsorship');
    return pathname === path;
  };

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8">
      {/* Page Header */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        {/* Submenu Banner */}
        <div className="bg-[#616161] px-6 py-3 flex items-center gap-3 border-b-2 border-[#202020] dark:border-[#4a4a4a]">
          <span className="text-xs text-[#e5e5e5] font-bold">DISCOVER:</span>
          <Link
            href="/explorers"
            className={`px-4 py-2 text-xs font-bold transition-all ${
              isActive('/explorers')
                ? 'bg-[#4676ac] text-white'
                : 'bg-[#2a2a2a] text-white hover:bg-[#ac6d46]'
            }`}
          >
            EXPLORERS
          </Link>
          <Link
            href="/expeditions"
            className={`px-4 py-2 text-xs font-bold transition-all ${
              isActive('/expeditions')
                ? 'bg-[#4676ac] text-white'
                : 'bg-[#2a2a2a] text-white hover:bg-[#ac6d46]'
            }`}
          >
            EXPEDITIONS
          </Link>
          <Link
            href="/entries"
            className={`px-4 py-2 text-xs font-bold transition-all ${
              isActive('/entries')
                ? 'bg-[#4676ac] text-white'
                : 'bg-[#2a2a2a] text-white hover:bg-[#ac6d46]'
            }`}
          >
            ENTRIES
          </Link>
          <Link
            href="/sponsorships"
            className={`px-4 py-2 text-xs font-bold transition-all ${
              isActive('/sponsorships')
                ? 'bg-[#4676ac] text-white'
                : 'bg-[#2a2a2a] text-white hover:bg-[#ac6d46]'
            }`}
          >
            SPONSORSHIPS
          </Link>
        </div>

        {/* Header Content */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
            <div className="flex items-center gap-3">
              <DollarSign className="w-6 h-6 text-[#ac6d46]" />
              <h1 className="text-2xl font-bold dark:text-[#e5e5e5]">EXPEDITION SPONSORSHIPS</h1>
            </div>
            <span className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">134 ACTIVE CAMPAIGNS</span>
          </div>
          
          <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] p-4 border-l-2 border-[#ac6d46]">
            <h3 className="text-sm font-bold mb-2 dark:text-[#e5e5e5]">HOW EXPEDITION SPONSORSHIP WORKS:</h3>
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-2 leading-relaxed">
              <p>• Explorers create expeditions within their journals and set sponsorship goals</p>
              <p>• Sponsors contribute any amount to support expedition costs (equipment, travel, research)</p>
              <p>• Platform fee: 5% • Payment processing: 2.9% + $0.30 per transaction</p>
              <p>• Sponsors receive updates and exclusive content from sponsored expeditions</p>
              <p>• All financial transactions are transparent and tracked in real-time</p>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-[#202020] border-2 border-[#b5bcc4] dark:border-[#3a3a3a] p-4">
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-1">TOTAL SPONSORED</div>
          <div className="text-2xl font-bold text-[#ac6d46]">$3,847,293</div>
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">+$42,381 today</div>
        </div>
        <div className="bg-white dark:bg-[#202020] border-2 border-[#b5bcc4] dark:border-[#3a3a3a] p-4">
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-1">ACTIVE SPONSORS</div>
          <div className="text-2xl font-bold dark:text-[#e5e5e5]">12,847</div>
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">+234 this week</div>
        </div>
        <div className="bg-white dark:bg-[#202020] border-2 border-[#b5bcc4] dark:border-[#3a3a3a] p-4">
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-1">AVG CONTRIBUTION</div>
          <div className="text-2xl font-bold dark:text-[#e5e5e5]">$299</div>
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">Median: $75</div>
        </div>
        <div className="bg-white dark:bg-[#202020] border-2 border-[#b5bcc4] dark:border-[#3a3a3a] p-4">
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-1">SUCCESS RATE</div>
          <div className="text-2xl font-bold dark:text-[#e5e5e5]">73%</div>
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">Expeditions fully funded</div>
        </div>
      </div>

      {/* Content placeholder */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#b5bcc4] dark:border-[#3a3a3a] p-8 text-center">
        <h3 className="text-lg font-bold mb-4 dark:text-[#e5e5e5]">SPONSORSHIP DIRECTORY</h3>
        <p className="text-sm text-[#616161] dark:text-[#b5bcc4] mb-6">
          Detailed sponsorship listings, filtering options, and sponsor profiles will appear here.
        </p>
        <button className="px-6 py-3 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all">
          BECOME A SPONSOR
        </button>
      </div>
    </div>
  );
}