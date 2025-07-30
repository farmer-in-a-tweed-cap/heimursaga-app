"use client"

import React, { useState, useEffect } from 'react';
import { Logo } from '@/components';
import { ROUTER } from '@/router';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@repo/ui/lib/utils';

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
  <div className={`container mx-auto px-4 py-16`}>
    <div className={`flex flex-col ${reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'} ${mobileImageAlign === 'left' ? 'items-start lg:items-center' : 'items-center'} gap-12 max-w-6xl mx-auto`}>
      <div className={`lg:w-1/2 ${mobileImageAlign === 'left' ? 'text-left' : 'text-center lg:text-left'}`}>
        <div className="inline-block px-4 py-2 text-sm uppercase font-light mb-4 text-white" style={{ backgroundColor: '#4676AC' }}>
          {title}
        </div>
        <h3 className="text-4xl lg:text-5xl font-light text-black mb-6 leading-tight" style={{ fontFamily: 'Sulphur Point, sans-serif' }}>
          {subtitle}
        </h3>
        <p className="text-lg text-gray-700 font-light leading-relaxed max-w-xl">
          {description}
        </p>
      </div>
      {imageSrc && (
        <div className={`lg:w-1/2 ${mobileImageAlign === 'left' ? 'self-start w-full' : ''}`}>
          <div className="relative group">
            <Image 
              src={imageSrc} 
              alt={imageAlt || subtitle} 
              width={800}
              height={320}
              className={`relative w-full h-80 rounded-2xl shadow-2xl transform group-hover:scale-105 transition-transform duration-300 ${mobileImageAlign === 'left' ? 'object-cover object-left lg:object-center' : 'object-cover'}`}
              style={{ border: '4px solid #AC6D46' }}
            />
          </div>
        </div>
      )}
    </div>
  </div>
);

