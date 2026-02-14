import { Bell, User, DollarSign, MessageSquare, FileText, Map, MapPin, Clock, Trash2, Flag, Globe, Award, EyeOff } from "lucide-react";
import { UserNotificationContext } from "@repo/types";

type NotificationType = `${UserNotificationContext}`;

interface NotificationCardProps {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  actor?: string;
  timestamp: string;
  isRead: boolean;
  metadata?: {
    amount?: number;
    entryTitle?: string;
    expeditionName?: string;
    viewCount?: number;
    commentCount?: number;
    postId?: string;
  };
  actions?: {
    primary?: {
      label: string;
      onClick: () => void;
    };
    secondary?: {
      label: string;
      onClick: () => void;
    };
  };
  onClick?: () => void;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function NotificationCard({
  id,
  type,
  title,
  message,
  timestamp,
  isRead,
  metadata,
  actions,
  onClick,
  isSelected,
  onSelect,
  onDelete,
}: NotificationCardProps) {
  // Icon based on notification type
  const getNotificationIcon = () => {
    switch (type) {
      case "follow":
        return <User className="w-4 h-4" />;
      case "sponsorship":
      case "sponsorship_milestone":
        return <DollarSign className="w-4 h-4" />;
      case "comment":
      case "comment_reply":
        return <MessageSquare className="w-4 h-4" />;
      case "entry_milestone":
        return <FileText className="w-4 h-4" />;
      case "expedition_started":
        return <Map className="w-4 h-4" />;
      case "expedition_completed":
        return <MapPin className="w-4 h-4" />;
      case "expedition_off_grid":
        return <EyeOff className="w-4 h-4" />;
      case "passport_country":
        return <Flag className="w-4 h-4" />;
      case "passport_continent":
        return <Globe className="w-4 h-4" />;
      case "passport_stamp":
        return <Award className="w-4 h-4" />;
      case "system":
        return <Bell className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  // Status indicator color based on type
  const getStatusColor = () => {
    switch (type) {
      case "sponsorship":
      case "sponsorship_milestone":
      case "expedition_off_grid":
      case "passport_country":
      case "passport_continent":
      case "passport_stamp":
        return "bg-[#ac6d46]"; // Copper
      case "follow":
      case "comment":
      case "comment_reply":
        return "bg-[#4676ac]"; // Blue
      default:
        return "bg-[#616161]"; // Gray
    }
  };

  // Type label
  const getNotificationLabel = () => {
    switch (type) {
      case "follow":
        return "NEW FOLLOWER";
      case "sponsorship":
        return "SPONSORSHIP";
      case "sponsorship_milestone":
        return "FUNDING MILESTONE";
      case "comment":
        return "NEW NOTE";
      case "comment_reply":
        return "NOTE REPLY";
      case "entry_milestone":
        return "ENTRY MILESTONE";
      case "expedition_started":
        return "EXPEDITION STARTED";
      case "expedition_completed":
        return "EXPEDITION COMPLETE";
      case "expedition_off_grid":
        return "EXPEDITION STATUS";
      case "passport_country":
        return "COUNTRY VISITED";
      case "passport_continent":
        return "CONTINENT EXPLORED";
      case "passport_stamp":
        return "STAMP EARNED";
      case "system":
        return "SYSTEM";
      default:
        return "NOTIFICATION";
    }
  };

  // Determine if metadata should be shown (only for types that actually need it)
  const shouldShowMetadata = () => {
    if (!metadata) return false;

    switch (type) {
      case "sponsorship":
        return metadata.amount !== undefined;
      case "sponsorship_milestone":
        return metadata.amount !== undefined || metadata.expeditionName;
      case "entry_milestone":
        return metadata.viewCount !== undefined || metadata.commentCount !== undefined;
      default:
        return false;
    }
  };

  return (
    <div
      onClick={onClick}
      className={`border-2 ${
        isRead
          ? 'border-[#b5bcc4] dark:border-[#3a3a3a]'
          : 'border-[#202020] dark:border-[#616161]'
      } bg-white dark:bg-[#202020] cursor-pointer hover:border-[#4676ac] dark:hover:border-[#4676ac] transition-all active:scale-[0.995] ${
        isSelected ? 'ring-2 ring-[#4676ac] ring-offset-2' : ''
      }`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between border-b-2 ${
        isRead
          ? 'border-[#b5bcc4] dark:border-[#3a3a3a]'
          : 'border-[#202020] dark:border-[#616161]'
      } ${
        isRead
          ? 'bg-[#f5f5f5] dark:bg-[#2a2a2a]'
          : 'bg-[#b5bcc4] dark:bg-[#3a3a3a]'
      } px-4 py-2.5`}>
        <div className="flex items-center gap-2">
          {/* Checkbox */}
          {onSelect && (
            <input
              type="checkbox"
              checked={isSelected || false}
              onChange={(e) => {
                e.stopPropagation();
                onSelect(id);
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 cursor-pointer accent-[#ac6d46]"
            />
          )}
          <div className={`h-2.5 w-2.5 ${getStatusColor()}`} />
          <span className="text-xs font-mono font-semibold tracking-wide text-[#202020] dark:text-[#e5e5e5]">
            {getNotificationLabel()}
          </span>
          {!isRead && (
            <span className="px-1.5 py-0.5 bg-[#ac6d46] text-white text-xs font-bold">
              NEW
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
            <Clock className="w-3 h-3" />
            <span>{timestamp}</span>
          </div>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(id);
              }}
              className="p-1 text-[#616161] dark:text-[#b5bcc4] hover:text-[#ac6d46] transition-all active:scale-[0.95] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46]"
              title="Delete notification"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 bg-white dark:bg-[#202020]">
        <div className="flex items-start gap-3">
          <div className="text-[#616161] dark:text-[#b5bcc4] mt-0.5">
            {getNotificationIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-[#202020] dark:text-[#e5e5e5]">{title}</h3>
            {message && (
              <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed mt-1">
                {message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Metadata - only shown for specific notification types */}
      {shouldShowMetadata() && (
        <div className={`border-t-2 ${
          isRead
            ? 'border-[#b5bcc4] dark:border-[#3a3a3a]'
            : 'border-[#202020] dark:border-[#616161]'
        } bg-[#f5f5f5] dark:bg-[#2a2a2a] px-4 py-2.5`}>
          <div className="flex flex-wrap gap-4 text-xs font-mono">
            {metadata?.amount !== undefined && (
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-[#ac6d46]" />
                <span className="font-bold text-[#ac6d46]">${(metadata.amount / 100).toLocaleString()}</span>
              </div>
            )}
            {metadata?.viewCount !== undefined && (
              <div className="flex items-center gap-1.5">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Views:</span>
                <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">{metadata.viewCount.toLocaleString()}</span>
              </div>
            )}
            {metadata?.commentCount !== undefined && (
              <div className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#616161] dark:text-[#b5bcc4]" />
                <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">{metadata.commentCount}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {actions && (actions.primary || actions.secondary) && (
        <div className={`border-t-2 ${
          isRead
            ? 'border-[#b5bcc4] dark:border-[#3a3a3a]'
            : 'border-[#202020] dark:border-[#616161]'
        } bg-[#f5f5f5] dark:bg-[#1a1a1a] p-3`}>
          <div className="flex items-center justify-end gap-2">
            {actions.secondary && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  actions.secondary?.onClick();
                }}
                className="px-4 py-2 border-2 border-[#202020] dark:border-[#616161] hover:border-[#4676ac] dark:hover:border-[#4676ac] bg-white dark:bg-[#202020] text-[#202020] dark:text-[#e5e5e5] text-xs font-bold tracking-wide transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161]"
              >
                {actions.secondary.label}
              </button>
            )}
            {actions.primary && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  actions.primary?.onClick();
                }}
                className="px-4 py-2 border-2 border-[#4676ac] hover:border-[#365a87] bg-[#4676ac] hover:bg-[#365a87] text-white text-xs font-bold tracking-wide transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac]"
              >
                {actions.primary.label}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
