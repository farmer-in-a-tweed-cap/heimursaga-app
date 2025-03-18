'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components';
import { UploadIcon } from 'lucide-react';
import { useRef, useState } from 'react';

type Props = {
  fallback?: string;
};

export const UserAvatarUploadPicker: React.FC<Props> = ({ fallback }) => {
  const [preview, setPreview] = useState<string | null>(null);
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

        console.log(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <form>
        <input
          type="file"
          ref={inputRef}
          onChange={handleChange}
          accept="image/*"
          multiple={false}
          style={{ display: 'none' }}
        />
      </form>
      <div>
        <Avatar className="relative w-[100px] h-[100px]">
          <button
            className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer text-black"
            onClick={handleClick}
          >
            <UploadIcon size={16} className="z-20" />
            <div className="z-10 transition-all absolute inset-0 bg-gray-200"></div>
          </button>
          <AvatarFallback>{fallback}</AvatarFallback>
          <AvatarImage src={preview || ''} alt="" />
        </Avatar>
      </div>
    </div>
  );
};
