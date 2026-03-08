'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { explorerApi, expeditionApi, entryApi } from '@/app/services/api';

interface PlatformStats {
  explorers: number | null;
  expeditions: number | null;
  activeExpeditions: number | null;
  entries: number | null;
  countries: number | null;
}

export function Footer() {
  const [stats, setStats] = useState<PlatformStats>({
    explorers: null,
    expeditions: null,
    activeExpeditions: null,
    entries: null,
    countries: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      try {
        const [explorersRes, expeditionsRes, entriesRes] = await Promise.all([
          explorerApi.getAll().catch(() => null),
          expeditionApi.getAll().catch(() => null),
          entryApi.getAll().catch(() => null),
        ]);

        if (!cancelled) {
          const activeCount = expeditionsRes?.data?.filter(
            (e) => e.status === 'active'
          ).length ?? null;

          const countryCodes = new Set(
            (entriesRes?.data || [])
              .map((e) => e.countryCode)
              .filter(Boolean)
          );

          setStats({
            explorers: explorersRes?.results ?? null,
            expeditions: expeditionsRes?.results ?? null,
            activeExpeditions: activeCount,
            entries: entriesRes?.results ?? null,
            countries: countryCodes.size > 0 ? countryCodes.size : null,
          });
        }
      } catch {
        // Silently fail — footer stats are non-critical
      }
    }

    fetchStats();
    return () => { cancelled = true; };
  }, []);

  const formatStat = (value: number | null) =>
    value !== null ? value.toLocaleString() : '—';

  return (
    <footer className="bg-[#202020] text-white border-t-2 border-[#ac6d46] mt-12">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Resources & Support Combined */}
          <div>
            <h4 className="text-sm font-bold mb-3 border-b border-[#616161] pb-2">
              RESOURCES & SUPPORT
            </h4>
            <ul className="text-xs space-y-2">
              <li><Link href="/about" className="text-[#b5bcc4] hover:text-[#ac6d46]">About Heimursaga</Link></li>
              <li><Link href="/documentation" className="text-[#b5bcc4] hover:text-[#ac6d46]">Platform Documentation</Link></li>

              <li><Link href="/sponsorship-guide" className="text-[#b5bcc4] hover:text-[#ac6d46]">Expedition Sponsorship Guide</Link></li>
              <li><Link href="/legal/terms" className="text-[#b5bcc4] hover:text-[#ac6d46]">Terms of Service</Link></li>
              <li><Link href="/legal/privacy" className="text-[#b5bcc4] hover:text-[#ac6d46]">Privacy Policy</Link></li>
              <li><Link href="/contact" className="text-[#b5bcc4] hover:text-[#4676ac]">Contact & Support</Link></li>
            </ul>
          </div>

          {/* Platform Info */}
          <div>
            <h4 className="text-sm font-bold mb-3 border-b border-[#616161] pb-2">
              PLATFORM INFORMATION
            </h4>
            <ul className="text-xs space-y-2 text-[#b5bcc4] font-mono">
              <li>Platform Version: 3.0.0</li>
              <li>Registered Explorers: {formatStat(stats.explorers)}</li>
              <li>Total Expeditions: {formatStat(stats.expeditions)}</li>
              <li>Active Expeditions: {formatStat(stats.activeExpeditions)}</li>
              <li>Journal Entries: {formatStat(stats.entries)}</li>
              {stats.countries !== null && stats.countries > 0 && (
                <li>Countries Reached: {formatStat(stats.countries)}</li>
              )}
            </ul>
          </div>

          {/* Technical */}
          <div>
            <h4 className="text-sm font-bold mb-3 border-b border-[#616161] pb-2">
              TECHNICAL SPECIFICATIONS
            </h4>
            <ul className="text-xs space-y-2 text-[#b5bcc4] font-mono">
              <li>Payments: Stripe Connect</li>
              <li>Mapping: Mapbox GL</li>
              <li>Media: Encrypted Cloud Storage</li>
              <li>Security: TLS + Multi-Layer Protection</li>
              <li>Privacy: GDPR Compliant</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[#616161] pt-6">
          <div className="flex flex-col items-center gap-4">
            <Image
              src="/logo-lg-light.svg"
              alt="Heimursaga"
              className="h-8 w-auto"
              width={200}
              height={32}
            />
            <div className="text-xs text-[#b5bcc4] font-mono">
              © 2026 Heimursaga · All Rights Reserved · Engineered in Maine by <a href="https://theperipetycompany.com/" target="_blank" rel="noopener noreferrer" className="text-[#b5bcc4] hover:text-[#ac6d46] transition-all focus-visible:outline-none focus-visible:text-[#ac6d46]">The Peripety Company</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
