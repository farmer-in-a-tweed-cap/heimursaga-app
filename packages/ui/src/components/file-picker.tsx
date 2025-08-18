'use client';

import { UploadCloudIcon, XIcon } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

import { cn, randomIntegerId } from './../lib/utils';
import { LoadingSpinner } from './spinner';

export type FilePickerFile = {
  id: number;
  src: string;
  uploadId?: string;
  loading?: boolean;
  file?: File;
  caption?: string;
};

type Props = {
  files?: FilePickerFile[];
  accept?: { [key: string]: string[] };
  maxFiles?: number;
  maxSize?: number;
  placeholder?: string;
  disabled?: boolean;
  loader?: (_file: FilePickerFile) => Promise<void>;
  onChange?: (_files: FilePickerFile[]) => void;
  onLoad?: FilePickerLoadHandler;
  onRemove?: (_id: number) => void;
  onCaptionChange?: (_id: number, _caption: string) => void;
};

export type FilePickerLoadHandler = (_file: { id: number; src: string }) => void;

export const FilePicker: React.FC<Props> = ({
  maxFiles = 1,
  accept,
  maxSize = 2,
  files = [],
  placeholder = 'Click and select some files to upload',
  disabled = false,
  loader,
  onChange,
  onLoad,
  onRemove,
  onCaptionChange,
}) => {
  const fileCount = files.length;

  const { getRootProps, getInputProps } = useDropzone({
    noClick: false,
    accept,
    maxFiles,
    maxSize: maxSize * 1000000,
    onDrop: async (acceptedFiles) => {
      const files: FilePickerFile[] = await Promise.all(
        acceptedFiles.map(async (file) =>
          Object.assign(file, {
            id: randomIntegerId(),
            src: URL.createObjectURL(file),
            file,
            loading: true,
          }),
        ),
      );

      const total = files.length + fileCount;
      if (total > maxFiles) return;

      if (onChange) {
        onChange(files);
      }

      if (loader && onLoad) {
        files.forEach((file) => {
          loader(file).then(() => {
            onLoad({ id: file.id, src: '' });
          });
        });
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

  const handleCaptionChange = (fileId: number, caption: string) => {
    if (onCaptionChange) {
      onCaptionChange(fileId, caption);
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
        <div className="flex flex-col items-center justify-center gap-2 text-gray-500">
          <UploadCloudIcon />
          <span className="text-sm font-normal">{placeholder}</span>
          <span className="text-sm">({`<${maxSize} mb`})</span>
        </div>
      </div>

      {files.length >= 1 && (
        <div className="mt-4 flex flex-col gap-4">
          {files.map((file, key) => (
            <div key={key} className="flex flex-col gap-2">
              <div className="w-32 h-32">
                <FilePickerPreview
                  id={file.id}
                  src={file.src}
                  loading={file.loading}
                  onRemove={handleFileRemove}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Caption (optional)
                </label>
                <input
                  type="text"
                  value={file.caption || ''}
                  onChange={(e) => handleCaptionChange(file.id, e.target.value)}
                  placeholder="Add a caption..."
                  maxLength={200}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-xs text-gray-500">
                  {(file.caption || '').length}/200 characters
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const FilePickerPreview: React.FC<{
  id: number;
  loading?: boolean;
  src?: string;
  onRemove?: (_e: React.MouseEvent, _id: number) => void;
}> = ({ id, loading = false, src, onRemove }) => {
  return (
    <div className="relative aspect-square overflow-hidden rounded-xl flex items-center justify-center border-2 border-accent border-solid bg-gray-50">
      {loading && (
        <div className="z-30 absolute inset-0 bg-accent opacity-50">
          <LoadingSpinner />
        </div>
      )}
      <img
        src={src}
        className="z-10 w-full h-full object-cover"
        alt=""
      />
      <div className="z-20 absolute inset-0 opacity-0 hover:opacity-100 transition-all">
        <button
          type="button"
          className="absolute top-1 right-1 w-[20px] h-[20px] flex items-center justify-center bg-white rounded-full border border-solid border-accent"
          onClick={(e) => (onRemove ? onRemove(e, id) : () => {})}
        >
          <XIcon size={16} />
        </button>
      </div>
    </div>
  );
};
