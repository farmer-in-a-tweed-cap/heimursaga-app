'use client';

import {
  Button,
  Card,
  CardContent,
} from '@repo/ui/components';
import { User, X, CheckCircle } from '@repo/ui/icons';
import Link from 'next/link';
import React, { useState, useEffect } from 'react';

import { ROUTER } from '@/router';

type Props = {
  hasBio: boolean;
  hasAvatar: boolean;
  dismissible?: boolean;
};

export const ProfileCompletionBanner: React.FC<Props> = ({
  hasBio,
  hasAvatar,
  dismissible = true,
}) => {
  const [dismissed, setDismissed] = useState(false);

  // Check localStorage for dismissed state
  useEffect(() => {
    const isDismissed = localStorage.getItem('profileCompletionBannerDismissed');
    if (isDismissed === 'true') {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('profileCompletionBannerDismissed', 'true');
  };

  // Don't show if profile is complete or dismissed
  if ((hasBio && hasAvatar) || dismissed) {
    return null;
  }

  const completionItems = [
    { label: 'Add profile picture', completed: hasAvatar },
    { label: 'Write your bio', completed: hasBio },
  ];

  const completedCount = completionItems.filter(item => item.completed).length;
  const totalCount = completionItems.length;
  const completionPercentage = Math.round((completedCount / totalCount) * 100);

  return (
    <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" weight="bold" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 mb-1">
                Complete your profile
              </h4>
              <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-3">
                Make a great first impression! Complete your explorer profile to help others connect with you.
              </p>

              {/* Completion checklist */}
              <div className="mb-4 space-y-2">
                {completionItems.map((item, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <CheckCircle
                      className={`w-4 h-4 ${
                        item.completed
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-gray-400 dark:text-gray-600'
                      }`}
                      weight={item.completed ? 'fill' : 'regular'}
                    />
                    <span
                      className={`text-sm ${
                        item.completed
                          ? 'text-emerald-700 dark:text-emerald-300 line-through'
                          : 'text-emerald-700 dark:text-emerald-300'
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                asChild
                className="bg-white dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900"
              >
                <Link href={ROUTER.USER.SETTINGS.HOME}>
                  Complete profile
                </Link>
              </Button>
            </div>
          </div>

          {dismissible && (
            <button
              onClick={handleDismiss}
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 p-1"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