const PricingTier: React.FC<PricingTierProps> = ({ title, price, features, isPopular = false }) => (
  <div className={`relative rounded-3xl shadow-xl p-8 transform hover:scale-105 transition-all duration-300 ${isPopular ? 'border-4 border-blue-500' : 'border border-gray-600'}`} style={{ backgroundColor: '#252525' }}>
    {isPopular && (
      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
        <div className="text-white text-sm font-light px-6 py-2 rounded-full shadow-lg" style={{ backgroundColor: '#AC6D46', fontFamily: 'Lato, sans-serif' }}>
          Most Popular
        </div>
      </div>
    )}
    <div className="text-center mb-8">
      <h3 className="text-2xl font-light text-white mb-2" style={{}}>{title}</h3>
      <div className="text-4xl font-light mb-6" style={{ color: '#4676AC', fontFamily: 'Lato, sans-serif' }}>
        {price}
      </div>
    </div>
    <ul className="space-y-4 mb-8">
      {features.map((feature, index) => (
        <li key={index} className="flex items-start">
          <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <span className="text-gray-300 font-light" style={{}}>{feature}</span>
        </li>
      ))}
    </ul>
    <Link 
      href={ROUTER.SIGNUP}
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
  const [isMobileSafari, setIsMobileSafari] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setIsVisible(true);
    
    const checkDeviceType = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isMobileWidth = width < 760;
      
      // Detect specifically Safari on iOS (not other mobile browsers)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isActualSafari = /Version\/[\d\.].*Safari/.test(navigator.userAgent);
      const isMobileSafariDevice = isIOS && isActualSafari && isMobileWidth;
      
      setIsMobile(isMobileWidth);
      setIsMobileSafari(isMobileSafariDevice);
    };
    
    checkDeviceType();
    
    const handleResize = () => {
      checkDeviceType();
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 1; 
    }
  }, []);

  return (
    <div className="min-h-screen relative">
      
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
        >
          <source src="/bg-video2.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black opacity-50"></div>
      </div>

      {/* Hero Section */}
      <div className="relative min-h-screen text-white overflow-hidden z-10">

 
        
        <div className="relative z-30 w-full h-screen">
          {/* Logo at top */}
          <div className={`absolute left-0 right-0 flex justify-center transform transition-all duration-1000 z-50 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`} style={{ top: '8px', marginTop: isMobile ? '-50px' : '-60px' }}>
            <h1 className="text-4xl lg:text-4xl font-light mb-1 leading-tight hidden" style={{}}>
              <span className="block text-white">WELCOME TO</span>
            </h1>
            
            <div className="w-96 h-72 lg:w-[36rem] lg:h-[28rem] mr-6">
              <Logo size="xlg" color="light" />
            </div>
          </div>
          
          {/* Text in middle */}
          <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`} style={{ transform: `translate(-50%, -50%) ${isVisible ? 'translateY(0)' : 'translateY(2.5rem)'}` }}>
            <div className={cn(
              "font-light max-w-4xl mx-auto text-gray-200 leading-relaxed space-y-6 text-center",
              // Larger text for mobile Safari since it renders smaller
              isMobileSafari 
                ? "text-2xl sm:text-2xl md:text-3xl lg:text-3xl" 
                : "text-xl sm:text-xl md:text-2xl lg:text-3xl"
            )}>
              <p>You're an explorer.</p>
              <p>Don't get lost in a sea of content creators.</p>
              <p>Share your story and raise money on Heimursaga.</p>
            </div>
          </div>
          
          {/* Button near bottom */}
          <div 
            className={`absolute left-0 right-0 flex justify-center transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
            style={{ 
              bottom: isMobileSafari 
                ? '8rem' // Even higher positioning for Safari to ensure visibility
                : `calc(3rem + env(safe-area-inset-bottom, 0px))`
            }}
          >
            <button className="font-normal py-4 px-12 rounded-full text-xl transition-all duration-300 transform hover:scale-110 shadow-2xl text-white hover:opacity-90" style={{ backgroundColor: '#AC6D46', fontFamily: 'Lato, sans-serif' }}>
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

      {/* Features Section */}
      <div className="py-20 relative z-10" style={{ backgroundColor: 'white' }}>
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
          description="Every user gets a journal where their geo-tagged entries are logged. Entry photo uploads and privacy settings are included, as well as entry grouping to show journey lines on the map. Follow or sponsor other explorers by visiting their journal."
          imageSrc="/journal.png"
          imageAlt="Journal writing interface"
          reverse={true}
        />

        <FeatureCard
          title="Payment-Enabled"
          subtitle="Sponsor"
          description="A robust Stripe integration allows Explorer Pro users to receive subscription or one-time sponsorship payments from their supporters. Manage payouts and set subscription amounts right from your Heimursaga dashboard. Entries have an exclusive sponsor-only setting allowing explorers to reward their sponsors!"
          imageSrc="/sponsor.png"
          imageAlt="Sponsorship payment interface"
          mobileImageAlign="left"
        />
      </div>

      {/* Call to Action */}
      <div className="relative py-32 text-white overflow-hidden z-10" style={{ backgroundColor: '#4676AC' }}>
        <div className="absolute inset-0 bg-black opacity-30"></div>
        <div className="relative z-10 container mx-auto px-4 text-center">
          <h2 className="text-5xl lg:text-6xl font-light mb-6" style={{}}>BE AN EXPLORER</h2>
          <h3 className="text-2xl lg:text-3xl font-normal mb-8" style={{ color: '#AC6D46', fontFamily: 'Lato, sans-serif' }}>JOIN HEIMURSAGA TODAY</h3>
          <p className="text-xl mb-12 max-w-3xl mx-auto text-gray-100 font-light leading-relaxed" style={{}}>
            Every place has a story, what's yours? Like the explorers of old, it's never too late to inspire the world.
          </p>
            <div className="flex items-center justify-center">
              <button className="font-normal py-4 px-12 rounded-full text-xl transition-all duration-300 transform hover:scale-110 shadow-2xl text-white hover:opacity-90" style={{ backgroundColor: '#AC6D46', fontFamily: 'Lato, sans-serif' }}>
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

      {/* Pricing Section */}
      <div className="py-32 relative z-10" style={{ backgroundColor: 'white' }}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-5xl lg:text-6xl font-light text-black mb-6" style={{}}>
              Choose Your Adventure
            </h2>
            <p className="text-xl text-gray-700 font-light max-w-2xl mx-auto" style={{}}>
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
                "All Explorer features included",
                "Receive sponsorship payments",
                "View detailed entry statistics",
                "Journey Builder (waypoint logging and entry grouping)"
              ]}
              isPopular={false}
            />
          </div>
          
          <div className="text-center mt-12">
            <p className="text-gray-700 font-light mb-6" style={{}}>
              Already have an account?
            </p>
            <Link 
              href={ROUTER.LOGIN}
              className="inline-block py-3 px-8 rounded-xl font-normal text-lg transition-all duration-300 bg-gray-700 hover:bg-gray-600 text-white hover:opacity-90"
                         >
              LOG IN
            </Link>
          </div>
        </div>
      </div>

      {/* Quote Section */}
      <div className="py-16 text-white relative z-10" style={{ backgroundColor: '#AC6D46' }}>
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="text-6xl mb-8" style={{ color: 'white' }}>"</div>
            <blockquote className="text-1xl lg:text-2xl font-light mb-8 italic leading-relaxed" style={{}}>
              We shall not cease from exploration<br />
              And the end of all our exploring<br />
              Will be to arrive where we started<br />
              And know the place for the first time.
            </blockquote>
            <cite className="text-xl text-gray-300 font-light" style={{}}>— T.S. Eliot</cite>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-white py-12 relative z-10" style={{ backgroundColor: '#252525' }}>
        <div className="container mx-auto px-4 text-center">
          <div className="text-2xl font-light mb-4" style={{ color: '#AC6D46', fontFamily: 'Lato, sans-serif' }}>
            HEIMURSAGA
          </div>
          <p className="text-gray-400 font-light" style={{}}>
            © 2025 <a href="https://theperipetycompany.com/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-300 transition-colors no-underline">The Peripety Company</a>. All Rights Reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};