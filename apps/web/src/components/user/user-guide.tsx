'use client';

import { Card, CardContent, CardHeader } from '@repo/ui/components';
import { 
  BookmarkSimpleIcon, 
  HighlighterCircle, 
  MapPinIcon, 
  Feather, 
  ShareFatIcon,
  GlobeX,
  BookBookmark,
  MagnifyingGlassIcon,
  UserIcon,
  GearIcon,
  PathIcon,
  HandCoinsIcon,
  ChatCircleTextIcon
} from '@repo/ui/icons';
import Link from 'next/link';

import { ROUTER } from '@/router';
import { useSession } from '@/hooks';

export const UserGuide = () => {
  const session = useSession();
  
  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Welcome to Heimursaga</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          The explorer's platform for sharing stories, raising money, and inspiring the world.
        </p>
      </div>

      {/* Getting Started */}
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Feather size={24} />
            Getting Started
          </h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!session?.logged && (
              <div>
                <h3 className="text-lg font-medium mb-2">1. Create Your Account</h3>
                <p className="text-gray-600 mb-2">
                  Sign up for a free Explorer account to start creating and sharing your travel experiences.
                </p>
                <Link href={ROUTER.SIGNUP} className="text-primary hover:underline">
                  Create Account →
                </Link>
              </div>
            )}
            {session?.logged && (
              <div>
                <h3 className="text-lg font-medium mb-2">1. Update Your Profile</h3>
                <p className="text-gray-600 mb-2">
                  Complete your profile with your bio, avatar, and location info.
                </p>
                <Link href={ROUTER.USER.SETTINGS.PROFILE} className="text-primary hover:underline">
                  Go to Settings →
                </Link>
              </div>
            )}
            <div>
              <h3 className="text-lg font-medium mb-2">{session?.logged ? '2' : '2'}. Create Your First Entry</h3>
              <p className="text-gray-600">
                Click the "Log Entry" or feather button to create your first entry. Add a location, photos, and share your experience.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2">{session?.logged ? '3' : '3'}. Upgrade to Explorer Pro</h3>
              <p className="text-gray-600">
                Unlock premium features including journey creation, multiple photos per entry, and sponsorship opportunities.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Creating Entries */}
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Feather size={24} />
            Creating Entries
          </h2>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-3">What are Entries?</h3>
              <p className="text-gray-600 mb-4">
                Entries are individual journal posts that capture a moment from your travels. Each entry includes:
              </p>
              <ul className="space-y-2 text-gray-600">
                <li>• A specific location on the map</li>
                <li>• Title and description</li>
                <li>• Photos (1 for Explorer, up to 3 for Explorer Pro)</li>
                <li>• Date</li>
                <li>• Privacy settings (public/private/sponsor only)</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-3">Creating an Entry</h3>
              <ol className="space-y-2 text-gray-600">
                <li>1. Click the "Log Entry" or feather button in the navigation</li>
                <li>2. Pin your location on the map</li>
                <li>3. Add a descriptive title</li>
                <li>4. Write about your experience</li>
                <li>5. Upload photos (optional)</li>
                <li>6. Set privacy and publish</li>
              </ol>
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg mt-6">
            <h3 className="text-lg font-medium mb-2 text-blue-900">Auto-Save & Drafts</h3>
            <p className="text-sm text-blue-800">
              Your entries are automatically saved as drafts while you write! 
              If you leave the page, you can return later and continue from where you left off. 
              Look for the auto-save indicator above the "Log Entry" button.
            </p>
          </div>
        </CardContent>
      </Card>


      {/* Exploring Content */}
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <GlobeX size={24} />
            Exploring Content
          </h2>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-3">Map View</h3>
              <p className="text-gray-600 mb-3">
                Explore entries and journeys visually on the interactive map.
              </p>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Click markers to view entries</li>
                <li>• Filter by context and type</li>
                <li>• Search for specific places</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-3">List View</h3>
              <p className="text-gray-600 mb-3">
                Browse entries in a traditional feed format.
              </p>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Scroll through recent entries</li>
                <li>• Highlight and bookmark content</li>
                <li>• Follow interesting explorers</li>
                <li>• Switch to "Following" feed to see only entries from explorers you follow</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-3">Search & Filter</h3>
              <p className="text-gray-600 mb-3">
                Find specific content and users.
              </p>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Search by location or keyword</li>
                <li>• Filter by entries or journeys</li>
                <li>• Discover new explorers</li>
              </ul>
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg mt-6">
            <h3 className="text-lg font-medium mb-2 text-green-900">Sponsor an Explorer!</h3>
            <p className="text-sm text-green-800">
              Found an explorer whose adventures inspire you? Consider sponsoring their journeys! 
              Sponsorships help passionate travelers share authentic experiences and create amazing content. 
              Look for the "Seeking Sponsors for" indicator on Explorer Pro journals and click the Sponsor button to support their next adventure.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Interacting with Content */}
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <HighlighterCircle size={24} />
            Interacting with Content
          </h2>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <HighlighterCircle size={32} className="mx-auto mb-2 text-primary" />
              <h3 className="text-lg font-medium mb-2">Highlight</h3>
              <p className="text-gray-600 text-sm">
                Show appreciation for entries you enjoy.
              </p>
            </div>
            <div className="text-center">
              <BookmarkSimpleIcon size={32} className="mx-auto mb-2 text-primary" />
              <h3 className="text-lg font-medium mb-2">Bookmark</h3>
              <p className="text-gray-600 text-sm">
                Save entries to view later in your bookmarks.
              </p>
            </div>
            <div className="text-center">
              <ShareFatIcon size={32} className="mx-auto mb-2 text-primary" />
              <h3 className="text-lg font-medium mb-2">Share</h3>
              <p className="text-gray-600 text-sm">
                Copy links to share interesting entries with friends.
              </p>
            </div>
          </div>
              <div className="bg-blue-50 p-4 rounded-lg mt-6">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Heimursaga uses "highlight" instead of "like" - these terms are equivalent. Highlighting an entry is the best way to show appreciation for an explorer's work, alongside following and providing sponsorship support.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Profile Management */}
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <BookBookmark size={24} />
            Managing Your Journal (Profile)
          </h2>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-3">Journal Features</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• View and edit all your entries and journeys</li>
                <li>• View followers and following</li>
                <li>• Edit journal/profile information</li>
                <li>• Set sponsorship info (Explorer Pro)</li>
                <li>• Set portfolio/social links (Explorer Pro)</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-3">Privacy Controls</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Make entries public or private</li>
                <li>• Manage visibility of your journeys</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Planning Journeys */}
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <PathIcon size={24} />
            Planning Journeys (Explorer Pro)
          </h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">What are Journeys?</h3>
              <p className="text-gray-600">
                Journeys allow Explorer Pro users to organize entries into connected travel stories. 
                Create planned routes, add waypoints, and tell cohesive stories about your adventures.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-3">Journey Features</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Connect multiple entries into one story</li>
                  <li>• Plan routes with waypoints</li>
                  <li>• Share complete travel experiences</li>
                  <li>• Track progress along your route</li>
                  <li>• Set privacy for entire journeys</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium mb-3">Creating a Journey</h3>
                <ol className="space-y-2 text-gray-600">
                  <li>1. Upgrade to Explorer Pro</li>
                  <li>2. Create a new journey from the Journeys page</li>
                  <li>3. Add waypoints to plan your route</li>
                  <li>4. Create entries at each location after you travel there</li>
                </ol>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-3">Waypoints vs Entries</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• <strong>Waypoints:</strong> Planned stops without content</li>
                  <li>• <strong>Entries:</strong> Actual experiences with photos and stories</li>
                  <li>• Convert waypoints to entries as you travel</li>
                  <li>• Gray markers show waypoints, copper markers show entries</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium mb-3">Journey Planning Tips</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Plan compelling journeys that your sponsors will want to support</li>
                  <li>• Research interesting stops along your route and use custom waypoint titles</li>
                  <li>• Add extra waypoints for flexibility</li>
                  <li>• Update your journey as plans change</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sponsorships */}
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <HandCoinsIcon size={24} />
            Sponsorships & Funding (Explorer Pro)
          </h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">What are Sponsorships?</h3>
              <p className="text-gray-600">
                Explorer Pro users can seek financial support from sponsors for their travel journeys. 
                This feature connects passionate travelers with brands and individuals who want to support authentic travel experiences.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-3">Setting Up Sponsorships</h3>
                <ol className="space-y-2 text-gray-600">
                  <li>1. Upgrade to Explorer Pro</li>
                  <li>2. Go to your journal settings</li>
                  <li>3. Update the "Seeking Sponsors for" option</li>
                  <li>4. Visit the Account tab on the Sponsorship page and update your Stripe profile</li>
                  <li>5. Set your monthly subscription Tier price and description</li>
                </ol>
              </div>
              <div>
                <h3 className="text-lg font-medium mb-3">Sponsorship Features</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Link sponsorships to specific journeys</li>
                  <li>• Display sponsor goals on profile</li>
                  <li>• Connect with potential sponsors</li>
                  <li>• Share exclusive entries with your sponsors</li>
                </ul>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-3">Best Practices for Sponsors</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Create detailed journey plans</li>
                  <li>• Be transparent about funding needs</li>
                  <li>• Provide regular updates to sponsors</li>
                  <li>• Share authentic experiences</li>
                  <li>• Acknowledge sponsor support</li>
                  <li>• Deliver on promised content</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium mb-3">Ideas for Sponsorship Needs</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Equipment and gear sponsorships</li>
                  <li>• Travel and accommodation funding</li>
                  <li>• Brand partnership opportunities</li>
                  <li>• Community-supported adventures</li>
                  <li>• Educational and research trips</li>
                </ul>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-2 text-blue-900">Sponsorship Guidelines</h3>
              <ul className="space-y-1 text-sm text-blue-800">
                <li>• Set up your Stripe account through the Account tab to receive payments</li>
                <li>• Be transparent about what your sponsors are supporting</li>
                <li>• Deliver on promised content for your sponsors</li>
                <li>• Maintain authenticity in your travel storytelling and experiences</li>
                <li>• Follow local laws and regulations for sponsored content and income reporting</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Private Messaging */}
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <ChatCircleTextIcon size={24} />
            Private Messaging (Explorer Pro)
          </h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Connect with Fellow Explorers</h3>
              <p className="text-gray-600">
                Explorer Pro members can send private messages to other Explorer Pro users to share experiences, 
                plan adventures together, or discuss travel opportunities.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-3">Getting Started</h3>
                <ol className="space-y-2 text-gray-600">
                  <li>1. Upgrade to Explorer Pro</li>
                  <li>2. Visit another Explorer Pro member's profile</li>
                  <li>3. Click the "Message" button between Follow and Sponsor</li>
                  <li>4. Start your conversation!</li>
                </ol>
              </div>
              <div>
                <h3 className="text-lg font-medium mb-3">Messaging Features</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Private one-on-one conversations</li>
                  <li>• Real-time message delivery</li>
                  <li>• Message read receipts</li>
                  <li>• Access via sidebar navigation</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-amber-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-2 text-amber-900">Messaging Guidelines</h3>
              <ul className="space-y-1 text-sm text-amber-800">
                <li>• Only Explorer Pro members can send and receive messages</li>
                <li>• Keep conversations respectful and travel-focused</li>
                <li>• Use messaging to connect, collaborate, and share experiences</li>
                <li>• Report any inappropriate behavior through our support system</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips & Best Practices */}
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <GearIcon size={24} />
            Tips & Best Practices
          </h2>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-3">Creating Great Content</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Use descriptive, engaging titles</li>
                <li>• Add high-quality photos</li>
                <li>• Include specific location details</li>
                <li>• Share genuine experiences and tips</li>
                <li>• Update journeys as you travel</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-3">Growing Your Audience</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Log entries consistently and regularly</li>
                <li>• Engage with other explorers</li>
                <li>• Use accurate geo-tags</li>
                <li>• Share unique perspectives</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Getting Help */}
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-semibold">Need More Help?</h2>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              Have questions or need support? We're here to help!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href={ROUTER.SUPPORT} 
                className="inline-flex items-center justify-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
              >
                Contact Support
              </Link>
              <Link 
                href={ROUTER.HOME} 
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Start Exploring
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};