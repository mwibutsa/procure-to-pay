"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  Table,
  Space,
  Input,
  Select,
  Modal,
  Descriptions,
  Tag,
  Divider,
} from "antd";
import {
  SearchOutlined,
  EyeOutlined,
  DownloadOutlined,
  UploadOutlined,
  FileTextOutlined,
  FilePdfOutlined,
} from "@ant-design/icons";
import { usePurchaseRequests, useStatistics } from "@/lib/queries";
import { useMe } from "@/lib/queries";
import type { PurchaseRequest, RequestItem } from "@/lib/types";
import Link from "next/link";
import type { ColumnsType } from "antd/es/table";
import { StatisticsCard } from "@/components/StatisticsCard";
import { StatusBadge } from "@/components/StatusBadge";
import { CheckCircleOutlined, DollarOutlined } from "@ant-design/icons";
import { EPurchaseRequestStatus } from "@/enums";
import { formatCurrency } from "@/lib/utils";

const { Search } = Input;

export default function FinanceDashboard() {
  const router = useRouter();
  const { data: user } = useMe();
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    EPurchaseRequestStatus.APPROVED
  );
  const [page, setPage] = useState(1);

  // Modal states
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<PurchaseRequest | null>(null);

  const { data, isLoading } = usePurchaseRequests({
    status: statusFilter,
    search: searchText || undefined,
    page,
  });

  const { data: statistics, isLoading: statsLoading } = useStatistics();

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const openDetailsModal = (record: PurchaseRequest) => {
    setSelectedRequest(record);
    setDetailsModalOpen(true);
  };

  const getUserName = (): string => {
    if (!user) return "";
    if (user.first_name || user.last_name) {
      return `${user.first_name || ""} ${user.last_name || ""}`.trim();
    }
    return user.email.split("@")[0];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getReceiptStatus = (request: PurchaseRequest) => {
    if (request.receipt_file_url) {
      return { status: "uploaded", color: "green", label: "Uploaded" };
    }
    return { status: "missing", color: "red", label: "Missing" };
  };

  const columns: ColumnsType<PurchaseRequest> = [
    {
      title: "Request ID",
      dataIndex: "id",
      key: "id",
      render: (id: string) => (
        <span className="font-mono text-sm">
          #{id.slice(0, 8).toUpperCase()}
        </span>
      ),
    },
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      render: (text: string) => <span className="font-medium">{text}</span>,
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount: number | string) => (
        <span className="font-semibold text-blue-600">
          {formatCurrency(amount)}
        </span>
      ),
    },
    {
      title: "Created By",
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
      title: "Date",
      dataIndex: "updated_at",
      key: "updated_at",
      render: (date: string) => formatDate(date),
    },
    {
      title: "Documents",
      key: "documents",
      render: (_: unknown, record: PurchaseRequest) => (
        <Space size="small">
          {record.proforma_file_url && (
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                window.open(record.proforma_file_url!, "_blank");
              }}
              title="View Proforma"
            >
              Proforma
            </Button>
          )}
          {record.purchase_order_file_url && (
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                window.open(record.purchase_order_file_url!, "_blank");
              }}
              title="View PO"
            >
              PO
            </Button>
          )}
          {!record.proforma_file_url && !record.purchase_order_file_url && (
            <Tag>No docs</Tag>
          )}
        </Space>
      ),
    },
    {
      title: "Receipt",
      key: "receipt_status",
      render: (_: unknown, record: PurchaseRequest) => {
        const receiptStatus = getReceiptStatus(record);
        return (
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: receiptStatus.color }}
            />
            <span className="capitalize">{receiptStatus.label}</span>
            {record.receipt_file_url && (
              <Button
                type="link"
                size="small"
                icon={<EyeOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(record.receipt_file_url!, "_blank");
                }}
              />
            )}
          </div>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, record: PurchaseRequest) => (
        <Space>
          <Button
            type="default"
            icon={<EyeOutlined />}
            style={{ height: 32 }}
            onClick={() => openDetailsModal(record)}
          >
            Details
          </Button>
          {record.purchase_order_file_url && (
            <Button
              icon={<DownloadOutlined />}
              style={{ height: 32 }}
              onClick={() =>
                window.open(record.purchase_order_file_url!, "_blank")
              }
            >
              PO
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // Request Details Modal Content
  const renderDetailsContent = () => {
    if (!selectedRequest) return null;

    const receiptStatus = getReceiptStatus(selectedRequest);

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
          <Descriptions.Item label="Status">
            <StatusBadge status={selectedRequest.status} />
          </Descriptions.Item>
          <Descriptions.Item label="Created By">
            {selectedRequest.created_by_name ||
              selectedRequest.created_by_email}
          </Descriptions.Item>
          <Descriptions.Item label="Submitted On">
            {formatDate(selectedRequest.created_at)}
          </Descriptions.Item>
          <Descriptions.Item label="Receipt Status">
            <Tag color={receiptStatus.color}>{receiptStatus.label}</Tag>
          </Descriptions.Item>
        </Descriptions>

        {/* Line Items */}
        {selectedRequest.items && selectedRequest.items.length > 0 && (
          <>
            <Divider>Line Items</Divider>
            <Table
              dataSource={selectedRequest.items.map(
                (item: RequestItem, idx: number) => ({
                  ...item,
                  key: idx,
                })
              )}
              columns={[
                {
                  title: "Description",
                  dataIndex: "description",
                  key: "description",
                },
                {
                  title: "Qty",
                  dataIndex: "quantity",
                  key: "quantity",
                  width: 60,
                },
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
                    <span className="font-semibold">
                      {formatCurrency(total)}
                    </span>
                  ),
                },
              ]}
              pagination={false}
              size="small"
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3}>
                    <strong>Total</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>
                    <strong className="text-blue-600">
                      {formatCurrency(selectedRequest.amount)}
                    </strong>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
          </>
        )}

        {/* Documents Section */}
        <Divider>Documents</Divider>
        <div className="flex flex-wrap gap-3">
          {selectedRequest.proforma_file_url ? (
            <Button
              icon={<FilePdfOutlined />}
              onClick={() =>
                window.open(selectedRequest.proforma_file_url!, "_blank")
              }
            >
              View Proforma Invoice
            </Button>
          ) : (
            <Tag>No Proforma</Tag>
          )}
          {selectedRequest.purchase_order_file_url ? (
            <Button
              icon={<FileTextOutlined />}
              onClick={() =>
                window.open(selectedRequest.purchase_order_file_url!, "_blank")
              }
            >
              View Purchase Order
            </Button>
          ) : (
            <Tag>No Purchase Order</Tag>
          )}
          {selectedRequest.receipt_file_url ? (
            <Button
              icon={<FileTextOutlined />}
              onClick={() =>
                window.open(selectedRequest.receipt_file_url!, "_blank")
              }
            >
              View Receipt
            </Button>
          ) : (
            <Tag color="orange">Receipt Not Uploaded</Tag>
          )}
        </div>

        {/* Approval History */}
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
                    <Tag
                      color={approval.action === "APPROVED" ? "green" : "red"}
                    >
                      {approval.action}
                    </Tag>
                  </div>
                  {approval.comments && (
                    <p className="text-sm text-gray-600 mt-1">
                      {approval.comments}
                    </p>
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

  const financeStats = statistics as {
    total_approved_requests?: number;
    total_amount_approved?: number;
    pending_payments?: number;
    receipts_pending?: number;
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Finance Dashboard
          </h1>
          <p className="text-gray-600">Welcome back, {getUserName()}!</p>
        </div>
        {user?.organization_name && (
          <div className="flex items-center gap-2 text-gray-600">
            <FileTextOutlined />
            <span>{user.organization_name}</span>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatisticsCard
          title="Total Approved Requests"
          value={financeStats?.total_approved_requests?.toString() || "0"}
          icon={<CheckCircleOutlined />}
        />
        <StatisticsCard
          title="Total Amount Approved"
          value={`$${
            financeStats?.total_amount_approved?.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) || "0.00"
          }`}
          icon={<DollarOutlined />}
        />
        <StatisticsCard
          title="Pending Payments"
          value={financeStats?.pending_payments?.toString() || "0"}
          icon={<FileTextOutlined />}
          subtitle="Receipts not submitted"
        />
      </div>

      {/* Approved Requests Section */}
      <Card
        title="Approved Requests"
        styles={{
          header: { borderBottom: "1px solid #f0f0f0" },
          body: { padding: "16px" },
        }}
        style={{ boxShadow: "none", border: "1px solid #f0f0f0" }}
      >
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <Search
            placeholder="Search by title..."
            allowClear
            enterButton={<SearchOutlined />}
            size="middle"
            onSearch={handleSearch}
            onChange={(e) => {
              if (!e.target.value) {
                handleSearch("");
              }
            }}
            style={{ maxWidth: 300 }}
          />
          <Select
            placeholder="Receipt Status"
            allowClear
            size="middle"
            style={{ width: 180 }}
            options={[
              { label: "All", value: "" },
              { label: "Receipt Uploaded", value: "uploaded" },
              { label: "Receipt Missing", value: "missing" },
            ]}
          />
        </div>

        <Table
          columns={columns}
          dataSource={data?.results || []}
          loading={isLoading || statsLoading}
          rowKey="id"
          scroll={{ x: "max-content" }}
          pagination={{
            current: data?.current_page || page,
            total: data?.count || 0,
            pageSize: data?.page_size || 20,
            showSizeChanger: true,
            showTotal: (total, range) =>
              `Showing ${range[0]} to ${range[1]} of ${total} results`,
            onChange: (newPage) => setPage(newPage),
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
          selectedRequest?.purchase_order_file_url && (
            <Button
              key="download-po"
              icon={<DownloadOutlined />}
              onClick={() =>
                window.open(selectedRequest.purchase_order_file_url!, "_blank")
              }
            >
              Download PO
            </Button>
          ),
          !selectedRequest?.receipt_file_url &&
            selectedRequest?.status === EPurchaseRequestStatus.APPROVED && (
              <Button
                key="upload-receipt"
                type="primary"
                icon={<UploadOutlined />}
                onClick={() => {
                  setDetailsModalOpen(false);
                  router.push(`/requests/${selectedRequest.id}`);
                }}
              >
                Upload Receipt
              </Button>
            ),
        ].filter(Boolean)}
      >
        {renderDetailsContent()}
      </Modal>
    </div>
  );
}
