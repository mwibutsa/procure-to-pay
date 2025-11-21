"use client";

import { useRouter } from "next/navigation";
import {
  Form,
  Input,
  InputNumber,
  Button,
  Card,
  message,
  Upload,
  Space,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useCreatePurchaseRequest } from "@/lib/queries";
import type { CreatePurchaseRequestData, ApiError } from "@/lib/types";
import { useState } from "react";
import type { AxiosError } from "axios";

export default function NewRequestPage() {
  const router = useRouter();
  const createRequest = useCreatePurchaseRequest();
  const [proformaUrl, setProformaUrl] = useState("");

  const onFinish = async (values: CreatePurchaseRequestData) => {
    try {
      const data: CreatePurchaseRequestData = {
        ...values,
        proforma_file_url: proformaUrl || undefined,
      };
      await createRequest.mutateAsync(data);
      message.success("Request created successfully!");
      router.push("/dashboard/staff");
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      message.error(
        axiosError.response?.data?.detail || "Failed to create request"
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <Card title="Create Purchase Request">
          <Form layout="vertical" onFinish={onFinish} autoComplete="off">
            <Form.Item
              label="Title"
              name="title"
              rules={[{ required: true, message: "Please input the title!" }]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              label="Description"
              name="description"
              rules={[
                { required: true, message: "Please input the description!" },
              ]}
            >
              <Input.TextArea rows={4} />
            </Form.Item>

            <Form.Item
              label="Amount"
              name="amount"
              rules={[{ required: true, message: "Please input the amount!" }]}
            >
              <InputNumber
                style={{ width: "100%" }}
                prefix="$"
                min={0}
                step={0.01}
              />
            </Form.Item>

            <Form.Item label="Proforma File URL" name="proforma_file_url">
              <Input
                placeholder="Enter Cloudinary URL or upload file"
                value={proformaUrl}
                onChange={(e) => setProformaUrl(e.target.value)}
              />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={createRequest.isPending}
                >
                  Submit
                </Button>
                <Button onClick={() => router.back()}>Cancel</Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
}
