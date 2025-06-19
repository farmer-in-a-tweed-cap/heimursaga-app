'use client';

import { XIcon } from 'lucide-react';
import { FileWithPath, useDropzone } from 'react-dropzone';

import { cn, randomIntegerId } from './../lib/utils';

export type FilePickerFile = FileWithPath & { id: number; preview: string };

type Props = {
  files?: FilePickerFile[];
  maxFiles?: number;
  maxSize?: number;
  placeholder?: string;
  disabled?: boolean;
  onChange?: (files: FilePickerFile[]) => void;
  onRemove?: (id: number) => void;
};

export const FilePicker: React.FC<Props> = ({
  maxFiles = 1,
  maxSize = 2,
  files = [],
  placeholder = 'Click and select some files to upload',
  disabled = false,
  onChange,
  onRemove,
}) => {
  const { getRootProps, getInputProps } = useDropzone({
    noClick: false,
    accept: {
      'image/*': [],
    },
    maxFiles,
    maxSize: maxSize * 1000000,
    onDrop: (acceptedFiles) => {
      const total = acceptedFiles.length + files.length;
      if (total > maxFiles) return;

      if (onChange) {
        onChange(
          acceptedFiles.map((file) =>
            Object.assign(file, {
              id: randomIntegerId(),
              preview: URL.createObjectURL(file),
            }),
          ),
        );
      }
    },
  });

  const pickerDisabled = disabled || files.length >= maxFiles;

  const handleFileRemove = (e: React.MouseEvent, fileId: number) => {
    e.preventDefault();
    if (onRemove) {
      onRemove(fileId);
    }
  };

  return (
    <div className="w-full h-auto flex flex-col justify-start">
      <div
        {...getRootProps()}
        className={cn(
          'w-full h-auto min-h-[200px] bg-accent flex items-center justify-center rounded-xl',
          pickerDisabled
            ? 'cursor-not-allowed'
            : 'cursor-pointer hover:bg-accent/80',
        )}
      >
        <input {...getInputProps()} disabled={pickerDisabled} />
        <span className="text-sm font-normal text-gray-500">{placeholder}</span>
      </div>
      {files.length >= 1 && (
        <div className="mt-4 grid grid-cols-6 gap-2">
          {files.map((file) => (
            <div className="relative aspect-square overflow-hidden rounded-xl flex items-center justify-center border-2 border-accent border-solid">
              <img
                src={file.preview}
                className="z-10 w-auto min-w-[150%] h-auto"
              />
              <div className="z-20 absolute inset-0 opacity-0 hover:opacity-100 transition-all">
                <button
                  type="button"
                  className="absolute top-1 right-1 w-[20px] h-[20px] flex items-center justify-center bg-white rounded-full border border-solid border-accent"
                  onClick={(e) => handleFileRemove(e, file.id)}
                >
                  <XIcon size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
