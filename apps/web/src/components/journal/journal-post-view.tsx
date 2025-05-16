'use client';

import { ActionMenu } from '../menu';
import { DataTable, DataTableColumn, DataTableRow } from '@repo/ui/components';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { QUERY_KEYS, apiClient } from '@/lib/api';

import { useSession } from '@/hooks';
import { dateformat } from '@/lib';
import { ROUTER } from '@/router';

type PostInsightTableData = {
  postId: string;
  title: string;
  likesCount: number;
  bookmarksCount: number;
  createdAt?: Date;
};

export const JournalPostView = () => {
  const router = useRouter();
  const session = useSession();

  const postInsightQuery = useQuery({
    queryKey: [QUERY_KEYS.INSIGHTS.POST],
    queryFn: () => apiClient.getPostInsights().then(({ data }) => data),
    enabled: !!session?.username,
    retry: 0,
  });

  const posts = postInsightQuery.data?.posts || [];

  const handleEdit = (postId: string) => {
    if (!postId) return;
    router.push(ROUTER.POSTS.EDIT(postId));
  };

  const handleDelete = (postId: string) => {
    if (!postId) return;
    confirm('do you want to delete this post?');
  };

  const columns: DataTableColumn<PostInsightTableData>[] = [
    {
      accessorKey: 'title',
      header: () => 'Post',

      cell: ({ row }) => {
        const postId = row.original.postId;
        const title = row.getValue('title') as string;
        return (
          <Link
            href={postId ? ROUTER.POSTS.EDIT(postId) : '#'}
            className="font-medium underline"
          >
            {title}
          </Link>
        );
      },
    },
    {
      accessorKey: 'likesCount',
      header: () => 'Highlights',
    },
    {
      accessorKey: 'bookmarksCount',
      header: () => 'Bookmarks',
    },
    {
      accessorKey: 'date',
      header: () => 'Date',
      cell: ({ row }) =>
        dateformat(row.getValue('createdAt')).format('MMM DD, YYYY'),
    },
    {
      accessorKey: 'menu',
      header: () => '',
      cell: ({ row }) => {
        const postId = row.original.postId;
        return (
          <div className="w-full flex flex-row justify-end">
            <ActionMenu
              actions={[
                {
                  label: 'Edit',
                  onClick: () => handleEdit(postId),
                },
                {
                  label: 'Delete',
                  onClick: () => handleDelete(postId),
                },
              ]}
            />
          </div>
        );
      },
    },
  ];

  const rows: DataTableRow<PostInsightTableData>[] = posts.map(
    ({ id, title, likesCount, bookmarksCount, createdAt }) => ({
      id: id,
      postId: id,
      title,
      likesCount,
      bookmarksCount,
      createdAt,
    }),
  );

  return (
    <div className="flex flex-col">
      <DataTable
        columns={columns}
        rows={rows}
        loading={postInsightQuery.isLoading}
        hidePagination={true}
      />
    </div>
  );
};
