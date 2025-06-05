import { IPostDetail } from '@repo/types';
import { LoadingSpinner, NormalizedText } from '@repo/ui/components';
import { CaretLineLeftIcon, CaretLineRightIcon } from '@repo/ui/icons';
import { cn } from '@repo/ui/lib/utils';
import Link from 'next/link';

import { CloseButton, UserBar } from '@/components';
import { dateformat } from '@/lib';
import { ROUTER } from '@/router';

export const MapPostDrawer: React.FC<{
  post?: IPostDetail;
  drawer?: boolean;
  loading?: boolean;
  mobile?: boolean;
  onClose?: () => void;
}> = ({ post, drawer = false, loading = false, mobile = false, onClose }) => {
  return (
    <div
      className={cn(
        'z-50 bg-background w-full desktop:h-dvh desktop:rounded-none desktop:rounded-l-2xl overflow-y-scroll absolute right-0 top-0 desktop:top-0 bottom-0',
        'desktop:max-w-[calc(100%-540px)]',
        'transform transition-transform duration-300 ease-in-out',
        drawer ? 'translate-x-0' : 'translate-x-full',

        // 'hidden lg:flex relative w-full',
        // collapsed ? 'lg:max-w-[65px]' : 'lg:max-w-[240px]',

        // drawer
        //   ? mobile
        //     ? 'translate-y-0'
        //     : 'translate-x-0'
        //   : mobile
        //     ? 'translate-y-full'
        //     : 'translate-x-full',
      )}
    >
      <div className="flex flex-col">
        <div className="p-4 h-[60px] sticky top-0 w-full flex flex-row justify-start items-center">
          <CloseButton
            className="bg-white animate-in spin-in"
            onClick={onClose}
          />
        </div>
        <div className="-mt-[60px] w-full h-[180px] bg-gray-500"></div>
        {loading ? (
          <LoadingSpinner />
        ) : post ? (
          <div className="w-full flex flex-col p-8">
            {post.author && (
              <Link
                href={
                  post?.author?.username
                    ? ROUTER.USERS.DETAIL(post?.author?.username)
                    : '#'
                }
              >
                <UserBar
                  name={post?.author?.name}
                  picture={post.author?.picture}
                  creator={post.author?.creator}
                  text={dateformat(post?.date).format('MMM DD')}
                />
              </Link>
            )}
            <div className="mt-8">
              <h2 className="text-3xl font-medium">{post.title}</h2>
            </div>
            <div className="py-6">
              <NormalizedText text={post.content} />
            </div>
          </div>
        ) : (
          <>post not found</>
        )}
      </div>
    </div>
  );
};

export const MapSidebar: React.FC<{
  children?: React.ReactNode;
  className?: string;
  opened?: boolean;
}> = ({ children, className, opened = false }) => {
  return (
    <div
      className={cn(
        'h-dvh bg-background overflow-hidden',
        opened
          ? `w-full desktop:min-w-[540px] desktop:max-w-[540px]`
          : 'desktop:max-w-[0px]',
        className,
      )}
    >
      {children}
    </div>
  );
};

export const MapViewContainer: React.FC<{
  children?: React.ReactNode;
  extended?: boolean;
  onExtend?: () => void;
}> = ({ children = <></>, extended = false, onExtend }) => {
  return (
    <div
      className={cn(
        'z-20 w-full max-w-full relative overflow-hidden bg-background',
        extended ? 'rounded-l-none' : 'desktop:rounded-l-2xl',
      )}
    >
      <div className="z-20 absolute hidden desktop:flex top-4 left-4">
        <button
          className="drop-shadow text-black bg-white hover:bg-white/90 p-2 rounded-full"
          onClick={onExtend}
        >
          {extended ? (
            <CaretLineRightIcon size={18} weight="bold" />
          ) : (
            <CaretLineLeftIcon size={18} weight="bold" />
          )}
        </button>
      </div>
      {children}
    </div>
  );
};
