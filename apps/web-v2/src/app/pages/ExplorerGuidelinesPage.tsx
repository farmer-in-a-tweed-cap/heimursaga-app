'use client';

import Link from 'next/link';
import { BookOpen, Camera, MapPin, Heart, Leaf, Users, DollarSign, Settings, Globe } from 'lucide-react';

export function ExplorerGuidelinesPage() {
  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      {/* Page Header */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        <div className="p-6">
          <div className="flex items-center mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
            <h1 className="text-2xl font-bold dark:text-[#e5e5e5]">EXPLORER GUIDELINES</h1>
          </div>
          <p className="text-sm text-[#616161] dark:text-[#b5bcc4]">
            Best practices for creating meaningful content and engaging responsibly with the Heimursaga community
          </p>
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 border-[#202020] dark:border-[#616161] p-6 mb-8">
        <h2 className="text-sm font-bold mb-4 text-[#202020] dark:text-white border-b border-[#616161] pb-2">
          QUICK NAVIGATION
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <a href="#being-explorer" className="text-xs text-[#ac6d46] hover:text-[#4676ac] font-mono">
            → Being an Explorer
          </a>
          <a href="#quality-entries" className="text-xs text-[#ac6d46] hover:text-[#4676ac] font-mono">
            → Quality Journal Entries
          </a>
          <a href="#photography" className="text-xs text-[#ac6d46] hover:text-[#4676ac] font-mono">
            → Photography & Media
          </a>
          <a href="#location-safety" className="text-xs text-[#ac6d46] hover:text-[#4676ac] font-mono">
            → Location Data & Safety
          </a>
          <a href="#cultural-sensitivity" className="text-xs text-[#ac6d46] hover:text-[#4676ac] font-mono">
            → Cultural Sensitivity
          </a>
          <a href="#environmental" className="text-xs text-[#ac6d46] hover:text-[#4676ac] font-mono">
            → Environmental Responsibility
          </a>
          <a href="#expedition-org" className="text-xs text-[#ac6d46] hover:text-[#4676ac] font-mono">
            → Expedition Organization
          </a>
          <a href="#community" className="text-xs text-[#ac6d46] hover:text-[#4676ac] font-mono">
            → Community Engagement
          </a>
          <a href="#sponsorship" className="text-xs text-[#ac6d46] hover:text-[#4676ac] font-mono">
            → Sponsorship Etiquette
          </a>
        </div>
      </div>

      {/* Content Sections */}
      <div className="space-y-8">
        {/* 1. Being an Explorer */}
        <section id="being-explorer" className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <Globe className="w-5 h-5" />
            <h2 className="text-lg font-bold">BEING AN EXPLORER</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">What It Means</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Being an explorer on Heimursaga means being part of a community that cares deeply about this planet 
                and the stories that emerge from exploring it. You are contributing to a living, growing repository 
                of geo-specific experiences, reflections, and knowledge that will serve as a resource for future 
                generations.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Our Mission</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Heimursaga exists to preserve authentic human experiences across the globe. Every entry you create 
                becomes part of a larger narrative about our shared world. Whether you're documenting a multi-month 
                expedition or a weekend hike, your perspective and observations matter.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">The Explorer Mindset</h3>
              <ul className="space-y-2 text-sm text-[#202020] dark:text-[#e5e5e5]">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span><strong>Authenticity:</strong> Share genuine experiences, not manufactured narratives</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span><strong>Curiosity:</strong> Approach unfamiliar places and cultures with openness and willingness to learn</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span><strong>Respect:</strong> Honor the people, places, and ecosystems you encounter</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span><strong>Contribution:</strong> Add value to the collective knowledge of the community</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 2. Creating Quality Journal Entries */}
        <section id="quality-entries" className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <BookOpen className="w-5 h-5" />
            <h2 className="text-lg font-bold">CREATING QUALITY JOURNAL ENTRIES</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Writing Authentic Narratives</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                The best journal entries tell a story. They transport readers to the place and moment you experienced. 
                Focus on:
              </p>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Sensory details (sights, sounds, smells, textures)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Specific moments rather than general summaries</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>People you met and conversations you had</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Challenges, surprises, and unexpected discoveries</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Personal reflections and what you learned</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Structuring Your Story</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                Consider organizing entries with:
              </p>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span><strong>Context:</strong> Where you are and how you got there</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span><strong>Experience:</strong> The main events or observations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span><strong>Reflection:</strong> What it meant to you or what you learned</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Balancing Detail and Readability</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Be specific and descriptive, but avoid overwhelming readers. Break long entries into paragraphs. 
                Use concrete examples rather than abstract descriptions. Remember: show, don't just tell.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Tags and Categories</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Use relevant tags to help others discover your content. Choose categories that accurately reflect 
                the type of entry (photo-essay, expedition-log, research-log, etc.). Tags should be specific enough 
                to be useful but broad enough to connect with related content.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Photography and Media */}
        <section id="photography" className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <Camera className="w-5 h-5" />
            <h2 className="text-lg font-bold">PHOTOGRAPHY & MEDIA BEST PRACTICES</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Capturing Authentic Moments</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                Authentic photography documents real moments. Avoid:
              </p>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6 mb-3">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>AI-generated or heavily manipulated images</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Staged scenes that misrepresent reality</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Stock photos or images from other sources</span>
                </li>
              </ul>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Light editing (exposure, color correction) is acceptable, but the image should remain true to what 
                you actually saw and experienced.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Technical Quality</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                While you don't need professional equipment, strive for:
              </p>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Sharp focus on your subject</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Proper exposure (not too dark or blown out)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Thoughtful composition that guides the viewer's eye</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>High enough resolution to display clearly (avoid overly compressed images)</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Visual Storytelling</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Photos should complement and enhance your written narrative. Include a variety of shots: wide 
                establishing shots, detail close-ups, portraits of people (with permission), and images that capture 
                the atmosphere and emotion of the moment.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Captions and Metadata</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Write meaningful captions that add context. Include camera settings and technical details if they're 
                relevant. Preserve EXIF data when possible—it's part of the historical record.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Photographing People</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Always ask permission before photographing people, especially in close-up portraits. Be culturally 
                sensitive about photography restrictions. Represent people with dignity and respect. If someone asks 
                you not to share their photo, honor that request.
              </p>
            </div>
          </div>
        </section>

        {/* 4. Location Data and Safety */}
        <section id="location-safety" className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <MapPin className="w-5 h-5" />
            <h2 className="text-lg font-bold">LOCATION DATA & SAFETY</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">When to Share Precise Locations</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                Precise GPS coordinates are valuable for creating an accurate geographic record, but consider:
              </p>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span><strong>Personal safety:</strong> Avoid sharing real-time precise locations if you're in a vulnerable situation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span><strong>Privacy:</strong> Use regional-level display for personal campsites or private properties</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span><strong>Security:</strong> Consider posting with a time delay if sharing exact locations</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Protecting Sensitive Locations</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                Some places should not have precise public locations shared:
              </p>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Endangered species habitats or nesting sites</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Archaeological sites vulnerable to looting</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Sacred cultural sites where communities request privacy</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Fragile ecosystems that could be damaged by increased traffic</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Privacy Settings</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Heimursaga provides granular privacy controls. By default, precise coordinates are displayed only 
                at a regional level publicly. You can adjust settings for individual entries or expeditions. Use 
                these tools to balance transparency with safety and conservation.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Real-Time vs. Retrospective Posting</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Consider posting entries after you've left an area, especially in remote or potentially dangerous 
                locations. Retrospective posting allows you to share precise locations without revealing your current 
                whereabouts.
              </p>
            </div>
          </div>
        </section>

        {/* 5. Cultural Sensitivity */}
        <section id="cultural-sensitivity" className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <Heart className="w-5 h-5" />
            <h2 className="text-lg font-bold">CULTURAL SENSITIVITY & RESPECT</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Research Before You Go</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Learn about local customs, taboos, and etiquette before visiting a new place. Understanding basic 
                cultural norms shows respect and often leads to richer experiences and deeper connections with locals.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Accurate Representation</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                When writing about communities and cultures:
              </p>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Avoid generalizations about entire populations based on limited interactions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Acknowledge your outsider perspective and its limitations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Present complexity and nuance rather than oversimplified narratives</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Be willing to admit when you don't fully understand something</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Avoiding Stereotypes</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Challenge stereotypes rather than reinforcing them. Focus on individuals and their specific stories 
                rather than treating entire cultures as monolithic. Recognize that every community contains diversity 
                of thought, practice, and perspective.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Giving Credit</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                When local guides, interpreters, or community members share knowledge with you, acknowledge their 
                contributions. Name people (with permission) and credit their expertise. Don't present local knowledge 
                as your own discoveries.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Language and Terminology</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Use respectful, contemporary terminology when referring to communities, ethnicities, and cultural 
                practices. Avoid outdated, colonial, or offensive language. When in doubt, use the terms communities 
                use for themselves.
              </p>
            </div>
          </div>
        </section>

        {/* 6. Environmental Responsibility */}
        <section id="environmental" className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <Leaf className="w-5 h-5" />
            <h2 className="text-lg font-bold">ENVIRONMENTAL RESPONSIBILITY</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Leave No Trace Principles</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                Follow established Leave No Trace guidelines:
              </p>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Plan ahead and prepare</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Travel and camp on durable surfaces</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Dispose of waste properly</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Leave what you find</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Minimize campfire impacts</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Respect wildlife</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Be considerate of other visitors</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Minimizing Travel Impact</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Consider your carbon footprint and environmental impact. Support local businesses and 
                sustainable tourism operators. Choose low-impact transportation when possible. Document your 
                efforts to travel responsibly—it can inspire others.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Supporting Conservation</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                When appropriate, highlight and support local conservation efforts in your entries. Share information 
                about threatened ecosystems and conservation organizations doing important work. Use your platform 
                to raise awareness.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Documenting Environmental Changes</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Your entries become part of a historical record. If you witness environmental changes—glacier retreat, 
                deforestation, pollution, etc.—document them responsibly. Present facts accurately and cite sources 
                when making claims about environmental trends.
              </p>
            </div>
          </div>
        </section>

        {/* 7. Expedition Organization */}
        <section id="expedition-org" className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <Settings className="w-5 h-5" />
            <h2 className="text-lg font-bold">EXPEDITION ORGANIZATION</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Platform Structure</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                Heimursaga uses a hierarchical structure:
              </p>
              <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-4 border-[#ac6d46] p-4 font-mono text-xs mb-3">
                <div className="text-[#202020] dark:text-[#e5e5e5]">Explorer (You)</div>
                <div className="ml-4 text-[#202020] dark:text-[#e5e5e5]">└─ Journal (e.g., "Silk Road Chronicles")</div>
                <div className="ml-8 text-[#202020] dark:text-[#e5e5e5]">└─ Expedition (e.g., "Cycling Central Asia 2025")</div>
                <div className="ml-12 text-[#202020] dark:text-[#e5e5e5]">└─ Journal Entry (e.g., "Day 47: Samarkand")</div>
              </div>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Journals group related expeditions by theme, region, or type. Expeditions are specific journeys 
                with defined timeframes. Entries are individual posts within an expedition.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Planning Expedition Structure</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Think about how to divide your travels into logical expeditions. A single long journey might be one 
                expedition, or you might break it into segments (e.g., "Summer 2025 - Morocco," "Summer 2025 - Spain," 
                etc.). Choose structures that make sense for how readers will discover and follow your content.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Setting Realistic Timelines</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Set expedition start and end dates that you can realistically maintain. It's better to post 
                consistently within a shorter timeframe than to create an ambitious timeline you can't sustain.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Maintaining Consistency</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Regular posting helps build an audience and creates momentum. However, quality matters more than 
                frequency. It's better to post thoughtful entries weekly than rushed entries daily.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Multi-Phase Journeys</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                For journeys spanning months or years with breaks, consider creating separate expeditions for each 
                phase. This makes your content more digestible and helps readers follow along.
              </p>
            </div>
          </div>
        </section>

        {/* 8. Community Engagement */}
        <section id="community" className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <Users className="w-5 h-5" />
            <h2 className="text-lg font-bold">COMMUNITY ENGAGEMENT</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Following Other Explorers</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Build your network by following explorers whose journeys interest you. Use the FOLLOWING feed to 
                stay updated on their latest entries. Following is public and helps create connections within the 
                community.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Meaningful Commenting</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed mb-2">
                When commenting on others' entries:
              </p>
              <ul className="space-y-1 text-sm text-[#202020] dark:text-[#e5e5e5] ml-6">
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Add value to the conversation with thoughtful responses</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Ask genuine questions if you want to learn more</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Share relevant experiences that connect to their story</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#ac6d46] mt-1">•</span>
                  <span>Avoid generic praise or spam</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Building Genuine Connections</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Heimursaga is a community, not just a broadcasting platform. Engage authentically with other explorers. 
                Share knowledge, offer advice when asked, and be open to learning from others' experiences.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Bookmarking and Organizing</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Use bookmarks to save entries you want to reference later. This helps you build your own curated 
                collection of valuable content and shows appreciation to content creators.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Collaborative Opportunities</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Consider collaborating with other explorers when your paths cross. Joint entries, shared expeditions, 
                or cross-references can create rich, multifaceted narratives.
              </p>
            </div>
          </div>
        </section>

        {/* 9. Sponsorship Etiquette */}
        <section id="sponsorship" className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
            <DollarSign className="w-5 h-5" />
            <h2 className="text-lg font-bold">SPONSORSHIP ETIQUETTE (Explorer Pro)</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Transparency About Funding</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Be clear and honest about how sponsorship funds will be used. Set realistic funding goals that 
                align with actual expedition costs. Update sponsors on how funds are being utilized.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Communicating with Sponsors</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Sponsors are supporting your journey because they believe in what you're doing. Keep them engaged 
                through quality content. Consider acknowledging major supporters (with their permission) in your 
                expedition updates.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Setting Funding Goals</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Set funding goals that reflect actual needs. Explain what the funds will cover (equipment, 
                transportation, permits, etc.). Breaking down costs helps sponsors understand how their contribution 
                makes a difference.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Acknowledging Support</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Express gratitude to your sponsors. Consider dedicating expedition summaries or milestone entries 
                to thank those who made the journey possible. Remember that sponsorship is a relationship, not 
                just a transaction.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-[#202020] dark:text-white">Content Integrity</h3>
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
                Sponsorship should not compromise the authenticity of your content. Continue to share honest 
                experiences, including challenges and setbacks. Sponsors support you for your authentic voice, 
                not curated perfection.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Footer CTA */}
      <div className="mt-8 bg-[#616161] dark:bg-[#3a3a3a] border-2 border-[#202020] dark:border-[#616161] p-6 text-center">
        <h3 className="text-lg font-bold text-white mb-2">Ready to Start Your Journey?</h3>
        <p className="text-sm text-[#b5bcc4] mb-4">
          Log your first entry or explore the platform documentation for technical details.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/select-expedition"
            className="px-6 py-3 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all text-sm font-bold"
          >
            LOG ENTRY
          </Link>
          <Link
            href="/documentation"
            className="px-6 py-3 border-2 border-white text-white hover:bg-white hover:text-[#202020] transition-all text-sm font-bold"
          >
            PLATFORM DOCUMENTATION
          </Link>
        </div>
      </div>
    </div>
  );
}