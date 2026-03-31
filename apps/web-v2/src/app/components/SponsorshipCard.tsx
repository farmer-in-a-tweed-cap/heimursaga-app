import { useState } from "react";
import { Progress } from "@/app/components/ui/progress";
import { RadialProgress } from "@/app/components/ui/radial-progress";
import { formatDate } from "@/app/utils/dateFormat";

interface SponsorshipCardProps {
  expeditionId: string;
  title: string;
  explorer: string;
  journal: string;
  category: string;
  fundingGoal: number;
  fundingCurrent: number;
  fundingPercentage: number;
  sponsors: number;
  daysLeft: number | null;
  daysActive: number;
  entriesCount: number;
  status: "active" | "completed" | "preparing";
  onViewExpedition?: () => void;
  onSponsor?: () => void;
  onMessage?: () => void;
  showMessageButton?: boolean;
}

export function SponsorshipCard({
  expeditionId,
  title,
  explorer,
  journal,
  category,
  fundingGoal,
  fundingCurrent,
  fundingPercentage,
  sponsors,
  daysLeft,
  daysActive,
  entriesCount,
  status,
  onViewExpedition,
  onMessage,
  showMessageButton,
}: SponsorshipCardProps) {
  const statusColors = {
    active: "bg-[#ac6d46]",
    completed: "bg-[#4676ac]",
    preparing: "bg-[#b5bcc4]",
  };

  const statusLabels = {
    active: "ACTIVE",
    completed: "COMPLETED",
    preparing: "PREPARING",
  };

  const totalDays = daysActive + (daysLeft || 0);
  const timelinePercentage = totalDays > 0 ? (daysActive / totalDays) * 100 : 0;

  const [now] = useState(() => Date.now());
  const startDate = formatDate(new Date(now - daysActive * 24 * 60 * 60 * 1000));
  const endDate = daysLeft !== null ? formatDate(new Date(now + daysLeft * 24 * 60 * 60 * 1000)) : null;

  return (
    <div className="border-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020] flex flex-col overflow-hidden">
      {/* Header: Status Bar */}
      <div className="flex items-center justify-between border-b-2 border-[#202020] dark:border-[#616161] bg-[#b5bcc4] dark:bg-[#3a3a3a] px-4 py-2">
        <div className="flex items-center gap-2">
          <div className={`h-2.5 w-2.5 ${statusColors[status]}`} />
          <span className="text-xs font-mono font-semibold tracking-wide text-[#202020] dark:text-[#e5e5e5]">
            {statusLabels[status]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-white bg-[#616161] px-2 py-0.5">
            {category.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Section: Title & Metadata */}
      <div className="border-b-2 border-[#202020] dark:border-[#616161] px-4 py-4 bg-white dark:bg-[#202020]">
        <h3 className="font-bold leading-tight dark:text-[#e5e5e5] mb-2">{title}</h3>
        <div className="space-y-1 text-xs font-mono">
          <div className="text-[#616161] dark:text-[#b5bcc4]">
            Explorer: <span className="text-[#202020] dark:text-[#e5e5e5]">{explorer}</span>
          </div>
          <div className="text-[#616161] dark:text-[#b5bcc4]">
            Journal: <span className="text-[#202020] dark:text-[#e5e5e5]">{journal}</span>
          </div>
          <div className="text-[#ac6d46]">
            ID: {expeditionId}
          </div>
        </div>
      </div>

      {/* Section: Funding — Raised → [ring] → Goal */}
      <div className="border-b-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020] px-4 py-3 flex flex-col justify-center">
        <div className="flex items-center gap-3 mb-1 w-full">
          <div className="flex-1 font-mono">
            <div className={`text-base font-bold ${
              fundingPercentage >= 100 ? 'text-[#616161] dark:text-[#b5bcc4]' : 'dark:text-[#e5e5e5]'
            }`}>
              ${(fundingCurrent || 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-[#616161] dark:text-[#b5bcc4] mt-0.5">Raised</div>
          </div>
          <div className="shrink-0">
            <RadialProgress
              value={Math.min(fundingPercentage || 0, 100)}
              size={56}
              strokeWidth={8}
              color={fundingPercentage >= 100 ? '#616161' : '#ac6d46'}
              centerContent={
                <div className={`text-xs font-bold font-mono ${
                  fundingPercentage >= 100 ? 'text-[#616161] dark:text-[#b5bcc4]' : 'text-[#ac6d46]'
                }`}>
                  {(fundingPercentage || 0).toFixed(0)}%
                </div>
              }
            />
          </div>
          <div className="flex-1 font-mono text-right">
            <div className={`text-base font-bold ${
              fundingPercentage >= 100 ? 'text-[#616161] dark:text-[#b5bcc4]' : 'dark:text-[#e5e5e5]'
            }`}>
              {fundingGoal ? `$${fundingGoal.toLocaleString()}` : 'None'}
            </div>
            <div className="text-[10px] text-[#616161] dark:text-[#b5bcc4] mt-0.5">Goal</div>
          </div>
        </div>
        <div className="text-center">
          <span className="text-[10px] font-mono font-semibold tracking-wider text-[#616161] dark:text-[#b5bcc4]">
            {fundingPercentage >= 100 ? 'FUNDING COMPLETE' : 'FUNDED'}
          </span>
        </div>
      </div>

      {/* Section: Key Stats with Timeline Progress */}
      <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] px-4 py-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 font-mono text-xs mb-4">
          <div>
            <div className="text-[#616161] dark:text-[#b5bcc4] mb-0.5">Sponsors:</div>
            <div className="font-bold text-sm dark:text-[#e5e5e5]">{sponsors}</div>
          </div>
          <div>
            <div className="text-[#616161] dark:text-[#b5bcc4] mb-0.5">Entries:</div>
            <div className="font-bold text-sm dark:text-[#e5e5e5]">{entriesCount}</div>
          </div>
          <div>
            <div className="text-[#616161] dark:text-[#b5bcc4] mb-0.5">Days Active:</div>
            <div className="font-bold text-sm dark:text-[#e5e5e5]">{daysActive}</div>
          </div>
          <div>
            <div className="text-[#616161] dark:text-[#b5bcc4] mb-0.5">Days Left:</div>
            <div className="font-bold text-sm dark:text-[#e5e5e5]">
              {daysLeft !== null ? daysLeft : "∞"}
            </div>
          </div>
        </div>

        {/* Timeline — Start → [bar] → End */}
        <div className="flex items-center gap-3 mb-1.5">
          <div className="w-[5.5rem] shrink-0 font-mono text-xs font-bold dark:text-[#e5e5e5] text-right">
            {startDate || 'TBD'}
          </div>
          <div className="flex-1">
            <Progress value={timelinePercentage} indicatorColor="bg-[#4676ac]" className="h-2 w-full" />
          </div>
          <div className="w-[5.5rem] shrink-0 font-mono text-xs font-bold dark:text-[#e5e5e5]">
            {endDate !== null ? endDate : "Ongoing"}
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 font-mono text-[10px] text-[#616161] dark:text-[#b5bcc4]">
          <span>Active: <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">{daysActive}d</span></span>
          <span className="text-xs font-bold text-[#4676ac]">{Math.round(timelinePercentage)}%</span>
          <span>Left: <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">{daysLeft !== null ? `${daysLeft}d` : '∞'}</span></span>
        </div>
      </div>

      {/* Section: Actions */}
      <div className="border-t-2 border-[#202020] dark:border-[#616161] bg-[#f5f5f5] dark:bg-[#1a1a1a] p-3 mt-auto">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={onViewExpedition}
            className="px-4 py-2 text-xs font-bold bg-[#4676ac] text-white hover:bg-[#365a87] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] whitespace-nowrap"
          >
            VIEW DETAILS
          </button>
          {showMessageButton && (
            <button
              onClick={onMessage}
              className="px-4 py-2 text-xs font-bold bg-[#b5bcc4] dark:bg-[#3a3a3a] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#4a4a4a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] whitespace-nowrap"
            >
              MESSAGE
            </button>
          )}
        </div>
      </div>
    </div>
  );
}