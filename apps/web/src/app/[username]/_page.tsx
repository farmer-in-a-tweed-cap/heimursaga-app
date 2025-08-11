import { Metadata } from 'next';
import { cookies } from 'next/headers';

import { apiClient } from '@/lib/api';

// Ensure this page is always dynamically rendered and not cached
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { PageNotFound, UserProfilePage } from '@/components';
import { AppLayout } from '@/layouts';

export type Props = {
  params: {
    username: string;
    section?: string;
  };
};

export const generateMetadata = async ({
  params,
}: Props): Promise<Metadata> => {
  const { username } = await params;

  const user = await apiClient
    .getUserByUsername({ username })
    .then(({ data }) => data)
    .catch(() => null);

  if (!user) {
    return {
      title: 'User not found',
    };
  }

  const title = `${user.username}${user.bio ? ` - ${user.bio}` : ''}`;
  const description = user.bio 
    ? `${user.bio} • ${user.creator ? 'Creator' : 'Explorer'} on Heimursaga${user.locationLives ? ` • Currently in ${user.locationLives}` : ''}${user.locationFrom ? ` • From ${user.locationFrom}` : ''}`
    : `Follow ${user.username}'s journey on Heimursaga - an app for explorers. Share your stories. Raise money. Inspire the world.`;

  // Use user avatar or fallback to default image
  const ogImage = user.picture || '/og-image.jpg';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${process.env.NEXT_PUBLIC_APP_BASE_URL}/${username}`,
      type: 'profile',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${user.username}'s profile on Heimursaga`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      creator: `@${user.username}`,
      images: [ogImage],
    },
  };
};

export const Page = async ({ params }: Props) => {
  const cookie = cookies().toString();
  const { username, section } = params;

  const [userQuery] = await Promise.all([
    await apiClient.getUserByUsername({ username }, { cookie }),
  ]);

  return (
    <AppLayout secure={false}>
      {userQuery.success && userQuery.data ? (
        <UserProfilePage user={userQuery.data} section={section} />
      ) : (
        <PageNotFound />
      )}
    </AppLayout>
  );
};

export default Page;
