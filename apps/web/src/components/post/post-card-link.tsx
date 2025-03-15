import Link from 'next/link';

import { PostCard, PostCardProps } from './post-card';

type Props = PostCardProps & {
  href: string;
  target?: '_blank' | string;
};

export const PostCardLink: React.FC<Props> = ({ href, target, ...props }) => {
  return (
    <Link href={href} target={target}>
      <PostCard {...props} />
    </Link>
  );
};
