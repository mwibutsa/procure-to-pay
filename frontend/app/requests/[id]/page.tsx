"use client";

import { useParams, useRouter } from "next/navigation";
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  Modal,
  Form,
  Input,
  message,
  Upload,
} from "antd";
import {
  usePurchaseRequest,
  useApproveRequest,
  useRejectRequest,
  useSubmitReceipt,
  useMe,
} from "@/lib/queries";
import type { ApiError, Approval } from "@/lib/types";
import { useState } from "react";
import type { AxiosError } from "axios";

export default function RequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: request, isLoading } = usePurchaseRequest(params.id as string);
  const { data: user } = useMe();
  const approveRequest = useApproveRequest();
  const rejectRequest = useRejectRequest();
  const submitReceipt = useSubmitReceipt();
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState("");

  const handleApprove = async (values: { comments?: string }) => {
    try {
      await approveRequest.mutateAsync({
        id: params.id as string,
        comments: values.comments,
      });
      message.success("Request approved successfully!");
      setApproveModalVisible(false);
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      message.error(
        axiosError.response?.data?.detail || "Failed to approve request"
      );
    }
  };

  const handleReject = async (values: { comments: string }) => {
    try {
      await rejectRequest.mutateAsync({
        id: params.id as string,
        comments: values.comments,
      });
      message.success("Request rejected");
      setRejectModalVisible(false);
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      message.error(
        axiosError.response?.data?.detail || "Failed to reject request"
      );
    }
  };

  const handleSubmitReceipt = async () => {
    if (!receiptUrl) {
      message.error("Please enter receipt file URL");
      return;
    }
    try {
      await submitReceipt.mutateAsync({
        id: params.id as string,
        receipt_file_url: receiptUrl,
      });
      message.success("Receipt submitted successfully!");
      setReceiptModalVisible(false);
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      message.error(
        axiosError.response?.data?.detail || "Failed to submit receipt"
      );
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (!request) return <div>Request not found</div>;

  const canApprove = user?.role === "APPROVER" && request.status === "PENDING";
  const canReject = user?.role === "APPROVER" && request.status === "PENDING";
  const canSubmitReceipt =
    user?.role === "STAFF" && request.status === "APPROVED";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <Card
          title={request.title}
          extra={
            <Space>
              {canApprove && (
                <Button
                  type="primary"
                  onClick={() => setApproveModalVisible(true)}
                >
                  Approve
                </Button>
              )}
              {canReject && (
                <Button danger onClick={() => setRejectModalVisible(true)}>
                  Reject
                </Button>
              )}
              {canSubmitReceipt && (
                <Button onClick={() => setReceiptModalVisible(true)}>
                  Submit Receipt
                </Button>
              )}
              <Button onClick={() => router.back()}>Back</Button>
            </Space>
          }
        >
          <Descriptions column={1} bordered>
            <Descriptions.Item label="Status">
              <Tag
                color={
                  request.status === "APPROVED"
                    ? "green"
                    : request.status === "REJECTED"
                    ? "red"
                    : "orange"
                }
              >
                {request.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Amount">
              ${request.amount}
            </Descriptions.Item>
            <Descriptions.Item label="Description">
              {request.description}
            </Descriptions.Item>
            <Descriptions.Item label="Created By">
              {request.created_by_email}
            </Descriptions.Item>
            <Descriptions.Item label="Created At">
              {new Date(request.created_at).toLocaleString()}
            </Descriptions.Item>
            {request.current_approval_level > 0 && (
              <Descriptions.Item label="Current Approval Level">
                {request.current_approval_level} /{" "}
                {request.required_approval_levels}
              </Descriptions.Item>
            )}
          </Descriptions>

          {request.approvals && request.approvals.length > 0 && (
            <Card title="Approval History" className="mt-4">
              {request.approvals.map((approval: Approval) => (
                <div key={approval.id} className="mb-2">
                  <Tag color={approval.action === "APPROVED" ? "green" : "red"}>
                    Level {approval.approval_level} - {approval.action}
                  </Tag>
                  <span className="ml-2">{approval.approver_email}</span>
                  {approval.comments && (
                    <div className="text-gray-600 mt-1">
                      {approval.comments}
                    </div>
                  )}
                </div>
              ))}
            </Card>
          )}
        </Card>

        <Modal
          title="Approve Request"
          open={approveModalVisible}
          onCancel={() => setApproveModalVisible(false)}
          footer={null}
        >
          <Form onFinish={handleApprove}>
            <Form.Item name="comments" label="Comments (Optional)">
              <Input.TextArea rows={4} />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={approveRequest.isPending}
                >
                  Approve
                </Button>
                <Button onClick={() => setApproveModalVisible(false)}>
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title="Reject Request"
          open={rejectModalVisible}
          onCancel={() => setRejectModalVisible(false)}
          footer={null}
        >
          <Form onFinish={handleReject}>
            <Form.Item
              name="comments"
              label="Rejection Reason"
              rules={[
                {
                  required: true,
                  message: "Please provide a rejection reason!",
                },
              ]}
            >
              <Input.TextArea rows={4} />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button
                  danger
                  htmlType="submit"
                  loading={rejectRequest.isPending}
                >
                  Reject
                </Button>
                <Button onClick={() => setRejectModalVisible(false)}>
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title="Submit Receipt"
          open={receiptModalVisible}
          onCancel={() => setReceiptModalVisible(false)}
          footer={null}
        >
          <Input
            placeholder="Enter receipt file URL (Cloudinary URL)"
            value={receiptUrl}
            onChange={(e) => setReceiptUrl(e.target.value)}
            className="mb-4"
          />
          <Space>
            <Button
              type="primary"
              onClick={handleSubmitReceipt}
              loading={submitReceipt.isPending}
            >
              Submit
            </Button>
            <Button onClick={() => setReceiptModalVisible(false)}>
              Cancel
            </Button>
          </Space>
        </Modal>
      </div>
    </div>
  );
}
