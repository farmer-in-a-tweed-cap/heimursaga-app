import { ExpeditionCard } from '@/app/components/ExpeditionCard';
import { EntryCard } from '@/app/components/EntryCard';
import { ExplorerCard } from '@/app/components/ExplorerCard';
import { ExplorerCardPortrait } from '@/app/components/ExplorerCardPortrait';
import { ExplorerCardLandscape } from '@/app/components/ExplorerCardLandscape';
import { ExpeditionCardPortrait } from '@/app/components/ExpeditionCardPortrait';
import { ExpeditionCardLandscape } from '@/app/components/ExpeditionCardLandscape';
import { EntryCardPortrait } from '@/app/components/EntryCardPortrait';
import { EntryCardLandscape } from '@/app/components/EntryCardLandscape';
import { WaypointCardLandscape } from '@/app/components/WaypointCardLandscape';
import { NotificationCard } from '@/app/components/NotificationCard';
import { NotificationCardCompact } from '@/app/components/NotificationCardCompact';
import { NotificationDropdownDemo } from '@/app/components/NotificationDropdownDemo';

/**
 * CardShowcase - A demo component showing how to use the reusable 
 * ExpeditionCard, EntryCard, and ExplorerCard components throughout the app
 */
export function CardShowcase() {
  return (
    <div className="p-8 bg-[#f5f5f5] dark:bg-[#2a2a2a] min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 border-l-4 border-[#ac6d46] pl-4">
          <h1 className="text-2xl font-bold text-[#202020] dark:text-[#e5e5e5] mb-2">
            CARD COMPONENTS SHOWCASE
          </h1>
          <p className="text-sm text-[#616161] dark:text-[#b5bcc4] font-mono">
            Reusable card components with consistent 2-button architecture for displaying expedition, entry, and explorer previews
          </p>
        </div>

        {/* Expedition Cards Section */}
        <div className="mb-12">
          <h2 className="text-lg font-bold text-[#202020] dark:text-[#e5e5e5] mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
            EXPEDITION CARDS
          </h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-6">
            <ExpeditionCard
              id="exp-1"
              title="Cycling the Silk Road"
              explorer="Sarah C."
              description="A six-month cycling expedition documenting the historic Silk Road trade routes through Central Asia, exploring ancient cities, mountain passes, and cultural heritage sites."
              imageUrl="https://images.unsplash.com/photo-1662454456011-24874d23c389?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzaWxrJTIwcm9hZCUyMGN5Y2xpbmclMjBhZHZlbnR1cmV8ZW58MXx8fHwxNzY4MzE0MTU4fDA&ixlib=rb-4.1.0&q=80&w=1080"
              location="Central Asia Region"
              coordinates="~39.6°N, ~67.0°E"
              startDate="Jan 15, 2025"
              endDate={null}
              daysElapsed={147}
              daysRemaining={null}
              journalEntries={89}
              lastUpdate="4 hours ago"
              fundingGoal={45000}
              fundingCurrent={38750}
              fundingPercentage={86.1}
              backers={127}
              distance={8420}
              status="active"
              terrain="Mountain Passes"
              averageSpeed={57.3}
              onViewJournal={() => {}}
              onSupport={() => {}}
            />

            <ExpeditionCard
              id="exp-2"
              title="Antarctic Research"
              explorer="Marcus O."
              description="Conducting climate research and wildlife population studies at the McMurdo Dry Valleys, collecting ice core samples and documenting penguin colonies."
              imageUrl="https://images.unsplash.com/photo-1562743227-dbfb8875c61b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbnRhcmN0aWNhJTIwcmVzZWFyY2glMjBzdGF0aW9ufGVufDF8fHx8MTc2ODMxNDE1OHww&ixlib=rb-4.1.0&q=80&w=1080"
              location="Antarctic Region"
              coordinates="~77.9°S, ~166.7°E"
              startDate="Nov 1, 2024"
              endDate="Feb 28, 2025"
              daysElapsed={56}
              daysRemaining={64}
              journalEntries={42}
              lastUpdate="8 hours ago"
              fundingGoal={85000}
              fundingCurrent={71200}
              fundingPercentage={83.8}
              backers={243}
              distance={2140}
              status="active"
              terrain="Polar Ice"
              averageSpeed={38.2}
              onViewJournal={() => {}}
              onSupport={() => {}}
            />

            <ExpeditionCard
              id="exp-3"
              title="Amazon River Traverse"
              explorer="Elena R."
              description="Successfully completed journey documenting indigenous communities and biodiversity along the Amazon River, collecting water samples and recording oral histories."
              imageUrl="https://images.unsplash.com/photo-1564750576234-75de3cc54053?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbWF6b24lMjByaXZlciUyMGp1bmdsZXxlbnwxfHx8fDE3NjgzMTQxNTh8MA&ixlib=rb-4.1.0&q=80&w=1080"
              location="Northern Brazil"
              coordinates="~3.1°S, ~60.0°W"
              startDate="Nov 20, 2024"
              endDate="Dec 24, 2024"
              daysElapsed={34}
              daysRemaining={0}
              journalEntries={28}
              lastUpdate="12 hours ago"
              fundingGoal={38000}
              fundingCurrent={38000}
              fundingPercentage={100.0}
              backers={156}
              distance={3890}
              status="completed"
              terrain="Rainforest"
              averageSpeed={114.4}
              onViewJournal={() => {}}
              onSupport={() => {}}
            />
          </div>
        </div>

        {/* Entry Cards Section */}
        <div>
          <h2 className="text-lg font-bold text-[#202020] dark:text-[#e5e5e5] mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
            ENTRY CARDS
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <EntryCard
              id="entry-1"
              title="Summit Day on Kilimanjaro"
              explorerUsername="alex_mountain"
              expeditionName="Climbing Kilimanjaro 2025"
              location="Mount Kilimanjaro, Tanzania"
              date="Jan 12, 2025"
              excerpt="After 6 days of climbing, we finally reached Uhuru Peak at 5,895m. The sunrise from the summit was absolutely breathtaking, with clouds rolling beneath us like an ocean. Every step was worth it."
              mediaCount={28}
              views={1547}
              wordCount={2341}
              type="Summit Reflection"
              onReadEntry={() => {}}
              onViewExpedition={() => {}}
              onBookmark={() => {}}
            />

            <EntryCard
              id="entry-2"
              title="Crossing the Atlantic Storm"
              explorerUsername="jordan_rows"
              expeditionName="Solo Atlantic Rowing"
              location="Mid-Atlantic Ocean"
              date="Dec 3, 2024"
              excerpt="Day 47 brought the most intense storm I've faced. 6-meter waves crashed over the boat continuously. I couldn't sleep for 36 hours straight, but I kept rowing. This is what I trained for."
              mediaCount={12}
              views={3421}
              wordCount={1876}
              type="Weather Update"
              onReadEntry={() => {}}
              onViewExpedition={() => {}}
              onBookmark={() => {}}
            />

            <EntryCard
              id="entry-3"
              title="Ice Cave Exploration"
              explorerUsername="nina_arctic"
              expeditionName="Arctic Research 2025"
              location="Svalbard, Norway"
              date="Jan 8, 2025"
              excerpt="Discovered a previously unmapped ice cave system today. The blue ice formations are unlike anything I've documented before. Our team spent 4 hours inside collecting samples and taking measurements."
              mediaCount={45}
              views={892}
              wordCount={1456}
              type="Discovery Log"
              onReadEntry={() => {}}
              onViewExpedition={() => {}}
              onBookmark={() => {}}
            />
          </div>
        </div>

        {/* Explorer Cards Section */}
        <div className="mt-12">
          <h2 className="text-lg font-bold text-[#202020] dark:text-[#e5e5e5] mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
            EXPLORER CARDS
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ExplorerCard
              id="explorer-1"
              username="Sarah C."
              journalName="Wandering Chronicles"
              imageUrl="https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMHdvbWFuJTIwb3V0ZG9vcnN8ZW58MXx8fHwxNzY4MzE0MTU4fDA&ixlib=rb-4.1.0&q=80&w=1080"
              location="Central Asia Region"
              accountType="explorer-pro"
              joined="Mar 2024"
              activeExpeditions={2}
              totalEntries={234}
              totalSponsored={47820}
              followers={1247}
              totalViews={289340}
              tagline="Documentary photographer exploring traditional cultures along historic trade routes"
              onViewProfile={() => {}}
              onViewJournal={() => {}}
            />

            <ExplorerCard
              id="explorer-2"
              username="Marcus O."
              journalName="Field Notes from the Edge"
              imageUrl="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMG1hbiUyMG91dGRvb3JzfGVufDF8fHx8MTc2ODMxNDE1OHww&ixlib=rb-4.1.0&q=80&w=1080"
              location="Antarctic Region"
              accountType="explorer-pro"
              joined="Jan 2023"
              activeExpeditions={1}
              totalEntries={156}
              totalSponsored={89450}
              followers={2341}
              totalViews={512890}
              tagline="Climate researcher studying ice core samples and environmental change in polar regions"
              onViewProfile={() => {}}
              onViewJournal={() => {}}
            />

            <ExplorerCard
              id="explorer-3"
              username="Elena R."
              journalName="Amazon Diaries"
              imageUrl="https://images.unsplash.com/photo-1494790108377-be9c29b29330?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMHdvbWFuJTIwc21pbGluZ3xlbnwxfHx8fDE3NjgzMTQxNTh8MA&ixlib=rb-4.1.0&q=80&w=1080"
              location="Northern Brazil"
              accountType="explorer"
              joined="Sep 2024"
              activeExpeditions={1}
              totalEntries={67}
              totalSponsored={0}
              followers={423}
              totalViews={98234}
              tagline="Biologist and conservation advocate documenting biodiversity in tropical rainforest ecosystems"
              onViewProfile={() => {}}
              onViewJournal={() => {}}
            />
          </div>
        </div>

        {/* Usage Info */}
        <div className="mt-12 border-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020] p-6">
          <h3 className="text-base font-bold text-[#202020] dark:text-[#e5e5e5] mb-3">
            USAGE INSTRUCTIONS
          </h3>
          <div className="space-y-4 text-sm text-[#616161] dark:text-[#b5bcc4] font-mono">
            <div>
              <strong className="text-[#ac6d46]">Import:</strong>
              <pre className="mt-1 bg-[#f5f5f5] dark:bg-[#2a2a2a] p-2 border-l-2 border-[#ac6d46]">
{`import { ExpeditionCard } from '@/app/components/ExpeditionCard';
import { EntryCard } from '@/app/components/EntryCard';
import { ExplorerCard } from '@/app/components/ExplorerCard';
import { ExplorerCardPortrait } from '@/app/components/ExplorerCardPortrait';
import { ExplorerCardLandscape } from '@/app/components/ExplorerCardLandscape';
import { ExpeditionCardPortrait } from '@/app/components/ExpeditionCardPortrait';
import { ExpeditionCardLandscape } from '@/app/components/ExpeditionCardLandscape';
import { EntryCardPortrait } from '@/app/components/EntryCardPortrait';
import { EntryCardLandscape } from '@/app/components/EntryCardLandscape';
import { WaypointCardLandscape } from '@/app/components/WaypointCardLandscape';
import { NotificationCard } from '@/app/components/NotificationCard';
import { NotificationCardCompact } from '@/app/components/NotificationCardCompact';
import { NotificationDropdownDemo } from '@/app/components/NotificationDropdownDemo';`}
              </pre>
            </div>
            <div>
              <strong className="text-[#4676ac]">Design Principles:</strong>
              <ul className="mt-1 ml-4 list-disc space-y-1">
                <li>Vertical portrait structure for better mobile + desktop display</li>
                <li>Well-defined sections with clear 2px borders</li>
                <li>Alternating background colors for visual hierarchy</li>
                <li>Consistent padding and spacing throughout</li>
                <li>Clean, uncluttered information display</li>
                <li><strong className="text-[#ac6d46]">Visual Distinction:</strong> ExpeditionCards have hero images, EntryCards are text-focused</li>
              </ul>
            </div>
            <div>
              <strong className="text-[#ac6d46]">Features:</strong>
              <ul className="mt-1 ml-4 list-disc space-y-1">
                <li>Full dark mode support</li>
                <li>Responsive image handling with ImageWithFallback</li>
                <li>Progress bars for funding status</li>
                <li>Complete expedition and entry metrics</li>
                <li>Custom callback handlers for actions</li>
                <li>Status indicators and type badges</li>
              </ul>
            </div>
            <div>
              <strong className="text-[#4676ac]">Card Variants:</strong>
              <ul className="mt-1 ml-4 list-disc space-y-1">
                <li><strong>Full Cards:</strong> ExpeditionCard, EntryCard, ExplorerCard - Detailed cards with full information and action buttons</li>
                <li><strong>Portrait Cards:</strong> Simplified vertical cards for grid layouts (ExplorerCardPortrait, ExpeditionCardPortrait, EntryCardPortrait)</li>
                <li><strong>Landscape Cards:</strong> Simplified horizontal cards for list layouts (ExplorerCardLandscape, ExpeditionCardLandscape, EntryCardLandscape)</li>
                <li>Simplified cards are click-to-navigate without action buttons, perfect for bookmarks and search results</li>
              </ul>
            </div>
            <div>
              <strong className="text-[#ac6d46]">Consistent Button Architecture (Full Cards):</strong>
              <ul className="mt-1 ml-4 list-disc space-y-1">
                <li><strong>ExpeditionCard:</strong> 2-button layout → EXPEDITION JOURNAL (left, neutral) | SPONSOR (right, copper)</li>
                <li><strong>EntryCard:</strong> 2-button layout → READ (left, neutral) | EXPEDITION (right, blue)</li>
                <li><strong>ExplorerCard:</strong> 2-button layout → PROFILE (left, neutral) | JOURNAL (right, copper)</li>
                <li>All cards use identical grid-cols-2 layout with consistent spacing and hover effects</li>
                <li>Left button: neutral colors, right button: accent color (copper or blue)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Simplified Portrait Cards Section */}
        <div className="mt-12">
          <h2 className="text-lg font-bold text-[#202020] dark:text-[#e5e5e5] mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
            SIMPLIFIED PORTRAIT CARDS
          </h2>
          <p className="text-sm text-[#616161] dark:text-[#b5bcc4] font-mono mb-6">
            Compact vertical cards for grid layouts - perfect for bookmarks, search results, and browse pages
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ExplorerCardPortrait
              id="explorer-portrait-1"
              username="sarah_wanderer"
              journalName="Wandering Chronicles"
              avatarUrl="https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMHdvbWFuJTIwb3V0ZG9vcnN8ZW58MXx8fHwxNzY4MzE0MTU4fDA&ixlib=rb-4.1.0&q=80&w=1080"
              location="Central Asia"
              accountType="explorer-pro"
              activeExpeditions={2}
              totalEntries={234}
              totalViews={289340}
              onClick={() => {}}
            />
            <ExpeditionCardPortrait
              id="expedition-portrait-1"
              title="Cycling the Silk Road"
              explorerUsername="sarah_wanderer"
              imageUrl="https://images.unsplash.com/photo-1662454456011-24874d23c389?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzaWxrJTIwcm9hZCUyMGN5Y2xpbmclMjBhZHZlbnR1cmV8ZW58MXx8fHwxNzY4MzE0MTU4fDA&ixlib=rb-4.1.0&q=80&w=1080"
              location="Central Asia"
              status="active"
              daysElapsed={147}
              journalEntries={89}
              fundingPercentage={86}
              backers={127}
              onClick={() => {}}
            />
            <EntryCardPortrait
              id="entry-portrait-1"
              title="Summit Day on Kilimanjaro"
              explorerUsername="alex_mountain"
              expeditionName="Climbing Kilimanjaro 2025"
              location="Mount Kilimanjaro, Tanzania"
              date="Jan 12, 2025"
              excerpt="After 6 days of climbing, we finally reached Uhuru Peak at 5,895m. The sunrise from the summit was absolutely breathtaking, with clouds rolling beneath us like an ocean."
              views={1547}
              wordCount={2341}
              mediaCount={28}
              type="Summit Reflection"
              onClick={() => {}}
            />
            <ExplorerCardPortrait
              id="explorer-portrait-2"
              username="marcus_explorer"
              journalName="Field Notes from the Edge"
              avatarUrl="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMG1hbiUyMG91dGRvb3JzfGVufDF8fHx8MTc2ODMxNDE1OHww&ixlib=rb-4.1.0&q=80&w=1080"
              location="Antarctic Region"
              accountType="explorer-pro"
              activeExpeditions={1}
              totalEntries={156}
              totalViews={512890}
              onClick={() => {}}
            />
          </div>
        </div>

        {/* Simplified Landscape Cards Section */}
        <div className="mt-12">
          <h2 className="text-lg font-bold text-[#202020] dark:text-[#e5e5e5] mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
            SIMPLIFIED LANDSCAPE CARDS
          </h2>
          <p className="text-sm text-[#616161] dark:text-[#b5bcc4] font-mono mb-6">
            Compact horizontal cards for list layouts - excellent for recent activity feeds and vertical lists
          </p>
          <div className="space-y-4 max-w-4xl">
            <ExplorerCardLandscape
              id="explorer-landscape-1"
              username="sarah_wanderer"
              journalName="Wandering Chronicles"
              avatarUrl="https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMHdvbWFuJTIwb3V0ZG9vcnN8ZW58MXx8fHwxNzY4MzE0MTU4fDA&ixlib=rb-4.1.0&q=80&w=1080"
              location="Central Asia"
              accountType="explorer-pro"
              activeExpeditions={2}
              totalEntries={234}
              totalViews={289340}
              onClick={() => {}}
            />
            <ExpeditionCardLandscape
              id="expedition-landscape-1"
              title="Cycling the Silk Road"
              explorerUsername="sarah_wanderer"
              imageUrl="https://images.unsplash.com/photo-1662454456011-24874d23c389?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzaWxrJTIwcm9hZCUyMGN5Y2xpbmclMjBhZHZlbnR1cmV8ZW58MXx8fHwxNzY4MzE0MTU4fDA&ixlib=rb-4.1.0&q=80&w=1080"
              location="Central Asia"
              status="active"
              daysElapsed={147}
              journalEntries={89}
              fundingPercentage={86}
              backers={127}
              onClick={() => {}}
            />
            <EntryCardLandscape
              id="entry-landscape-1"
              title="Summit Day on Kilimanjaro"
              explorerUsername="alex_mountain"
              expeditionName="Climbing Kilimanjaro 2025"
              location="Mount Kilimanjaro, Tanzania"
              date="Jan 12, 2025"
              excerpt="After 6 days of climbing, we finally reached Uhuru Peak at 5,895m. The sunrise from the summit was absolutely breathtaking, with clouds rolling beneath us like an ocean."
              type="Summit Reflection"
              onClick={() => {}}
            />
            <ExplorerCardLandscape
              id="explorer-landscape-2"
              username="elena_rainforest"
              journalName="Amazon Diaries"
              avatarUrl="https://images.unsplash.com/photo-1494790108377-be9c29b29330?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMHdvbWFuJTIwc21pbGluZ3xlbnwxfHx8fDE3NjgzMTQxNTh8MA&ixlib=rb-4.1.0&q=80&w=1080"
              location="Northern Brazil"
              accountType="explorer"
              activeExpeditions={1}
              totalEntries={67}
              totalViews={98234}
              onClick={() => {}}
            />
          </div>
        </div>

        {/* Entry Types Section */}
        <div className="mt-12">
          <h2 className="text-lg font-bold text-[#202020] dark:text-[#e5e5e5] mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
            ENTRY TYPES
          </h2>
          <p className="text-sm text-[#616161] dark:text-[#b5bcc4] font-mono mb-6">
            Four distinct entry types with different display formats and data requirements
          </p>
          
          <div className="space-y-6">
            {/* Standard Entry */}
            <div className="border-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020] p-4">
              <h3 className="text-sm font-bold mb-2 text-[#202020] dark:text-[#e5e5e5]">Standard</h3>
              <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-3">
                Traditional journal format with text, photos, and rich media. Best for daily updates and storytelling.
              </p>
              <EntryCardLandscape
                id="standard-entry"
                title="Summit Day on Mount Everest"
                explorerUsername="alex_mountain"
                expeditionName="Climbing Everest 2025"
                location="Mount Everest, Nepal"
                date="Jan 20, 2025"
                excerpt="After weeks of acclimatization and preparation, we made our summit push from Camp IV. The final ridge was brutal - every step took three breaths. But at 5:47 AM, we stood on top of the world."
                type="Standard"
                onClick={() => {}}
              />
            </div>

            {/* Photo Essay */}
            <div className="border-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020] p-4">
              <h3 className="text-sm font-bold mb-2 text-[#202020] dark:text-[#e5e5e5] flex items-center gap-2">
                Photo Essay
                <span className="text-xs text-[#ac6d46] px-2 py-0.5 bg-[#ac6d46]/10 rounded-full">EXPLORER PRO</span>
              </h3>
              <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-3">
                Image-focused format with captions. Ideal for visual storytelling and location documentation.
              </p>
              <EntryCardLandscape
                id="photo-essay-entry"
                title="Colors of the Silk Road Bazaar"
                explorerUsername="sarah_wanderer"
                expeditionName="Cycling the Silk Road"
                location="Samarkand, Uzbekistan"
                date="Jan 18, 2025"
                excerpt="24 images capturing the vibrant textiles, spices, and craftwork of Central Asia's most historic market. Each photograph tells a story of tradition, trade, and timeless beauty."
                type="Photo Essay"
                onClick={() => {}}
              />
            </div>

            {/* Data Log */}
            <div className="border-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020] p-4">
              <h3 className="text-sm font-bold mb-2 text-[#202020] dark:text-[#e5e5e5] flex items-center gap-2">
                Data Log
                <span className="text-xs text-[#ac6d46] px-2 py-0.5 bg-[#ac6d46]/10 rounded-full">EXPLORER PRO</span>
              </h3>
              <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-3">
                Structured format for scientific observations, measurements, and environmental data collection.
              </p>
              <EntryCardLandscape
                id="data-log-entry"
                title="Ice Core Sample Analysis - Day 34"
                explorerUsername="marcus_explorer"
                expeditionName="Antarctic Research"
                location="McMurdo Dry Valleys, Antarctica"
                date="Jan 15, 2025"
                excerpt="Collected 12 ice core samples from depths of 50-150m. Air bubble analysis shows CO2 concentrations of 285ppm at 100m depth. Temperature readings: -28°C surface, -18°C at 50m."
                type="Data Log"
                onClick={() => {}}
              />
            </div>

            {/* Waypoint */}
            <div className="border-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020] p-4">
              <h3 className="text-sm font-bold mb-2 text-[#202020] dark:text-[#e5e5e5] flex items-center gap-2">
                Waypoint
                <span className="text-xs text-[#ac6d46] px-2 py-0.5 bg-[#ac6d46]/10 rounded-full">EXPLORER PRO</span>
              </h3>
              <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-3">
                Simplified location marker for tracking progress and documenting geographic milestones without full narrative.
              </p>
              <WaypointCardLandscape
                id="waypoint-entry"
                title="Border Crossing: Turkmenistan → Uzbekistan"
                explorerUsername="sarah_wanderer"
                expeditionName="Cycling the Silk Road"
                location="Farap Border Station"
                date="Jan 14, 2025"
                latitude={39.1234}
                longitude={64.5678}
                elevation={245}
                views={723}
                onClick={() => {}}
              />
            </div>
          </div>
        </div>

        {/* Notification Cards Section */}
        <div className="mt-12">
          <h2 className="text-lg font-bold text-[#202020] dark:text-[#e5e5e5] mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
            NOTIFICATION CARDS
          </h2>
          <p className="text-sm text-[#616161] dark:text-[#b5bcc4] font-mono mb-6">
            System notifications with type-specific icons, colors, and read/unread states
          </p>
          
          <div className="space-y-4 max-w-2xl">
            {/* New Follower - Unread (Simple, no metadata needed) */}
            <NotificationCard
              id="notif-1"
              type="follow"
              title="mountain_explorer_93 followed your journal"
              message=""
              actor="mountain_explorer_93"
              timestamp="2 hours ago"
              isRead={false}
              actions={{
                primary: {
                  label: "VIEW JOURNAL",
                  onClick: () => {}
                }
              }}
              onClick={() => {}}
            />

            {/* New Sponsorship - Unread */}
            <NotificationCard
              id="notif-2"
              type="sponsorship"
              title="adventure_seeker_42 sponsored $250"
              message=""
              actor="adventure_seeker_42"
              timestamp="12 min ago"
              isRead={false}
              metadata={{
                amount: 25000
              }}
              actions={{
                primary: {
                  label: "VIEW JOURNAL",
                  onClick: () => {}
                }
              }}
              onClick={() => {}}
            />

            {/* New Note - Unread */}
            <NotificationCard
              id="notif-3"
              type="comment"
              title={'seasoned_traveler left a note on "Ice Cave Exploration"'}
              message={'"I explored a similar cave system in Vatnajökull back in 2019. The formations you documented are incredibly rare."'}
              actor="seasoned_traveler"
              timestamp="3 days ago"
              isRead={false}
              actions={{
                primary: {
                  label: "VIEW ENTRY",
                  onClick: () => {}
                },
                secondary: {
                  label: "VIEW JOURNAL",
                  onClick: () => {}
                }
              }}
              onClick={() => {}}
            />

            {/* Entry Milestone - Read */}
            <NotificationCard
              id="notif-4"
              type="entry_milestone"
              title="Summit Day reached 1,000 views"
              message=""
              timestamp="5 hours ago"
              isRead={true}
              metadata={{
                viewCount: 1042,
                commentCount: 34
              }}
              actions={{
                primary: {
                  label: "VIEW ENTRY",
                  onClick: () => {}
                }
              }}
              onClick={() => {}}
            />

            {/* Sponsorship Milestone - Read */}
            <NotificationCard
              id="notif-5"
              type="sponsorship_milestone"
              title="Antarctic Research reached 75% funding"
              message=""
              timestamp="1 day ago"
              isRead={true}
              metadata={{
                amount: 6375000
              }}
              actions={{
                primary: {
                  label: "VIEW EXPEDITION",
                  onClick: () => {}
                }
              }}
              onClick={() => {}}
            />

            {/* Expedition Completed - Read (No metadata needed) */}
            <NotificationCard
              id="notif-6"
              type="expedition_completed"
              title="Amazon River Traverse completed"
              message=""
              timestamp="1 week ago"
              isRead={true}
              actions={{
                primary: {
                  label: "VIEW EXPEDITION",
                  onClick: () => {}
                }
              }}
              onClick={() => {}}
            />

            {/* Passport - Country Visited */}
            <NotificationCard
              id="notif-7"
              type="passport_country"
              title="Visited Iceland"
              message=""
              timestamp="4 days ago"
              isRead={false}
              actions={{
                primary: {
                  label: "VIEW PASSPORT",
                  onClick: () => {}
                }
              }}
              onClick={() => {}}
            />

            {/* Passport - Stamp Earned */}
            <NotificationCard
              id="notif-8"
              type="passport_stamp"
              title={'Earned "World Traveler" stamp'}
              message=""
              timestamp="1 week ago"
              isRead={true}
              actions={{
                primary: {
                  label: "VIEW PASSPORT",
                  onClick: () => {}
                }
              }}
              onClick={() => {}}
            />
          </div>
        </div>

        {/* Notification Preview Cards Section */}
        <div className="mt-12">
          <h2 className="text-lg font-bold text-[#202020] dark:text-[#e5e5e5] mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
            NOTIFICATION PREVIEW CARDS
          </h2>
          <p className="text-sm text-[#616161] dark:text-[#b5bcc4] font-mono mb-6">
            Compact notification cards for dropdown previews - designed for header notification menus
          </p>
          
          {/* Preview Dropdown Simulation */}
          <div className="max-w-md">
            <div className="border-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020]">
              {/* Dropdown Header */}
              <div className="border-b-2 border-[#202020] dark:border-[#616161] bg-[#b5bcc4] dark:bg-[#3a3a3a] px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#202020] dark:text-[#e5e5e5]">
                    NOTIFICATIONS
                  </span>
                  <span className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
                    3 unread
                  </span>
                </div>
              </div>

              {/* Notification List */}
              <div className="max-h-[400px] overflow-y-auto">
                <NotificationCardCompact
                  id="compact-1"
                  type="sponsorship"
                  title="adventure_seeker_42 sponsored $250"
                  message=""
                  timestamp="12m"
                  isRead={false}
                  onClick={() => {}}
                />

                <NotificationCardCompact
                  id="compact-2"
                  type="follow"
                  title="mountain_explorer_93 followed your journal"
                  message=""
                  timestamp="2h"
                  isRead={false}
                  onClick={() => {}}
                />

                <NotificationCardCompact
                  id="compact-3"
                  type="comment"
                  title={'seasoned_traveler left a note on "Ice Cave Exploration"'}
                  message={'"Similar formations in Vatnajökull! Consider submitting to International Glaciological Society."'}
                  timestamp="3d"
                  isRead={false}
                  onClick={() => {}}
                />

                <NotificationCardCompact
                  id="compact-4"
                  type="entry_milestone"
                  title="Entry Reached 1,000 Views"
                  message="Summit Day on Mount Everest surpassed 1,000 views. Trending in Mountain Expeditions with 34 comments, 127 bookmarks."
                  timestamp="5h"
                  isRead={true}
                  onClick={() => {}}
                />

                <NotificationCardCompact
                  id="compact-5"
                  type="sponsorship_milestone"
                  title="Expedition 75% Funded"
                  message="Antarctic Research reached $63,750/$85,000 (75%). 243 sponsors, averaging $262.35 each. $4,200 in last 7 days."
                  timestamp="1d"
                  isRead={true}
                  onClick={() => {}}
                />

                <NotificationCardCompact
                  id="compact-6"
                  type="expedition_completed"
                  title="Expedition Completed"
                  message="Amazon River Traverse complete! 28 entries, 34 days, 3,890km, 156 sponsors, $38,000 raised, 45,234 views."
                  timestamp="1w"
                  isRead={true}
                  onClick={() => {}}
                />

                <NotificationCardCompact
                  id="compact-7"
                  type="expedition_started"
                  title="Expedition Started"
                  message="Cycling the Silk Road began Jan 15. Now public and accepting sponsors. Post first entry within 48h for 3.2x engagement."
                  timestamp="2w"
                  isRead={true}
                  onClick={() => {}}
                />
              </div>

              {/* Dropdown Footer */}
              <div className="border-t-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020] px-3 py-2">
                <button className="w-full text-xs font-bold text-[#4676ac] hover:text-[#ac6d46] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] text-center">
                  VIEW ALL NOTIFICATIONS
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Dropdown Demo Section */}
        <div className="mt-12">
          <h2 className="text-lg font-bold text-[#202020] dark:text-[#e5e5e5] mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
            NOTIFICATION DROPDOWN DEMO
          </h2>
          <p className="text-sm text-[#616161] dark:text-[#b5bcc4] font-mono mb-6">
            Interactive notification dropdown menu for header integration
          </p>
          
          <div className="max-w-md">
            <NotificationDropdownDemo />
          </div>
        </div>
      </div>
    </div>
  );
}