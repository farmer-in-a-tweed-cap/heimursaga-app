'use client';

import { Badge, Button, DialogHeader, DialogTitle, DialogDescription } from '@repo/ui/components';
import { IUserDetail } from '@repo/types';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { apiClient } from '@/lib/api';
import { dateformat } from '@/lib';
import { ROUTER } from '@/router';
import { UserAvatar } from '@/components/user';
import { ModalComponent } from './modal-registry';

export interface AdminUserPreviewModalProps {
  user: IUserDetail;
}

const AdminUserPreviewModal: ModalComponent<AdminUserPreviewModalProps> = ({
  props,
  close,
}) => {
  const user = props?.user;

  if (!user) {
    return (
      <>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>User Not Found</DialogTitle>
            <Button variant="ghost" size="sm" onClick={close}>
              ×
            </Button>
          </div>
          <DialogDescription>User data not provided.</DialogDescription>
        </DialogHeader>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <div className="flex items-center justify-between">
          <DialogTitle>User Preview</DialogTitle>
          <Button variant="ghost" size="sm" onClick={close}>
            ×
          </Button>
        </div>
        <DialogDescription>Admin preview of user profile and account details.</DialogDescription>
      </DialogHeader>
      <div className="space-y-6 p-4 max-h-[80vh] overflow-y-auto">
          {/* Profile Header */}
          <div className="flex items-start gap-4">
            <UserAvatar
              className="w-16 h-16"
              src={user.picture || undefined}
              fallback={user.username}
            />
            <div className="flex-1">
              <h3 className="text-xl font-bold">{user.username}</h3>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">{user.role}</Badge>
                {(user as any).blocked && (
                  <Badge variant="destructive">Blocked</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold">{(user as any).postsCount || 0}</div>
              <div className="text-sm text-gray-600">Entries</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{(user as any).followersCount || 0}</div>
              <div className="text-sm text-gray-600">Followers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{(user as any).followingCount || 0}</div>
              <div className="text-sm text-gray-600">Following</div>
            </div>
          </div>

          {/* Bio */}
          {user.bio && (
            <div>
              <label className="text-sm font-medium text-gray-600">Bio</label>
              <div className="mt-2 p-3 bg-gray-50 rounded">
                <p className="text-sm">{user.bio}</p>
              </div>
            </div>
          )}

          {/* Contact Info */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Email</label>
              <div className="mt-1">
                <span className="text-sm text-gray-500 italic">Not available in current API response</span>
              </div>
            </div>

            {(user as any).website && (
              <div>
                <label className="text-sm font-medium text-gray-600">Website</label>
                <div className="mt-1">
                  <a
                    href={(user as any).website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline text-sm"
                  >
                    {(user as any).website}
                  </a>
                </div>
              </div>
            )}

            {user.memberDate && (
              <div>
                <label className="text-sm font-medium text-gray-600">Member Since</label>
                <div className="mt-1">
                  <span className="text-sm">
                    {dateformat(user.memberDate).format('MMM DD, YYYY')}
                  </span>
                </div>
              </div>
            )}

            {(user.locationFrom || user.locationLives) && (
              <div>
                <label className="text-sm font-medium text-gray-600">Location</label>
                <div className="mt-1">
                  <span className="text-sm">
                    {user.locationFrom && `From: ${user.locationFrom}`}
                    {user.locationFrom && user.locationLives && ' | '}
                    {user.locationLives && `Lives: ${user.locationLives}`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Sponsorship Info */}
          {user.sponsorsFund && (
            <div>
              <label className="text-sm font-medium text-gray-600">Sponsorship</label>
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Sponsors Fund</span>
                  <span className="text-sm font-medium">{user.sponsorsFund}</span>
                </div>
                {user.sponsorsFundType && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Fund Type</span>
                    <span className="text-sm font-medium">{user.sponsorsFundType}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Link
              href={ROUTER.USERS.DETAIL(user.username)}
              target="_blank"
            >
              <Button variant="outline" size="sm">
                View Full Profile
              </Button>
            </Link>
          </div>
        </div>
      </>
    );
};

export default AdminUserPreviewModal;