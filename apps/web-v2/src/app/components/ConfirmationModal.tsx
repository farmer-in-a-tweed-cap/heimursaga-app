import { type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  icon?: ReactNode;
  headerColor?: string;
  confirmLabel: string;
  confirmColor?: string;
  children: ReactNode;
  isLoading?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  icon,
  headerColor = 'bg-[#616161] dark:bg-[#3a3a3a]',
  confirmLabel,
  confirmColor = 'bg-[#ac6d46] text-white hover:bg-[#8a5738]',
  children,
  isLoading = false,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-[#202020]/60" onClick={onClose} />
      <div className="relative w-[90%] max-w-md bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
        <div className={`${headerColor} text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3`}>
          {icon}
          <h3 className="text-sm font-bold">{title}</h3>
        </div>
        <div className="p-6">
          {children}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all text-xs font-bold"
            >
              CANCEL
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`flex-1 px-4 py-2.5 ${confirmColor} transition-all text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2`}
            >
              {isLoading && <Loader2 size={14} className="animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
