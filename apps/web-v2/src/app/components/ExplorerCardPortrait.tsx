import { MapPin, FileText } from "lucide-react";

interface ExplorerCardPortraitProps {
  id: string;
  username: string;
  journalName: string;
  avatarUrl: string;
  location: string;
  accountType: "explorer" | "explorer-pro";
  activeExpeditions: number;
  totalEntries: number;
  totalViews: number;
  onClick?: () => void;
}

export function ExplorerCardPortrait({
  username,
  journalName,
  avatarUrl,
  location,
  accountType,
  activeExpeditions,
  totalEntries,
  totalViews,
  onClick,
}: ExplorerCardPortraitProps) {
  return (
    <div 
      onClick={onClick}
      className="border-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020] cursor-pointer hover:border-[#ac6d46] transition-all active:scale-[0.98]"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-[#202020] dark:border-[#616161] bg-[#b5bcc4] dark:bg-[#3a3a3a] px-3 py-2">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 ${accountType === 'explorer-pro' ? 'bg-[#ac6d46]' : 'bg-[#4676ac]'}`} />
          <span className="text-xs font-mono font-semibold tracking-wide text-[#202020] dark:text-[#e5e5e5]">
            {accountType === 'explorer-pro' ? 'EXPLORER PRO' : 'EXPLORER'}
          </span>
        </div>
      </div>

      {/* Avatar */}
      <div className="border-b-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020] pt-7 px-3 pb-7">
        <div className="flex flex-col items-center">
          <div className="w-32 h-32 border-2 border-[#ac6d46] overflow-hidden bg-[#b5bcc4]">
            <img 
              src={avatarUrl}
              alt={username}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="border-b-2 border-[#202020] bg-[#f5f5f5] dark:border-[#616161] px-3 py-3 dark:bg-[#2a2a2a]">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-bold text-sm dark:text-[#e5e5e5] truncate">{username}</h3>
          {accountType === 'explorer-pro' && (
            <span className="px-2 py-0.5 bg-[#ac6d46] text-white text-xs font-bold rounded-full whitespace-nowrap">
              EXPLORER PRO
            </span>
          )}
        </div>
        <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-2 truncate">{journalName}</p>
        <div className="flex items-center gap-1.5 text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{location}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="dark:bg-[#202020] px-3 py-3">
        <div className="grid grid-cols-3 gap-2 font-mono text-xs">
          <div className="text-center">
            <div className="text-[#616161] dark:text-[#b5bcc4] mb-0.5">Expeditions</div>
            <div className="font-bold text-xs text-[#ac6d46]">{activeExpeditions}</div>
          </div>
          <div className="text-center border-l border-r border-[#202020] dark:border-[#616161]">
            <div className="text-[#616161] dark:text-[#b5bcc4] mb-0.5">Entries</div>
            <div className="font-bold text-xs dark:text-[#e5e5e5]">{totalEntries}</div>
          </div>
          <div className="text-center">
            <div className="text-[#616161] dark:text-[#b5bcc4] mb-0.5">Views</div>
            <div className="font-bold text-xs text-[#4676ac]">{totalViews.toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}