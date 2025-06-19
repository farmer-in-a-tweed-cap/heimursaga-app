'use client';

import { FilePickerFile, FilePickerLoadHandler } from '@repo/ui/components';
import { useState } from 'react';

import { apiClient } from '@/lib/api';

type State = {
  files?: FilePickerFile[];
};

export const useUploads = (state?: State) => {
  const [files, setFiles] = useState<FilePickerFile[]>(state?.files || []);

  const uploadFile = async (file: FilePickerFile) => {
    // upload
    const { success, data } = await apiClient.uploadImage({ file });
    const uploadId = data?.uploadId;

    if (success) {
      setFiles((files) => {
        const index = files.findIndex(({ id }) => id === file.id);
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
    uploadFile,
    handleFileLoad,
    handleFileChange,
    handleFileRemove,
  };
};
