"use client";

import { useState, useCallback } from "react";
import { Upload, message } from "antd";
import type { UploadFile, UploadProps } from "antd";
import { InboxOutlined, DeleteOutlined } from "@ant-design/icons";
import { RcFile } from "antd/es/upload";

interface FileUploadProps {
  value?: string;
  onChange?: (url: string) => void;
  accept?: string;
  maxSize?: number; // in MB
  folder?: string;
}

const { Dragger } = Upload;

export const FileUpload: React.FC<FileUploadProps> = ({
  value,
  onChange,
  accept = ".pdf,.jpg,.jpeg,.png",
  maxSize = 5,
  folder = "procure-to-pay",
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleUpload = useCallback(
    async (file: RcFile) => {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      try {
        // For now, we'll use a placeholder URL
        // In production, this should upload to Cloudinary or your backend
        // The backend endpoint should handle the actual upload
        const url = URL.createObjectURL(file);
        onChange?.(url);
        message.success("File uploaded successfully");
        setUploading(false);
        return false; // Prevent default upload
      } catch (error) {
        message.error("File upload failed");
        setUploading(false);
        return false;
      }
    },
    [onChange]
  );

  const props: UploadProps = {
    name: "file",
    multiple: false,
    accept,
    fileList,
    beforeUpload: (file) => {
      const isValidSize = file.size / 1024 / 1024 < maxSize;
      if (!isValidSize) {
        message.error(`File size must be smaller than ${maxSize}MB!`);
        return false;
      }
      return handleUpload(file);
    },
    onRemove: () => {
      setFileList([]);
      onChange?.("");
      return true;
    },
    onChange(info) {
      const { status } = info.file;
      if (status === "done") {
        message.success(`${info.file.name} file uploaded successfully.`);
      } else if (status === "error") {
        message.error(`${info.file.name} file upload failed.`);
      }
      setFileList(info.fileList);
    },
    customRequest: async ({ file, onSuccess, onError }) => {
      try {
        await handleUpload(file as RcFile);
        onSuccess?.(file);
      } catch (error) {
        onError?.(error as Error);
      }
    },
  };

  return (
    <div>
      <Dragger {...props} disabled={uploading}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">
          Click to upload or drag and drop
        </p>
        <p className="ant-upload-hint">
          {accept} (MAX. {maxSize}MB)
        </p>
      </Dragger>
      {value && (
        <div className="mt-4 flex items-center gap-2">
          <span className="text-sm text-gray-600">{value}</span>
          <DeleteOutlined
            className="text-red-500 cursor-pointer"
            onClick={() => {
              onChange?.("");
              setFileList([]);
            }}
          />
        </div>
      )}
    </div>
  );
};

