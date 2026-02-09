import { useState } from "react";
import { FileText, DollarSign, Clock, MessageSquare } from "lucide-react";
import { Progress } from "@/app/components/ui/progress";
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

      {/* Section: Funding Progress */}
      <div className="border-b-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020] px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-[#202020] dark:text-[#e5e5e5]" />
            <span className="text-xs font-semibold font-mono dark:text-[#e5e5e5]">FUNDING PROGRESS</span>
          </div>
          <span className="font-mono text-sm font-bold text-[#ac6d46]">
            {fundingPercentage.toFixed(1)}%
          </span>
        </div>
        <Progress value={fundingPercentage} className="mb-3 h-2.5" />
        <div className="flex items-center justify-between font-mono text-xs">
          <div className="text-[#616161] dark:text-[#b5bcc4]">
            ${fundingCurrent.toLocaleString()} raised
          </div>
          <div className="text-[#616161] dark:text-[#b5bcc4]">
            ${fundingGoal.toLocaleString()} goal
          </div>
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

        {/* Timeline Progress */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#202020] dark:text-[#e5e5e5]" />
              <span className="text-xs font-semibold font-mono dark:text-[#e5e5e5]">TIMELINE PROGRESS</span>
            </div>
            <span className="font-mono text-sm font-bold text-[#4676ac]">
              {Math.round(timelinePercentage)}%
            </span>
          </div>
          <Progress 
            value={timelinePercentage} 
            className="mb-3 h-2.5"
            indicatorColor="bg-[#4676ac]"
          />
          <div className="flex items-center justify-between font-mono text-xs">
            <div className="text-[#616161] dark:text-[#b5bcc4]">
              Start: {startDate}
            </div>
            <div className="text-[#616161] dark:text-[#b5bcc4]">
              {endDate !== null ? `End: ${endDate}` : "Ongoing"}
            </div>
          </div>
        </div>
      </div>

      {/* Section: Actions */}
      <div className="border-t-2 border-[#202020] dark:border-[#616161] bg-[#f5f5f5] dark:bg-[#1a1a1a] p-3 mt-auto">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={onViewExpedition}
            className="px-4 py-2 text-xs font-bold bg-[#4676ac] text-white hover:bg-[#365a87] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] whitespace-nowrap"
          >
            <div className="flex items-center justify-center gap-2">
              <FileText className="h-4 w-4" />
              <span>VIEW DETAILS</span>
            </div>
          </button>
          {showMessageButton && (
            <button
              onClick={onMessage}
              className="px-4 py-2 text-xs font-bold bg-[#b5bcc4] dark:bg-[#3a3a3a] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#4a4a4a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] whitespace-nowrap"
            >
              <div className="flex items-center justify-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span>MESSAGE</span>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}