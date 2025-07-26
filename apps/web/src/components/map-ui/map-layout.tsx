import { IPostDetail } from '@repo/types';
import { Button, LoadingSpinner, NormalizedText } from '@repo/ui/components';
import {
  CaretLineLeftIcon,
  CaretLineRightIcon,
  ListBulletsIcon,
  MapTrifoldIcon,
} from '@repo/ui/icons';
import { cn } from '@repo/ui/lib/utils';
import Image from 'next/image';
import Link from 'next/link';

import { CloseButton, PostButtons, UserBar } from '@/components';
import { MAP_VIEW_PARAMS } from '@/hooks';
import { dateformat } from '@/lib';
import { ROUTER } from '@/router';

export const MapDrawer: React.FC<{
  post?: IPostDetail;
  opened?: boolean;
  loading?: boolean;
  mobile?: boolean;
  onClose?: () => void;
}> = ({ post, opened = false, loading = false, mobile = false, onClose }) => {
  return (
    <div
      className={cn(
        'z-50 bg-background w-full desktop:h-dvh desktop:rounded-none desktop:rounded-l-2xl overflow-y-scroll absolute right-0 top-0 desktop:top-0 bottom-0 border-2 border-solid border-accent',
        'desktop:max-w-[calc(100%-540px)]',
        'transform transition-transform duration-300 ease-in-out',
        opened ? 'translate-x-0' : 'translate-x-full',

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
        <div className="z-40 p-4 h-[60px] sticky bg-background top-0 w-full flex flex-row justify-start items-center">
          <CloseButton
            className="bg-white animate-in spin-in"
            onClick={onClose}
          />
        </div>
        {/* <div className="-mt-[60px] w-full h-[180px] bg-gray-500"></div> */}
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
                  name={post?.author?.username}
                  picture={post.author?.picture}
                  creator={post.author?.creator}
                  text={dateformat(post?.date).format('MMM DD')}
                />
              </Link>
            )}
            <div className="mt-8">
              <h2 className="text-3xl font-medium">{post.title}</h2>
            </div>
            <div className="mt-6">
              <NormalizedText text={post.content} />
            </div>
            
            {/* "Logged on" attribution */}
            <div className="mt-12 mb-12">
              <p className="text-sm text-gray-500">
                entry logged on {post.createdAt ? `${dateformat(post.createdAt).format('MMMM DD, YYYY [at] h:mm A')} ${new Date(post.createdAt).toLocaleDateString('en-US', { timeZoneName: 'short' }).split(', ')[1]}` : (post.date ? `${dateformat(post.date).format('MMMM DD, YYYY [at] h:mm A')} ${new Date(post.date).toLocaleDateString('en-US', { timeZoneName: 'short' }).split(', ')[1]}` : 'unknown date')} by{' '}
                {post.author?.username ? (
                  <Link 
                    href={ROUTER.USERS.DETAIL(post.author.username)}
                    className="text-primary hover:underline"
                  >
                    {post.author.username}
                  </Link>
                ) : (
                  'unknown'
                )}
              </p>
            </div>
            
            {post?.media && (
              <div className="mt-6 grid grid-cols-2 gap-2">
                {post.media?.map((media, key) => (
                  <div
                    key={key}
                    className="w-full h-auto overflow-hidden rounded-xl"
                  >
                    <Image
                      src={media?.thumbnail}
                      width={400}
                      height={300}
                      className="w-full h-auto"
                      alt=""
                    />
                  </div>
                ))}
              </div>
            )}
            <div className="mt-6">
              <PostButtons
                postId={post.id}
                liked={post.liked}
                likesCount={post.likesCount}
                bookmarked={post.bookmarked}
                bookmarksCount={post.bookmarksCount}
              />
            </div>
          </div>
        ) : (
          <>entry not found</>
        )}
      </div>
    </div>
  );
};

export const MapSidebar: React.FC<{
  children?: React.ReactNode;
  className?: string;
  opened?: boolean;
  view?: string;
}> = ({ children, className, opened = false, view = MAP_VIEW_PARAMS.MAP }) => {
  return (
    <div
      className={cn(
        'relative w-full flex flex-col justify-start items-start h-dvh bg-background overflow-hidden',
        opened
          ? `w-full desktop:min-w-[540px] desktop:max-w-[540px]`
          : 'desktop:max-w-[0px]',
        view === MAP_VIEW_PARAMS.LIST
          ? 'z-30 absolute pb-[70px] flex desktop:pb-[0px] desktop:relative desktop:flex desktop:inset-auto'
          : 'hidden desktop:relative desktop:flex',
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

export const MapViewSwitch: React.FC<{
  view?: string;
  onToggle?: () => void;
}> = ({ view = MAP_VIEW_PARAMS.MAP, onToggle }) => {
  return (
    <div className="z-40 absolute left-0 right-0 bottom-5 flex desktop:hidden flex-row justify-center items-center">
      {view === MAP_VIEW_PARAMS.LIST && (
        <Button onClick={onToggle}>
          <div className="flex flex-row gap-2 items-center justify-center">
            <MapTrifoldIcon size={18} />
            <span>Map</span>
          </div>
        </Button>
      )}
      {view === MAP_VIEW_PARAMS.MAP && (
        <Button onClick={onToggle}>
          <div className="flex flex-row gap-2 items-center justify-center">
            <ListBulletsIcon size={18} />
            <span>List</span>
          </div>
        </Button>
      )}
    </div>
  );
};
