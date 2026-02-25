import { ExplorerAvatar } from "@/app/components/ExplorerAvatar";
import { MapPin, FileText, Map, Bookmark } from "lucide-react";

interface ExplorerCardLandscapeProps {
  id: string;
  username: string;
  journalName: string;
  avatarUrl: string;
  location: string;
  accountType: "explorer" | "explorer-pro";
  activeExpeditions: number;
  totalEntries: number;
  onClick?: () => void;
  onUnbookmark?: () => void;
}

export function ExplorerCardLandscape({
  username,
  journalName,
  avatarUrl,
  location,
  accountType,
  activeExpeditions,
  totalEntries,
  onClick,
  onUnbookmark,
}: ExplorerCardLandscapeProps) {
  return (
    <div
      onClick={onClick}
      className="border-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020] cursor-pointer hover:border-[#ac6d46] transition-all active:scale-[0.99]"
    >
      {/* Full-width header banner */}
      <div className="flex items-center justify-between border-b-2 border-[#202020] dark:border-[#616161] bg-[#b5bcc4] dark:bg-[#3a3a3a] px-3 py-1.5">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 ${accountType === 'explorer-pro' ? 'bg-[#ac6d46]' : 'bg-[#4676ac]'}`} />
          <span className="text-xs font-mono font-semibold tracking-wide text-[#202020] dark:text-[#e5e5e5]">
            {accountType === 'explorer-pro' ? 'EXPLORER PRO' : 'EXPLORER'}
          </span>
        </div>
      </div>

      <div className="flex">
        {/* Avatar */}
        <div className={`w-32 h-32 flex-shrink-0 border-r-2 border-[#202020] dark:border-[#616161] ${accountType === 'explorer-pro' ? 'border-l-4 border-l-[#ac6d46]' : ''} bg-[#b5bcc4] overflow-hidden`}>
          <ExplorerAvatar username={username} src={avatarUrl} size={128} className="w-full h-full" />
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          {/* Info */}
          <div className="px-3 py-2 flex-1 border-b-2 border-[#202020] dark:border-[#616161]">
            <h3 className="font-bold text-sm dark:text-[#e5e5e5] mb-1">{username}</h3>
            <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-1.5 truncate">{journalName}</p>
            <div className="flex items-center gap-1.5 text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{location}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] px-3 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 font-mono text-xs">
                <div className="flex items-center gap-1">
                  <Map className="w-3 h-3 text-[#616161] dark:text-[#b5bcc4]" />
                  <span className="text-[#ac6d46] font-bold">{activeExpeditions}</span>
                  <span className="text-[#616161] dark:text-[#b5bcc4]">expeditions</span>
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="w-3 h-3 text-[#616161] dark:text-[#b5bcc4]" />
                  <span className="dark:text-[#e5e5e5] font-bold">{totalEntries}</span>
                  <span className="text-[#616161] dark:text-[#b5bcc4]">entries</span>
                </div>
              </div>
              {onUnbookmark && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnbookmark();
                  }}
                  className="flex-shrink-0 px-3 py-1.5 bg-[#ac6d46] text-white text-xs font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] flex items-center gap-1.5"
                  title="Remove bookmark"
                >
                  <Bookmark className="w-3 h-3" fill="currentColor" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
