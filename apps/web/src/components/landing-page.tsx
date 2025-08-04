"use client"

import React, { useState, useEffect } from 'react';
import { Logo } from '@/components';
import { ROUTER } from '@/router';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@repo/ui/lib/utils';
import { InstagramLogo, XLogo } from '@repo/ui/icons';

interface FeatureCardProps {
  title: string;
  subtitle: string;
  description: string;
  imageSrc?: string;
  imageAlt?: string;
  reverse?: boolean;
  mobileImageAlign?: 'center' | 'left';
}

interface PricingTierProps {
  title: string;
  price: string;
  features: string[];
  isPopular?: boolean;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, subtitle, description, imageSrc, imageAlt, reverse = false, mobileImageAlign = 'center' }) => (
  <div className={`container mx-auto px-4 py-20 mobile-feature-card`}>
    <div className={`flex flex-col ${reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-16 lg:gap-12 max-w-6xl mx-auto`}>
      <div className={`lg:w-1/2 text-center lg:text-left`}>
        <div className="inline-block px-4 py-2 text-sm uppercase font-normal mb-4 text-white" style={{ backgroundColor: '#4676AC' }}>
          {title}
        </div>
        <h3 className="text-4xl lg:text-5xl font-light text-black mb-6 leading-tight" style={{ fontFamily: 'Sulphur Point, sans-serif' }}>
          {subtitle}
        </h3>
        <p className="text-lg text-black font-light leading-relaxed max-w-xl">
          {description}
        </p>
      </div>
      {imageSrc && (
        <div className="w-full lg:w-1/2 mb-12 lg:mb-0 px-8 lg:px-0">
          <div className="relative group">
            <Image 
              src={imageSrc} 
              alt={imageAlt || subtitle} 
              width={800}
              height={320}
              className={`relative w-full h-64 lg:h-64 rounded-2xl shadow-2xl transform group-hover:scale-105 transition-transform duration-300 ${mobileImageAlign === 'left' ? 'object-cover object-left-top' : 'object-cover'} aspect-square lg:aspect-auto`}
              style={{ border: '4px solid #AC6D46' }}
            />
          </div>
        </div>
      )}
    </div>
  </div>
);

const PricingTier: React.FC<PricingTierProps> = ({ title, price, features, isPopular = false }) => (
  <div className={`relative rounded-3xl shadow-xl p-8 transform hover:scale-105 transition-all duration-300 ${isPopular ? 'border-4 border-blue-500' : 'border border-gray-300'}`} style={{ backgroundColor: '#e9ecef' }}>
    {isPopular && (
      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
        <div className="text-white text-sm font-normal px-6 py-2 rounded-full shadow-lg" style={{ backgroundColor: '#AC6D46', fontFamily: 'Lato, sans-serif' }}>
          Most Popular
        </div>
      </div>
    )}
    <div className="text-center mb-8">
      <h3 className="text-2xl font-normal text-black mb-2" style={{}}>{title}</h3>
      <div className="text-4xl font-semibold mb-6" style={{ color: '#4676AC', fontFamily: 'Lato, sans-serif' }}>
        {price}
      </div>
    </div>
    <ul className="space-y-4 mb-8">
      {features.map((feature, index) => (
        <li key={index} className="flex items-start">
          <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-3" style={{ backgroundColor: '#E6F0FF' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#4676AC' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <span className="text-gray-700 font-normal" style={{}}>{feature}</span>
        </li>
      ))}
    </ul>
    <Link 
      href={`${ROUTER.SIGNUP}?upgrade=pro`}
      className="w-full py-4 px-6 rounded-xl font-normal text-lg transition-all duration-300 text-white hover:opacity-90 block text-center shadow-lg hover:shadow-xl"
      style={{ backgroundColor: '#AC6D46', fontFamily: 'Lato, sans-serif' }}
    >
      SIGN UP
    </Link>
  </div>
);

