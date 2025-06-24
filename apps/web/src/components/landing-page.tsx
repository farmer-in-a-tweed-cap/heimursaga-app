import { Button } from '@repo/ui/components';
import Link from 'next/link';

import { Logo } from '@/components';
import { APP_CONFIG } from '@/config';
import { ROUTER } from '@/router';

const data = {
  counters: [
    {
      header: '25k+',
      subheader: 'stories',
      description: 'Discover unexpected gems, even in your own backyard.',
    },
    {
      header: '10k+',
      subheader: 'authors',
      description: 'Share your adventures and learn from our community.',
    },
    {
      header: '$5m+',
      subheader: 'earned',
      description: 'Monetize your stories and accept donations.',
    },
  ],
};

export const LandingPage = () => {
  return (
    <div className="w-full h-auto flex flex-col">
      <div className="w-full h-auto min-h-dvh bg-white flex flex-col justify-center items-center py-20">
        <header className="absolute top-0 left-0 right-0 w-full h-[60px] bg-white flex flex-row items-center justify-center">
          <Logo size="lg" color="dark" />
        </header>
        <div className="w-full max-w-2xl flex flex-col justify-center items-center gap-6 p-6">
          <h2 className="text-6xl font-semibold text-center">
            Turn your travels into income
          </h2>
          <span className="text-base text-center">
            Capture your adventures, connect with a global audience, and
            monetize your stories. Start creating, sharing, and earning today!
          </span>
        </div>
        <div className="mt-14 flex flex-col justify-center items-center">
          <Button size="lg" asChild>
            <Link href={ROUTER.HOME}>Explore</Link>
          </Button>
        </div>
      </div>
      <div className="w-full h-auto bg-white flex flex-col justify-center items-center py-20">
        <div className="w-full max-w-6xl flex flex-col justify-center items-center gap-6 desktop:p-6">
          <div className="w-full h-[540px] desktop:rounded-2xl bg-gray-100 p-16 flex flex-col justify-center items-start">
            <div className="flex flex-col justify-start items-start">
              <div className="w-full max-w-md flex flex-col gap-4">
                <h2 className="text-4xl font-medium">
                  Upgrade your adventures
                </h2>
                <p className="text-base font-normal">
                  Whether you want to explore offline or create your own route,
                  choose the membership that helps you make the most of every
                  minute outdoors.
                </p>
              </div>
              <div className="mt-6">
                <Button size="lg" asChild>
                  <Link href="">action</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="w-full h-auto bg-white flex flex-col justify-center items-center py-20">
        <div className="w-full max-w-5xl flex flex-col justify-center items-center gap-6">
          <div className="grid grid-cols-1 desktop:grid-cols-3 gap-6">
            {data.counters.map(({ header, subheader, description }, key) => (
              <div
                key={key}
                className="flex flex-col items-center justify-start gap-4"
              >
                <span className="text-5xl desktop:text-7xl font-medium">
                  {header}
                </span>
                <span className="text-lg font-medium">{subheader}</span>
                <span className="text-base font-normal text-center leading-loose">
                  {description}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="w-full h-auto bg-white flex flex-col justify-center items-center py-20">
        <div className="w-full max-w-6xl flex flex-col justify-center items-center gap-6 desktop:p-6">
          <div className="w-full h-[540px] desktop:rounded-2xl bg-gray-100 p-16 flex flex-col justify-center items-start">
            <div className="flex flex-col justify-start items-start">
              <div className="w-full max-w-md flex flex-col gap-4">
                <h2 className="text-4xl font-medium">
                  Upgrade your adventures
                </h2>
                <p className="text-base font-normal">
                  Whether you want to explore offline or create your own route,
                  choose the membership that helps you make the most of every
                  minute outdoors.
                </p>
              </div>
              <div className="mt-6">
                <Button size="lg" asChild>
                  <Link href="">action</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="w-full h-auto min-h-[400px] bg-white flex flex-col justify-center items-center py-20">
        <div className="w-full max-w-xl flex flex-col justify-center items-center gap-6 p-6">
          <h2 className="text-6xl font-semibold text-center">
            Start your journey
          </h2>
          <span className="text-base text-center">
            Create a free account today and start posting unique stories for
            your fellow explorers.
          </span>
        </div>
        {/* <div className="mt-6 flex flex-col justify-center items-center">
          <Button size="lg" asChild>
            <Link href={ROUTER.SIGNUP}>Sign up</Link>
          </Button>
        </div> */}
      </div>
      <footer className="w-full h-auto min-h-[140px] bg-dark text-gray-200 text-base flex flex-row justify-center items-start">
        <div className="w-full max-w-7xl grid grid-cols-1 desktop:grid-cols-3 p-6">
          <div className="flex flex-col justify-start items-start gap-2">
            <span>© 2025 {APP_CONFIG.APP.NAME}, LLC</span>
            <ul className="flex flex-row gap-2">
              {[
                { href: ROUTER.LEGAL.PRIVACY, label: 'Privacy' },
                { href: ROUTER.LEGAL.TERMS, label: 'Terms' },
              ].map(({ href, label }, key) => (
                <li
                  key={key}
                  className="flex flex-row justify-start items-center gap-1"
                >
                  <span>•</span>
                  <Link href={href} className="hover:underline">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
};
