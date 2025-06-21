'use client';

import { FilePickerFile, FilePickerLoadHandler } from '@repo/ui/components';
import { useState } from 'react';

import { apiClient } from '@/lib/api';

import { randomIntegerId } from '@/lib';

type State = {
  files?: FilePickerFile[];
  maxFiles?: number;
  maxSize?: number;
};

export const useUploads = (state?: State) => {
  const [files, setFiles] = useState<FilePickerFile[]>(state?.files || []);

  const maxFiles = state?.maxFiles || 4;
  const maxSize = state?.maxSize || 2;

  const loader = async ({ id, file }: FilePickerFile) => {
    console.log('file:', { id, file });

    if (!file) return;

    console.log('file uploading..', file);

    // upload
    const { success, data } = await apiClient.uploadImage({ file });
    const uploadId = data?.uploadId;

    if (success) {
      console.log('file uploaded', data);

      setFiles((files) => {
        const index = files.findIndex((file) => file.id === id);
        const list = [...files];
        const element = list[index];
        list[index] = { ...element, uploadId };
        return list;
      });
    } else {
      //
    }
  };

  const handleFileChange = (files: FilePickerFile[]) => {
    setFiles((prev) => [...prev, ...files]);
  };

  const handleFileLoad: FilePickerLoadHandler = (file) => {
    setFiles((files) => {
      const index = files.findIndex(({ id }) => id === file.id);
      if (index < 0) return files;

      const element = files[index];
      const list = [...files];
      list[index] = { ...element, loading: false };

      return list;
    });
  };

  const handleFileRemove = (fileId: number) => {
    setFiles((files) => files.filter((file) => file.id !== fileId));
  };

  return {
    files,
    setFiles,
    maxFiles,
    maxSize,
    loader,
    handleFileLoad,
    handleFileChange,
    handleFileRemove,
  };
};
