import Link from 'next/link';
import Image from 'next/image';

export function Footer() {
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
              <li><Link href="/explorer-guidelines" className="text-[#b5bcc4] hover:text-[#ac6d46]">Explorer Guidelines</Link></li>
              <li><Link href="/sponsorship-guide" className="text-[#b5bcc4] hover:text-[#ac6d46]">Expedition Sponsorship Guide</Link></li>
              <li><Link href="/legal/terms" className="text-[#b5bcc4] hover:text-[#ac6d46]">Terms of Service</Link></li>
              <li><Link href="/legal/privacy" className="text-[#b5bcc4] hover:text-[#ac6d46]">Privacy Policy</Link></li>
              <li><Link href="/contact" className="text-[#b5bcc4] hover:text-[#4676ac]">Contact & Report an Issue</Link></li>
            </ul>
          </div>

          {/* Platform Info */}
          <div>
            <h4 className="text-sm font-bold mb-3 border-b border-[#616161] pb-2">
              PLATFORM INFORMATION
            </h4>
            <ul className="text-xs space-y-2 text-[#b5bcc4] font-mono">
              <li>Platform Version: 2.4.1</li>
              <li>Status: All systems operational</li>
              <li>Active Explorers: 12,847</li>
              <li>Total Expeditions: 3,421</li>
              <li>Total Entries: 89,234</li>
              <li>Avg Page Load: 1.2s</li>
            </ul>
          </div>

          {/* Technical */}
          <div>
            <h4 className="text-sm font-bold mb-3 border-b border-[#616161] pb-2">
              TECHNICAL SPECIFICATIONS
            </h4>
            <ul className="text-xs space-y-2 text-[#b5bcc4] font-mono">
              <li>Security: SSL/TLS (A+ Rating)</li>
              <li>Media Storage: Encrypted CDN</li>
              <li>Stripe Integration: Active</li>
              <li>Backup: Hourly incremental</li>
              <li>GDPR Compliant: Yes</li>
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