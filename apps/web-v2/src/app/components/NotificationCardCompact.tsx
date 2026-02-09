import { User, DollarSign, MessageSquare, FileText, Map, MapPin, Bell, Flag, Globe, Award } from "lucide-react";
import { UserNotificationContext } from "@repo/types";

type NotificationType = `${UserNotificationContext}`;

interface NotificationCardCompactProps {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  onClick?: () => void;
  onMarkAsRead?: (id: string) => void;
}

export function NotificationCardCompact({
  id,
  type,
  title,
  message,
  timestamp,
  isRead,
  onClick,
  onMarkAsRead,
}: NotificationCardCompactProps) {
  // Icon based on notification type
  const getNotificationIcon = () => {
    switch (type) {
      case "follow":
        return <User className="w-3.5 h-3.5" />;
      case "sponsorship":
      case "sponsorship_milestone":
        return <DollarSign className="w-3.5 h-3.5" />;
      case "comment":
      case "comment_reply":
        return <MessageSquare className="w-3.5 h-3.5" />;
      case "entry_milestone":
        return <FileText className="w-3.5 h-3.5" />;
      case "expedition_started":
        return <Map className="w-3.5 h-3.5" />;
      case "expedition_completed":
        return <MapPin className="w-3.5 h-3.5" />;
      case "passport_country":
        return <Flag className="w-3.5 h-3.5" />;
      case "passport_continent":
        return <Globe className="w-3.5 h-3.5" />;
      case "passport_stamp":
        return <Award className="w-3.5 h-3.5" />;
      case "system":
        return <Bell className="w-3.5 h-3.5" />;
      default:
        return <Bell className="w-3.5 h-3.5" />;
    }
  };

  const getNotificationColor = () => {
    switch (type) {
      case "sponsorship":
      case "sponsorship_milestone":
        return "text-[#ac6d46]";
      case "follow":
      case "comment":
      case "comment_reply":
        return "text-[#4676ac]";
      case "expedition_started":
      case "expedition_completed":
        return "text-[#616161] dark:text-[#b5bcc4]";
      case "passport_country":
      case "passport_continent":
      case "passport_stamp":
        return "text-[#ac6d46]";
      default:
        return "text-[#616161] dark:text-[#b5bcc4]";
    }
  };

  const handleClick = () => {
    // Mark notification as read if it's unread
    if (!isRead && onMarkAsRead) {
      onMarkAsRead(id);
    }

    // Navigate to content
    if (onClick) {
      onClick();
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`border-2 ${
        isRead
          ? 'border-[#b5bcc4] dark:border-[#3a3a3a] bg-white dark:bg-[#202020]'
          : 'border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020]'
      } px-3 py-2.5 cursor-pointer hover:border-[#4676ac] dark:hover:border-[#4676ac] transition-all active:scale-[0.98]`}
    >
      {/* Header with Icon and Timestamp */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2">
          <div className={getNotificationColor()}>
            {getNotificationIcon()}
          </div>
          <h4 className="text-xs font-bold text-[#202020] dark:text-[#e5e5e5] line-clamp-1">{title}</h4>
          {!isRead && (
            <div className="h-1.5 w-1.5 bg-[#ac6d46] rounded-full flex-shrink-0" />
          )}
        </div>
        <span className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4] flex-shrink-0">
          {timestamp}
        </span>
      </div>

      {/* Message - only show if there's content */}
      {message && (
        <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed line-clamp-2">
          {message}
        </p>
      )}
    </div>
  );
}
