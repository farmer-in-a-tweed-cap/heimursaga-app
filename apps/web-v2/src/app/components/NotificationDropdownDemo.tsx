import { useState } from 'react';
import { Bell } from 'lucide-react';
import { NotificationCardCompact } from '@/app/components/NotificationCardCompact';
import { UserNotificationContext } from "@repo/types";

type NotificationType = `${UserNotificationContext}`;

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

export function NotificationDropdownDemo() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "notif-1",
      type: "sponsorship",
      title: "adventure_seeker_42 sponsored $250",
      message: "",
      timestamp: "12m",
      isRead: false
    },
    {
      id: "notif-2",
      type: "follow",
      title: "mountain_explorer_93 followed your journal",
      message: "",
      timestamp: "2h",
      isRead: false
    },
    {
      id: "notif-3",
      type: "comment",
      title: 'seasoned_traveler left a note on "Ice Cave Exploration"',
      message: '"Similar formations in Vatnajökull! Consider submitting to International Glaciological Society."',
      timestamp: "3d",
      isRead: false
    },
    {
      id: "notif-4",
      type: "entry_milestone",
      title: "Summit Day reached 1,000 views",
      message: "",
      timestamp: "5h",
      isRead: true
    },
    {
      id: "notif-5",
      type: "sponsorship_milestone",
      title: "Antarctic Research reached 75% funding",
      message: "",
      timestamp: "1d",
      isRead: true
    },
    {
      id: "notif-6",
      type: "expedition_completed",
      title: "Amazon River Traverse completed",
      message: "",
      timestamp: "1w",
      isRead: true
    },
    {
      id: "notif-7",
      type: "expedition_started",
      title: "Cycling the Silk Road started",
      message: "",
      timestamp: "2w",
      isRead: true
    }
  ]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, isRead: true } : notif
      )
    );
  };

  const handleNotificationClick = (_notification: Notification) => {
    // Close dropdown after navigation
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] rounded transition-colors"
      >
        <Bell className="w-5 h-5 text-[#616161] dark:text-[#b5bcc4]" />
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 bg-[#ac6d46] text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount}
          </div>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Content */}
          <div className="absolute right-0 mt-2 w-96 border-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020] shadow-lg z-20">
            {/* Dropdown Header */}
            <div className="border-b-2 border-[#202020] dark:border-[#616161] bg-[#b5bcc4] dark:bg-[#3a3a3a] px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#202020] dark:text-[#e5e5e5]">
                  NOTIFICATIONS
                </span>
                <span className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
                  {unreadCount} unread
                </span>
              </div>
            </div>

            {/* Notification List */}
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.map(notification => (
                <NotificationCardCompact
                  key={notification.id}
                  id={notification.id}
                  type={notification.type}
                  title={notification.title}
                  message={notification.message}
                  timestamp={notification.timestamp}
                  isRead={notification.isRead}
                  onClick={() => handleNotificationClick(notification)}
                  onMarkAsRead={handleMarkAsRead}
                />
              ))}
            </div>

            {/* Dropdown Footer */}
            <div className="border-t-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020] px-3 py-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                }}
                className="w-full text-xs font-bold text-[#4676ac] hover:text-[#ac6d46] transition-colors text-center"
              >
                VIEW ALL NOTIFICATIONS
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
