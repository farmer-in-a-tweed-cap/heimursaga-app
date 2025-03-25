'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Spinner,
} from '@repo/ui/components';
import { cn } from '@repo/ui/lib/utils';
import { useRef, useState } from 'react';

type Props = {
  src?: string;
  fallback?: string;
  loading?: boolean;
  onChange?: (file: File) => void;
};

const ACCEPT_FILE_TYPES = 'image/*';
const MULTIPLE = false;

export const UserAvatarUploadPicker: React.FC<Props> = ({
  src = '',
  fallback = '',
  loading = false,
  onChange,
}) => {
  const [preview, setPreview] = useState<string | null>(src);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (!inputRef.current) return;
    inputRef.current.click();
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      if (e.target?.result && typeof e.target.result === 'string') {
        setPreview(e.target.result);
      }
    };
    reader.readAsDataURL(file);

    if (onChange) {
      onChange(file);
    }
  };

  return (
    <div>
      <form>
        <input
          type="file"
          ref={inputRef}
          onChange={handleChange}
          accept={ACCEPT_FILE_TYPES}
          multiple={MULTIPLE}
          style={{ display: 'none' }}
        />
      </form>
      <div className="flex flex-col">
        <Avatar
          className={cn(
            'relative w-[75px] h-[75px]',
            loading ? 'pointer-events-auto' : '',
          )}
        >
          <div className="absolute inset-0 flex items-center justify-center text-black">
            {loading && (
              <>
                <div className="z-20 absolute inset-0 flex items-center justify-center cursor-wait">
                  <Spinner className="text-black" />
                </div>
                <div className="z-10 transition-all absolute inset-0 opacity-80 bg-white"></div>
              </>
            )}
          </div>
          <AvatarFallback>{fallback?.slice(0, 1)}</AvatarFallback>
          <AvatarImage src={preview || ''} alt="" />
        </Avatar>
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClick}
            disabled={loading}
          >
            Upload photo
          </Button>
        </div>
      </div>
    </div>
  );
};
