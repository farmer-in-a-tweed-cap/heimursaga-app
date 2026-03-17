import { Bell, User, DollarSign, MessageSquare, FileText, Map, MapPin, Clock, Flag, Globe, Award, EyeOff, AlertTriangle, CheckCircle, XCircle, Calendar } from "lucide-react";
import { UserNotificationContext } from "@repo/types";
import Link from "next/link";
import { ReactNode } from "react";

type NotificationType = `${UserNotificationContext}`;

interface NotificationCardProps {
  type: NotificationType;
  title: ReactNode;
  message: ReactNode;
  timestamp: string;
  isRead: boolean;
  metadata?: {
    amount?: number;
    entryTitle?: string;
    expeditionName?: string;
    viewCount?: number;
    commentCount?: number;
    postId?: string;
    sponsorshipType?: string;
  };
  sourceLink?: { type: 'entry' | 'expedition'; id: string; title: string };
  shareAction?: () => void;
}

export function NotificationCard({
  type,
  title,
  message,
  timestamp,
  isRead,
  metadata,
  sourceLink,
  shareAction,
}: NotificationCardProps) {
  // Icon based on notification type
  const getNotificationIcon = () => {
    switch (type) {
      case "follow":
        return <User className="w-4 h-4" />;
      case "sponsorship":
      case "quick_sponsor":
      case "sponsorship_milestone":
        return <DollarSign className="w-4 h-4" />;
      case "comment":
      case "comment_reply":
      case "expedition_note_created":
      case "expedition_note_reply":
        return <MessageSquare className="w-4 h-4" />;
      case "entry_milestone":
      case "new_entry":
        return <FileText className="w-4 h-4" />;
      case "expedition_started":
      case "new_expedition":
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
      case "expedition_cancelled":
        return <XCircle className="w-4 h-4" />;
      case "expedition_date_changed":
        return <Calendar className="w-4 h-4" />;
      case "stripe_action_required":
        return <AlertTriangle className="w-4 h-4" />;
      case "stripe_verified":
        return <CheckCircle className="w-4 h-4" />;
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
      case "quick_sponsor":
      case "sponsorship_milestone":
      case "expedition_off_grid":
      case "passport_country":
      case "passport_continent":
      case "passport_stamp":
        return "bg-[#ac6d46]"; // Copper
      case "follow":
      case "comment":
      case "comment_reply":
      case "expedition_note_created":
      case "expedition_note_reply":
      case "new_entry":
      case "new_expedition":
        return "bg-[#4676ac]"; // Blue
      case "expedition_cancelled":
        return "bg-[#994040]"; // Burgundy
      case "expedition_date_changed":
        return "bg-[#4676ac]"; // Blue
      case "stripe_action_required":
        return "bg-amber-500"; // Amber
      case "stripe_verified":
        return "bg-emerald-500"; // Green
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
      case "quick_sponsor":
        return "SPONSORSHIP";
      case "sponsorship_milestone":
        return "FUNDING MILESTONE";
      case "comment":
        return "NEW NOTE";
      case "comment_reply":
        return "NOTE REPLY";
      case "expedition_note_created":
        return "EXPEDITION NOTE LOGGED";
      case "expedition_note_reply":
        return "NOTE REPLY";
      case "entry_milestone":
        return "ENTRY MILESTONE";
      case "new_entry":
        return "NEW ENTRY";
      case "expedition_started":
      case "new_expedition":
        return "NEW EXPEDITION";
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
      case "expedition_cancelled":
        return "EXPEDITION CANCELLED";
      case "expedition_date_changed":
        return "DATE CHANGED";
      case "stripe_action_required":
        return "ACTION REQUIRED";
      case "stripe_verified":
        return "VERIFIED";
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
      className={`border-2 ${
        isRead
          ? 'border-[#b5bcc4] dark:border-[#3a3a3a]'
          : 'border-[#202020] dark:border-[#616161]'
      } bg-white dark:bg-[#202020]`}
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
        <div className="flex items-center gap-1.5 text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
          <Clock className="w-3 h-3" />
          <span>{timestamp}</span>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 bg-white dark:bg-[#202020]">
        <div className="flex items-start gap-3">
          <div className="text-[#616161] dark:text-[#b5bcc4] mt-0.5">
            {getNotificationIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm text-[#202020] dark:text-[#e5e5e5]">{title}</h3>
              {metadata?.sponsorshipType && (
                <span className={`px-1.5 py-0.5 text-[10px] font-bold text-white ${
                  metadata.sponsorshipType === 'quick_sponsor' ? 'bg-[#ac6d46]'
                    : metadata.sponsorshipType === 'subscription' ? 'bg-[#4676ac]'
                    : 'bg-[#616161]'
                }`}>
                  {metadata.sponsorshipType === 'quick_sponsor' ? 'QUICK-SPONSOR'
                    : metadata.sponsorshipType === 'subscription' ? 'RECURRING'
                    : 'ONE-TIME'}
                </span>
              )}
            </div>
            {message && (
              <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed mt-1">
                {message}
              </p>
            )}
            {/* Source link */}
            {sourceLink && (
              <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-2 font-mono">
                <span className="font-bold">{sourceLink.type === 'entry' ? 'ENTRY' : 'EXPEDITION'}:</span>{' '}
                <Link
                  href={sourceLink.type === 'entry' ? `/entry/${sourceLink.id}` : `/expedition/${sourceLink.id}`}
                  className="text-[#4676ac] hover:underline font-bold"
                >
                  {sourceLink.title}
                </Link>
                {shareAction && (
                  <>
                    {' · '}
                    <button
                      onClick={shareAction}
                      className="text-[#ac6d46] hover:underline font-bold"
                    >
                      SHARE
                    </button>
                  </>
                )}
              </p>
            )}
            {/* Share action without source link (passport types) */}
            {shareAction && !sourceLink && (
              <p className="text-xs mt-2 font-mono">
                <button
                  onClick={shareAction}
                  className="text-[#ac6d46] hover:underline font-bold"
                >
                  SHARE
                </button>
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
    </div>
  );
}
