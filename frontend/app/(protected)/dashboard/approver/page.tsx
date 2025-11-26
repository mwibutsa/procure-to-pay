"use client";

import { useState } from "react";
import {
  Button,
  Card,
  Table,
  Space,
  Input,
  message,
  Modal,
  Descriptions,
  Tag,
  Divider,
} from "antd";
import {
  SearchOutlined,
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  FileTextOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import { usePurchaseRequests, useStatistics } from "@/lib/queries";
import { useMe } from "@/lib/queries";
import type { PurchaseRequest, RequestItem } from "@/lib/types";
import type { ColumnsType } from "antd/es/table";
import { StatisticsCard } from "@/components/StatisticsCard";
import { StatusBadge } from "@/components/StatusBadge";
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { EPurchaseRequestStatus } from "@/enums";
import { useApproveRequest, useRejectRequest } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

const { Search, TextArea } = Input;

export default function ApproverDashboard() {
  const { data: user } = useMe();
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);

  // Modal states
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
  const [approveComments, setApproveComments] = useState("");
  const [rejectComments, setRejectComments] = useState("");

  // Get pending requests
  const {
    data: pendingData,
    isLoading: pendingLoading,
    refetch: refetchPending,
  } = usePurchaseRequests({
    status: EPurchaseRequestStatus.PENDING,
    search: searchText || undefined,
    page,
  });

  // Get all requests for history (including approved/rejected by this user)
  const { data: historyData, isLoading: historyLoading } = usePurchaseRequests({
    search: searchText || undefined,
    page: 1,
  });

  const { data: statistics, isLoading: statsLoading } = useStatistics();
  const approveRequest = useApproveRequest();
  const rejectRequest = useRejectRequest();

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const openDetailsModal = (record: PurchaseRequest) => {
    setSelectedRequest(record);
    setDetailsModalOpen(true);
  };

  const openApproveModal = (record: PurchaseRequest) => {
    setSelectedRequest(record);
    setApproveComments("");
    setApproveModalOpen(true);
  };

  const openRejectModal = (record: PurchaseRequest) => {
    setSelectedRequest(record);
    setRejectComments("");
    setRejectModalOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    try {
      await approveRequest.mutateAsync({
        id: selectedRequest.id,
        comments: approveComments,
      });
      message.success("Request approved successfully!");
      setApproveModalOpen(false);
      setSelectedRequest(null);
      setApproveComments("");
      refetchPending();
    } catch {
      message.error("Failed to approve request. Please try again.");
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    if (!rejectComments.trim()) {
      message.error("Please provide a reason for rejection");
      return;
    }

    try {
      await rejectRequest.mutateAsync({
        id: selectedRequest.id,
        comments: rejectComments,
      });
      message.success("Request rejected successfully");
      setRejectModalOpen(false);
      setSelectedRequest(null);
      setRejectComments("");
      refetchPending();
    } catch {
      message.error("Failed to reject request. Please try again.");
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  };

  // Expandable row content showing request details
  const expandedRowRender = (record: PurchaseRequest) => (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <h4 className="font-semibold text-gray-700 mb-2">Request Details</h4>
          <p className="text-sm text-gray-600 mb-1">
            <span className="font-medium">Title:</span> {record.title}
          </p>
          <p className="text-sm text-gray-600 mb-1">
            <span className="font-medium">Description:</span> {record.description}
          </p>
          <p className="text-sm text-gray-600 mb-1">
            <span className="font-medium">Amount:</span>{" "}
            <span className="text-blue-600 font-semibold">
              {formatCurrency(record.amount)}
            </span>
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-gray-700 mb-2">Approval Info</h4>
          <p className="text-sm text-gray-600 mb-1">
            <span className="font-medium">Approval Progress:</span>{" "}
            {record.current_approval_level} of {record.required_approval_levels} levels
          </p>
          <p className="text-sm text-gray-600 mb-1">
            <span className="font-medium">Submitted:</span> {formatDate(record.created_at)}
          </p>
        </div>
      </div>

      {/* Line Items */}
      {record.items && record.items.length > 0 && (
        <div className="mb-4">
          <h4 className="font-semibold text-gray-700 mb-2">Line Items</h4>
          <Table
            dataSource={record.items.map((item, idx) => ({ ...item, key: idx }))}
            columns={[
              { title: "Description", dataIndex: "description", key: "description" },
              { title: "Quantity", dataIndex: "quantity", key: "quantity" },
              {
                title: "Unit Price",
                dataIndex: "unit_price",
                key: "unit_price",
                render: (price: number) => formatCurrency(price),
              },
              {
                title: "Total",
                dataIndex: "total",
                key: "total",
                render: (total: number) => (
                  <span className="font-semibold">{formatCurrency(total)}</span>
                ),
              },
            ]}
            pagination={false}
            size="small"
          />
        </div>
      )}

      {/* Documents */}
      <div className="flex gap-2">
        {record.proforma_file_url && (
          <Button
            icon={<FileTextOutlined />}
            size="small"
            onClick={() => window.open(record.proforma_file_url!, "_blank")}
          >
            View Proforma
          </Button>
        )}
        <Button
          type="primary"
          icon={<CheckOutlined />}
          size="small"
          onClick={() => openApproveModal(record)}
        >
          Approve
        </Button>
        <Button
          danger
          icon={<CloseOutlined />}
          size="small"
          onClick={() => openRejectModal(record)}
        >
          Reject
        </Button>
      </div>
    </div>
  );

  const pendingColumns: ColumnsType<PurchaseRequest> = [
    {
      title: "REQUEST ID",
      dataIndex: "id",
      key: "id",
      render: (id: string) => (
        <span className="font-mono text-sm">#{id.slice(0, 8).toUpperCase()}</span>
      ),
    },
    {
      title: "TITLE",
      dataIndex: "title",
      key: "title",
      render: (title: string) => (
        <span className="font-medium">{title}</span>
      ),
    },
    {
      title: "SUBMITTER",
      dataIndex: "created_by_name",
      key: "created_by_name",
      render: (name: string, record: PurchaseRequest) => (
        <div>
          <div className="font-medium">{name || record.created_by_email}</div>
          <div className="text-xs text-gray-500">{record.created_by_email}</div>
        </div>
      ),
    },
    {
      title: "AMOUNT",
      dataIndex: "amount",
      key: "amount",
      render: (amount: number | string) => (
        <span className="font-semibold text-blue-600">{formatCurrency(amount)}</span>
      ),
    },
    {
      title: "SUBMITTED",
      dataIndex: "created_at",
      key: "created_at",
      render: (date: string) => formatDate(date),
    },
    {
      title: "PROFORMA",
      key: "proforma",
      render: (_: unknown, record: PurchaseRequest) =>
        record.proforma_file_url ? (
          <Button
            type="link"
            icon={<EyeOutlined />}
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              window.open(record.proforma_file_url!, "_blank");
            }}
          >
            View
          </Button>
        ) : (
          <Tag>No file</Tag>
        ),
    },
    {
      title: "ACTIONS",
      key: "actions",
      render: (_: unknown, record: PurchaseRequest) => (
        <Space>
          <Button
            type="default"
            size="small"
            icon={<EyeOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              openDetailsModal(record);
            }}
          >
            Details
          </Button>
          <Button
            danger
            size="small"
            icon={<CloseOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              openRejectModal(record);
            }}
          >
            Reject
          </Button>
          <Button
            type="primary"
            size="small"
            icon={<CheckOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              openApproveModal(record);
            }}
          >
            Approve
          </Button>
        </Space>
      ),
    },
  ];

  const historyColumns: ColumnsType<PurchaseRequest> = [
    {
      title: "REQUEST ID",
      dataIndex: "id",
      key: "id",
      render: (id: string) => (
        <span className="font-mono text-sm">#{id.slice(0, 8).toUpperCase()}</span>
      ),
    },
    {
      title: "TITLE",
      dataIndex: "title",
      key: "title",
    },
    {
      title: "SUBMITTER",
      dataIndex: "created_by_name",
      key: "created_by_name",
      render: (name: string, record: PurchaseRequest) =>
        name || record.created_by_email,
    },
    {
      title: "AMOUNT",
      dataIndex: "amount",
      key: "amount",
      render: (amount: number | string) => (
        <span className="font-semibold">{formatCurrency(amount)}</span>
      ),
    },
    {
      title: "REVIEWED DATE",
      dataIndex: "updated_at",
      key: "updated_at",
      render: (date: string) => formatDate(date),
    },
    {
      title: "STATUS",
      dataIndex: "status",
      key: "status",
      render: (status: EPurchaseRequestStatus) => <StatusBadge status={status} />,
    },
  ];

  // Filter history to show only requests reviewed by this user
  const myHistory =
    historyData?.results?.filter((req) => {
      return req.approvals?.some((approval) => approval.approver === user?.id);
    }) || [];

  const approverStats = statistics as {
    pending_my_action?: number;
    approved_this_month?: number;
    rejected_this_month?: number;
    total_reviewed?: number;
  };

  // Request Details Modal Content
  const renderDetailsContent = () => {
    if (!selectedRequest) return null;

    return (
      <div>
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Request ID">
            <span className="font-mono">
              #{selectedRequest.id.slice(0, 8).toUpperCase()}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="Title">
            {selectedRequest.title}
          </Descriptions.Item>
          <Descriptions.Item label="Description">
            {selectedRequest.description}
          </Descriptions.Item>
          <Descriptions.Item label="Amount">
            <span className="text-xl font-bold text-blue-600">
              {formatCurrency(selectedRequest.amount)}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="Submitted By">
            {selectedRequest.created_by_name || selectedRequest.created_by_email}
          </Descriptions.Item>
          <Descriptions.Item label="Submitted On">
            {formatDate(selectedRequest.created_at)}
          </Descriptions.Item>
          <Descriptions.Item label="Approval Progress">
            <Tag color="blue">
              Level {selectedRequest.current_approval_level} of{" "}
              {selectedRequest.required_approval_levels}
            </Tag>
          </Descriptions.Item>
        </Descriptions>

        {/* Line Items */}
        {selectedRequest.items && selectedRequest.items.length > 0 && (
          <>
            <Divider>Line Items</Divider>
            <Table
              dataSource={selectedRequest.items.map((item: RequestItem, idx: number) => ({
                ...item,
                key: idx,
              }))}
              columns={[
                {
                  title: "Description",
                  dataIndex: "description",
                  key: "description",
                },
                { title: "Qty", dataIndex: "quantity", key: "quantity", width: 60 },
                {
                  title: "Unit Price",
                  dataIndex: "unit_price",
                  key: "unit_price",
                  render: (price: number) => formatCurrency(price),
                },
                {
                  title: "Total",
                  dataIndex: "total",
                  key: "total",
                  render: (total: number) => (
                    <span className="font-semibold">{formatCurrency(total)}</span>
                  ),
                },
              ]}
              pagination={false}
              size="small"
            />
          </>
        )}

        {/* Documents */}
        {selectedRequest.proforma_file_url && (
          <>
            <Divider>Documents</Divider>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => window.open(selectedRequest.proforma_file_url!, "_blank")}
            >
              View Proforma Invoice
            </Button>
          </>
        )}

        {/* Previous Approvals */}
        {selectedRequest.approvals && selectedRequest.approvals.length > 0 && (
          <>
            <Divider>Approval History</Divider>
            <div className="space-y-2">
              {selectedRequest.approvals.map((approval, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg ${
                    approval.action === "APPROVED"
                      ? "bg-green-50 border border-green-200"
                      : "bg-red-50 border border-red-200"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">
                      Level {approval.approval_level} -{" "}
                      {approval.approver_name || approval.approver_email}
                    </span>
                    <Tag color={approval.action === "APPROVED" ? "green" : "red"}>
                      {approval.action}
                    </Tag>
                  </div>
                  {approval.comments && (
                    <p className="text-sm text-gray-600 mt-1">{approval.comments}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDate(approval.timestamp)}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Approver Dashboard</h1>
        <p className="text-gray-600">
          Welcome, {user?.email}{" "}
          {user?.approval_level && `(Level ${user.approval_level})`}
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatisticsCard
          title="Pending My Action"
          value={approverStats?.pending_my_action?.toString() || "0"}
          icon={<ClockCircleOutlined />}
        />
        <StatisticsCard
          title="Approved This Month"
          value={approverStats?.approved_this_month?.toString() || "0"}
          icon={<CheckCircleOutlined />}
        />
        <StatisticsCard
          title="Rejected This Month"
          value={approverStats?.rejected_this_month?.toString() || "0"}
          icon={<CloseCircleOutlined />}
        />
      </div>

      {/* Pending Approvals Section */}
      <Card
        title="Pending Approvals"
        className="mb-6"
        extra={
          <Search
            placeholder="Search requests..."
            allowClear
            enterButton={<SearchOutlined />}
            size="middle"
            onSearch={handleSearch}
            style={{ width: 300 }}
          />
        }
      >
        <Table
          columns={pendingColumns}
          dataSource={pendingData?.results || []}
          loading={pendingLoading || statsLoading}
          rowKey="id"
          expandable={{
            expandedRowRender,
            rowExpandable: () => true,
          }}
          pagination={{
            current: pendingData?.current_page || page,
            total: pendingData?.count || 0,
            pageSize: pendingData?.page_size || 20,
            showTotal: (total, range) =>
              `Showing ${range[0]}-${range[1]} of ${total}`,
            onChange: (newPage) => setPage(newPage),
          }}
        />
      </Card>

      {/* My Approval History Section */}
      <Card title="My Approval History">
        <Table
          columns={historyColumns}
          dataSource={myHistory}
          loading={historyLoading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showTotal: (total, range) =>
              `Showing ${range[0]}-${range[1]} of ${total}`,
          }}
        />
      </Card>

      {/* Request Details Modal */}
      <Modal
        title={
          <span>
            Request Details -{" "}
            <span className="font-mono text-blue-600">
              #{selectedRequest?.id.slice(0, 8).toUpperCase()}
            </span>
          </span>
        }
        open={detailsModalOpen}
        onCancel={() => {
          setDetailsModalOpen(false);
          setSelectedRequest(null);
        }}
        width={700}
        footer={[
          <Button key="close" onClick={() => setDetailsModalOpen(false)}>
            Close
          </Button>,
          <Button
            key="reject"
            danger
            icon={<CloseOutlined />}
            onClick={() => {
              setDetailsModalOpen(false);
              openRejectModal(selectedRequest!);
            }}
          >
            Reject
          </Button>,
          <Button
            key="approve"
            type="primary"
            icon={<CheckOutlined />}
            onClick={() => {
              setDetailsModalOpen(false);
              openApproveModal(selectedRequest!);
            }}
          >
            Approve
          </Button>,
        ]}
      >
        {renderDetailsContent()}
      </Modal>

      {/* Approve Confirmation Modal */}
      <Modal
        title={
          <span className="text-green-600">
            <CheckCircleOutlined className="mr-2" />
            Approve Request
          </span>
        }
        open={approveModalOpen}
        onCancel={() => {
          setApproveModalOpen(false);
          setSelectedRequest(null);
          setApproveComments("");
        }}
        onOk={handleApprove}
        okText="Confirm Approval"
        okButtonProps={{
          loading: approveRequest.isPending,
          className: "bg-green-600 hover:bg-green-700",
        }}
        cancelButtonProps={{ disabled: approveRequest.isPending }}
      >
        <div className="py-4">
          <p className="mb-4">
            You are about to approve request{" "}
            <strong>#{selectedRequest?.id.slice(0, 8).toUpperCase()}</strong>
          </p>
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <p className="font-medium">{selectedRequest?.title}</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(selectedRequest?.amount)}
            </p>
            <p className="text-sm text-gray-500">
              Submitted by {selectedRequest?.created_by_name || selectedRequest?.created_by_email}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comments (optional)
            </label>
            <TextArea
              rows={3}
              value={approveComments}
              onChange={(e) => setApproveComments(e.target.value)}
              placeholder="Add any comments for this approval..."
            />
          </div>
        </div>
      </Modal>

      {/* Reject Confirmation Modal */}
      <Modal
        title={
          <span className="text-red-600">
            <CloseCircleOutlined className="mr-2" />
            Reject Request
          </span>
        }
        open={rejectModalOpen}
        onCancel={() => {
          setRejectModalOpen(false);
          setSelectedRequest(null);
          setRejectComments("");
        }}
        onOk={handleReject}
        okText="Confirm Rejection"
        okButtonProps={{
          danger: true,
          loading: rejectRequest.isPending,
          disabled: !rejectComments.trim(),
        }}
        cancelButtonProps={{ disabled: rejectRequest.isPending }}
      >
        <div className="py-4">
          <p className="mb-4">
            You are about to reject request{" "}
            <strong>#{selectedRequest?.id.slice(0, 8).toUpperCase()}</strong>
          </p>
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <p className="font-medium">{selectedRequest?.title}</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(selectedRequest?.amount)}
            </p>
            <p className="text-sm text-gray-500">
              Submitted by {selectedRequest?.created_by_name || selectedRequest?.created_by_email}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for rejection <span className="text-red-500">*</span>
            </label>
            <TextArea
              rows={3}
              value={rejectComments}
              onChange={(e) => setRejectComments(e.target.value)}
              placeholder="Please provide a reason for rejecting this request..."
              status={!rejectComments.trim() ? "error" : undefined}
            />
            {!rejectComments.trim() && (
              <p className="text-red-500 text-sm mt-1">
                A reason is required for rejection
              </p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
