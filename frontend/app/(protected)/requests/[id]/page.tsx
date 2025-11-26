"use client";

import { useParams, useRouter } from "next/navigation";
import {
  Card,
  Descriptions,
  Button,
  Space,
  Modal,
  Form,
  Input,
  message,
  Tabs,
  Tag,
  Alert,
} from "antd";
import {
  EditOutlined,
  DownloadOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import {
  usePurchaseRequest,
  useApproveRequest,
  useRejectRequest,
  useSubmitReceipt,
  useMe,
} from "@/lib/queries";
import type { ApiError } from "@/lib/types";
import { useState } from "react";
import type { AxiosError } from "axios";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { StatusBadge } from "@/components/StatusBadge";
import { ApprovalTimeline } from "@/components/ApprovalTimeline";
import { ApprovalProgress } from "@/components/ApprovalProgress";
import { EPurchaseRequestStatus } from "@/enums";
import { EUserRole } from "@/enums";
import { formatCurrency } from "@/lib/utils";

const { TextArea } = Input;

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

  const canApprove =
    user?.role === EUserRole.APPROVER &&
    request.status === EPurchaseRequestStatus.PENDING;
  const canReject =
    user?.role === EUserRole.APPROVER &&
    request.status === EPurchaseRequestStatus.PENDING;
  const canEdit = user?.role === EUserRole.STAFF && request.can_be_updated;
  const canSubmitReceipt =
    user?.role === EUserRole.STAFF &&
    request.status === EPurchaseRequestStatus.APPROVED;

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const documentTabs = [
    {
      key: "proforma",
      label: "PROFORMA INVOICE",
      children: (
        <div>
          {request.proforma_file_url ? (
            <div className="flex items-center justify-between p-4 border rounded">
              <div className="flex items-center gap-3">
                <FileTextOutlined className="text-2xl text-blue-600" />
                <div>
                  <div className="font-medium">Proforma Invoice</div>
                  <div className="text-sm text-gray-500">
                    {request.proforma_file_url.split("/").pop()}
                  </div>
                </div>
              </div>
              <Space>
                <Button
                  icon={<EyeOutlined />}
                  onClick={() =>
                    window.open(request.proforma_file_url || "", "_blank")
                  }
                >
                  View
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = request.proforma_file_url || "";
                    link.download = "";
                    link.click();
                  }}
                >
                  Download
                </Button>
              </Space>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No proforma invoice uploaded
            </div>
          )}
        </div>
      ),
    },
    {
      key: "po",
      label: "PURCHASE ORDER",
      children: (
        <div>
          {request.purchase_order_file_url ? (
            <div className="flex items-center justify-between p-4 border rounded">
              <div className="flex items-center gap-3">
                <FileTextOutlined className="text-2xl text-green-600" />
                <div>
                  <div className="font-medium">Purchase Order</div>
                  <div className="text-sm text-gray-500">
                    PO-{request.id.slice(0, 8).toUpperCase()}
                  </div>
                </div>
              </div>
              <Space>
                <Button
                  icon={<EyeOutlined />}
                  onClick={() =>
                    window.open(request.purchase_order_file_url || "", "_blank")
                  }
                >
                  View
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = request.purchase_order_file_url || "";
                    link.download = "";
                    link.click();
                  }}
                >
                  Download
                </Button>
              </Space>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Purchase order not generated yet
            </div>
          )}
        </div>
      ),
    },
    {
      key: "receipt",
      label: "RECEIPT",
      children: (
        <div>
          {request.receipt_file_url ? (
            <div className="flex items-center justify-between p-4 border rounded">
              <div className="flex items-center gap-3">
                <FileTextOutlined className="text-2xl text-purple-600" />
                <div>
                  <div className="font-medium">Receipt</div>
                  <div className="text-sm text-gray-500">
                    {request.receipt_file_url.split("/").pop()}
                  </div>
                </div>
              </div>
              <Space>
                <Button
                  icon={<EyeOutlined />}
                  onClick={() =>
                    window.open(request.receipt_file_url || "", "_blank")
                  }
                >
                  View
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = request.receipt_file_url || "";
                    link.download = "";
                    link.click();
                  }}
                >
                  Download
                </Button>
              </Space>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No receipt uploaded
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Purchase Requests", href: "/dashboard/staff" },
          { label: request.title },
        ]}
      />

      {/* Header Section */}
      <Card className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{request.title}</h1>
              <StatusBadge status={request.status} />
            </div>
            <p className="text-gray-600">
              Request ID: PR-{request.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
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
            {canEdit && (
              <Button
                icon={<EditOutlined />}
                onClick={() => router.push(`/requests/${request.id}/edit`)}
              >
                Edit Request
              </Button>
            )}
          </Space>
        </div>
      </Card>

      {/* Request Details Card */}
      <Card title="Request Details" className="mb-6">
        <Descriptions column={1} bordered>
          <Descriptions.Item label="Total Amount">
            <span className="text-2xl font-bold text-blue-600">
              {formatCurrency(request.amount)} USD
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="Description">
            {request.description}
          </Descriptions.Item>
          <Descriptions.Item label="Created By">
            {request.created_by_name || request.created_by_email}
          </Descriptions.Item>
          <Descriptions.Item label="Submission Date">
            {formatDate(request.created_at)}
          </Descriptions.Item>
          <Descriptions.Item label="Approval Progress">
            <ApprovalProgress
              current={request.current_approval_level}
              total={request.required_approval_levels}
            />
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Approval History Card */}
      {request.approvals && request.approvals.length > 0 && (
        <Card title="Approval History" className="mb-6">
          <ApprovalTimeline
            approvals={request.approvals}
            currentLevel={request.current_approval_level}
            requiredLevels={request.required_approval_levels}
          />
        </Card>
      )}

      {/* Documents Card */}
      <Card title="Documents">
        <Tabs items={documentTabs} />
      </Card>

      {/* Approve Modal */}
      <Modal
        title="Approve Request"
        open={approveModalVisible}
        onCancel={() => setApproveModalVisible(false)}
        footer={null}
      >
        <Form onFinish={handleApprove}>
          <Form.Item name="comments" label="Comments (Optional)">
            <TextArea rows={4} />
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

      {/* Reject Modal */}
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
            <TextArea rows={4} />
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

      {/* Submit Receipt Modal */}
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
          <Button onClick={() => setReceiptModalVisible(false)}>Cancel</Button>
        </Space>
      </Modal>
    </div>
  );
}