export const LandingPage: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setIsVisible(true);
    
    const checkDeviceType = () => {
      const width = window.innerWidth;
      const isMobileWidth = width < 768;
      setIsMobile(isMobileWidth);
    };
    
    checkDeviceType();
    window.addEventListener('resize', checkDeviceType);
    
    return () => {
      window.removeEventListener('resize', checkDeviceType);
    };
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 1; 
    }
  }, []);

  return (
    <div className="min-h-screen relative" style={{ height: '100vh', minHeight: '100vh' }}>
        {/* Fixed Background Video */}
        <div className="fixed inset-0 z-0">
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
            poster="/bg.png"
            style={{
              objectFit: 'cover',
              height: '100%'
            }}
          >
            <source src="/bg-video2.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-black opacity-50"></div>
        </div>

        {/* Hero Section */}
        <div className="relative min-h-screen text-white overflow-hidden z-10">
          <div className="relative z-30 w-full h-screen" style={{ height: '100vh', minHeight: '100vh' }}>
            {/* Logo at top */}
            <div className={`absolute left-0 right-0 flex justify-center transform transition-all duration-1000 z-50 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`} 
                 style={{ 
                   top: isMobile ? '1rem' : '8px', 
                   marginTop: isMobile ? '0' : '-60px' 
                 }}>
              <div className={isMobile ? 'w-64 h-48 mr-6' : 'w-96 h-72 lg:w-[36rem] lg:h-[28rem] mr-10'}>
                <Logo size="xlg" color="light" />
              </div>
            </div>
            
            {/* Text in middle */}
            <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`} 
                 style={{ transform: `translate(-50%, -50%) ${isVisible ? 'translateY(0)' : 'translateY(2.5rem)'}` }}>
              <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-light max-w-4xl mx-auto text-gray-200 leading-relaxed space-y-6 text-center px-4">
                <p>You're an explorer.</p>
                <p>Don't get lost in a sea of content creators.</p>
                <p>Share your story and raise money on Heimursaga.</p>
              </div>
            </div>
            
            {/* Button near bottom */}
            <div 
              className={`absolute left-0 right-0 flex justify-center transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
              style={{ 
                bottom: isMobile ? '6rem' : '3rem'
              }}
            >
              <button className={`font-normal rounded-full transition-all duration-300 transform hover:scale-110 shadow-2xl text-white hover:opacity-90 ${isMobile ? 'py-3 px-8 text-lg' : 'py-4 px-12 text-xl'}`} style={{ backgroundColor: '#AC6D46', fontFamily: 'Lato, sans-serif' }}>
                <Link href={ROUTER.HOME} className="flex items-center gap-3">
                  EXPLORE
                  <svg 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </Link>
              </button>
            </div>
          </div>  
        </div>

        {/* Philosophy Section */}
        <div className="py-20 relative z-10" style={{ backgroundColor: '#e9ecef' }}>
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-4xl lg:text-5xl font-light text-black mb-8 leading-tight" style={{ fontFamily: 'Sulphur Point, sans-serif' }}>
                A Quiet Place for Explorers
              </h2>
              <p className="text-xl text-black font-light leading-relaxed mb-12 max-w-3xl mx-auto">
                Heimursaga is intentionally designed for the explorer, for the traveler, for the people who like to "get away", and for the people who want to share what they found. Heimursaga is fundamentally a journaling and fundraising tool, but it's also more than that. It's a peaceful space that prioritizes meaningful content over viral engagement; a social-media antidote. Our minimal interface lets you focus on what matters: exploration, discovery, and appreciation for the people who do it.
              </p>
              <div className="grid md:grid-cols-2 gap-12 mt-12">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#AC6D46' }}>
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
                    </svg>
                  </div>
                  <h3 className="text-xl font-medium text-black mb-4">Distraction-Free Experience</h3>
                  <p className="text-black font-light leading-relaxed">
                    No commenting, no trolls, no doomscrolling, no social pressure. Just pure storytelling without the noise of traditional social media.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#AC6D46' }}>
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                    </svg>
                  </div>
                  <h3 className="text-xl font-medium text-black mb-4">Appreciation Over Engagement</h3>
                  <p className="text-black font-light leading-relaxed">
                    Connect with explorers through financial sponsorship. Your support becomes a tangible way to show appreciation for their adventures.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-16 relative z-10" style={{ backgroundColor: 'white' }}>
          <FeatureCard
            title="Map-Centric"
            subtitle="Explore"
            description="At Heimursaga, the map is everything, just like it is for the explorer. Use the map or the feed to discover journal entries and explorers around the world."
            imageSrc="/explore.png"
            imageAlt="Map exploration interface"
          />

          <FeatureCard
            title="Text-Focused"
            subtitle="Journal"
            description="Every user gets a journal where their geo-tagged entries are logged. Photo uploads and privacy settings are included, as well as entry grouping to show journey lines on the map. Follow or sponsor other explorers by visiting their journal."
            imageSrc="/journal.png"
            imageAlt="Journal writing interface"
            reverse={true}
          />

          <FeatureCard
            title="Payment-Enabled"
            subtitle="Sponsor"
            description="A robust Stripe integration allows Explorer Pro users to receive subscription or one-time sponsorship payments from their supporters. Manage payouts and set subscription amounts right from your Heimursaga dashboard. Entries have an exclusive sponsor-only setting allowing explorers to reward their sponsors."
            imageSrc="/sponsor.png"
            imageAlt="Sponsorship payment interface"
            mobileImageAlign="left"
          />
        </div>

        {/* AI Content Policy Section */}
        <div className="py-20 relative z-10" style={{ backgroundColor: '#e9ecef' }}>
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-4xl mx-auto">
              <div className="inline-block px-6 py-3 text-sm uppercase font-normal mb-8 text-white" style={{ backgroundColor: '#4676AC' }}>
                Human-First
              </div>
              <h2 className="text-4xl lg:text-5xl font-light text-black mb-8 leading-tight" style={{ fontFamily: 'Sulphur Point, sans-serif' }}>
                Authentic Stories, Human Voices
              </h2>
              <p className="text-xl text-black font-light leading-relaxed mb-8 max-w-3xl mx-auto">
                While AI has its place in our world, exploration and discovery is for humans. Heimursaga implements multiple safeguards to ensure the platform is free from AI-generated text and image content.
              </p>
              <div className="grid md:grid-cols-3 gap-8 mt-12">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#AC6D46' }}>
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-black mb-2">Content Detection</h3>
                  <p className="text-black font-light">Advanced algorithms identify and flag AI-generated content before it reaches the platform.</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#AC6D46' }}>
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-black mb-2">Human Review</h3>
                  <p className="text-black font-light">Our community and moderation team help maintain the authenticity of shared experiences.</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#AC6D46' }}>
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-black mb-2">Platform Integrity</h3>
                  <p className="text-black font-light">Transparent policies and consistent enforcement ensure authentic human connection and storytelling.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="py-32 relative z-10" style={{ backgroundColor: 'white' }}>
          <div className="container mx-auto px-4">
            <div className="text-center mb-20">
              <h2 className="text-5xl lg:text-6xl font-light text-black mb-6" style={{}}>
                Choose Your Adventure
              </h2>
              <p className="text-xl text-black font-light max-w-2xl mx-auto" style={{}}>
                Start your journey with our free plan or unlock premium features with Explorer Pro
              </p>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-12 max-w-4xl mx-auto">
              <PricingTier
                title="EXPLORER"
                price="FREE FOREVER"
                features={[
                  "Write and share journal entries",
                  "Bookmark and highlight entries",
                  "Follow and sponsor other explorers",
                  "Access exclusive entries from sponsored explorers"
                ]}
              />
              <PricingTier
                title="EXPLORER PRO"
                price="$7/mo"
                features={[
                  "All Explorer features plus:",
                  "Receive sponsorship payments",
                  "View detailed entry statistics",
                  "Journey Builder (waypoint logging and entry grouping)"
                ]}
                isPopular={false}
              />
            </div>
            
            <div className="text-center mt-12">
              <p className="text-gray-700 font-normal mb-6" style={{}}>
                Already have an account?
              </p>
              <Link 
                href={ROUTER.LOGIN}
                className="inline-block py-3 px-8 rounded-xl font-normal text-lg transition-all duration-300 text-black hover:opacity-90"
                style={{ backgroundColor: '#e9ecef' }}
              >
                LOG IN
              </Link>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="relative py-32 text-white overflow-hidden z-10" style={{ backgroundColor: '#4676AC' }}>
          <div className="absolute inset-0 bg-black opacity-30"></div>
          <div className="relative z-10 container mx-auto px-4 text-center">
            <h2 className="text-5xl lg:text-6xl font-light mb-6" style={{}}>BE AN EXPLORER</h2>
            <h3 className="text-2xl lg:text-3xl font-normal mb-8" style={{ color: '#AC6D46', fontFamily: 'Lato, sans-serif' }}>JOIN HEIMURSAGA TODAY</h3>
            <p className="text-xl mb-12 max-w-3xl mx-auto text-white font-light leading-relaxed" style={{}}>
              Every place has a story, what's yours? It's never too late to inspire the world.
            </p>
            <div className="flex items-center justify-center">
              <button className={`font-normal rounded-full transition-all duration-300 transform hover:scale-110 shadow-2xl text-white hover:opacity-90 ${isMobile ? 'py-3 px-8 text-lg' : 'py-4 px-12 text-xl'}`} style={{ backgroundColor: '#AC6D46', fontFamily: 'Lato, sans-serif' }}>
                <Link href={ROUTER.HOME} className="flex items-center gap-3">
                  START YOUR JOURNEY
                  <svg 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </Link>
              </button>
            </div>
          </div>
        </div>

        {/* Quote Section */}
        <div className="py-16 text-gray-900 relative z-10" style={{ backgroundColor: '#e9ecef' }}>
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-4xl mx-auto">
              <blockquote className="text-1xl lg:text-2xl font-light mb-8 italic leading-relaxed" style={{}}>
                We shall not cease from exploration<br />
                And the end of all our exploring<br />
                Will be to arrive where we started<br />
                And know the place for the first time.
              </blockquote>
              <cite className="text-xl text-gray-600 font-light" style={{}}>— T.S. Eliot</cite>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-white py-12 relative z-10" style={{ backgroundColor: '#252525' }}>
          <div className="container mx-auto px-4 text-center">
            <div className="text-2xl font-normal" style={{ color: '#AC6D46', fontFamily: 'Lato, sans-serif' }}>
              HEIMURSAGA
            </div>
            <div className="text-gray-400 font-normal text-center mb-6"><small>Made in Maine</small></div>
            <div className="flex justify-center space-x-6 mb-6">
              <a href="https://instagram.com/heimursaga" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <InstagramLogo size={24} />
              </a>
              <a href="https://twitter.com/heimursaga" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <XLogo size={24} />
              </a>
            </div>
            <p className="text-gray-400 font-normal" style={{}}>
              © 2025 <a href="https://theperipetycompany.com/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-300 transition-colors no-underline">The Peripety Company</a>. All Rights Reserved.
            </p>
          </div>

        </footer>
    </div>
  );
};