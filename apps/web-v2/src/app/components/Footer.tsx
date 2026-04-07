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
            <h4 className="text-sm font-bold tracking-[0.14em] mb-3 border-b border-[#616161] pb-2">
              RESOURCES & SUPPORT
            </h4>
            <ul className="text-xs space-y-2">
              <li><Link href="/about" className="text-[#b5bcc4] hover:text-[#ac6d46]">About Heimursaga</Link></li>
              <li><Link href="/documentation" className="text-[#b5bcc4] hover:text-[#ac6d46]">Platform Documentation</Link></li>

              <li><Link href="/sponsorship-guide" className="text-[#b5bcc4] hover:text-[#ac6d46]">Sponsorship Guide</Link></li>
              <li><Link href="/guide-program" className="text-[#b5bcc4] hover:text-[#ac6d46]">Expedition Guide Program</Link></li>
              <li><Link href="/legal/terms" target="_blank" className="text-[#b5bcc4] hover:text-[#ac6d46]">Terms of Service</Link></li>
              <li><Link href="/legal/privacy" target="_blank" className="text-[#b5bcc4] hover:text-[#ac6d46]">Privacy Policy</Link></li>
              <li><Link href="/contact" className="text-[#b5bcc4] hover:text-[#4676ac]">Contact & Support</Link></li>
            </ul>
          </div>

          {/* Platform Info */}
          <div>
            <h4 className="text-sm font-bold tracking-[0.14em] mb-3 border-b border-[#616161] pb-2">
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
            <h4 className="text-sm font-bold tracking-[0.14em] mb-3 border-b border-[#616161] pb-2">
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
            <div className="flex items-center gap-4 mb-3">
              <a href="https://youtube.com/@heimursaga" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="text-[#b5bcc4] hover:text-[#ac6d46] transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </a>
              <a href="https://instagram.com/heimursaga" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-[#b5bcc4] hover:text-[#ac6d46] transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
              <a href="https://x.com/heimursaga" target="_blank" rel="noopener noreferrer" aria-label="Twitter / X" className="text-[#b5bcc4] hover:text-[#ac6d46] transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
            </div>
            <div className="text-xs text-[#b5bcc4] font-mono">
              © 2026 Heimursaga · All Rights Reserved · Engineered in Maine by <a href="https://theperipetycompany.com/" target="_blank" rel="noopener noreferrer" className="text-[#b5bcc4] hover:text-[#ac6d46] transition-all focus-visible:outline-none focus-visible:text-[#ac6d46]">The Peripety Company</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
