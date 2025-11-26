"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Table, Space, Input, Select, message } from "antd";
import {
  SearchOutlined,
  EyeOutlined,
  DownloadOutlined,
  UploadOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { usePurchaseRequests, useStatistics } from "@/lib/queries";
import { useMe } from "@/lib/queries";
import type { PurchaseRequest } from "@/lib/types";
import Link from "next/link";
import type { ColumnsType } from "antd/es/table";
import { StatisticsCard } from "@/components/StatisticsCard";
import {
  CheckCircleOutlined,
  DollarOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
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

  const { data, isLoading, refetch } = usePurchaseRequests({
    status: statusFilter,
    search: searchText || undefined,
    page,
  });

  const { data: statistics, isLoading: statsLoading } = useStatistics();

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value || undefined);
    setPage(1);
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
      return { status: "uploaded", color: "green" };
    }
    return { status: "missing", color: "red" };
  };

  const columns: ColumnsType<PurchaseRequest> = [
    {
      title: "TITLE",
      dataIndex: "title",
      key: "title",
      render: (text: string, record: PurchaseRequest) => (
        <Link
          href={`/requests/${record.id}`}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          {text}
        </Link>
      ),
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
      title: "CREATED BY",
      dataIndex: "created_by_name",
      key: "created_by_name",
      render: (name: string, record: PurchaseRequest) =>
        name || record.created_by_email,
    },
    {
      title: "APPROVED DATE",
      dataIndex: "updated_at",
      key: "updated_at",
      render: (date: string) => formatDate(date),
    },
    {
      title: "PURCHASE ORDER",
      dataIndex: "purchase_order_file_url",
      key: "purchase_order_file_url",
      render: (url: string | null, record: PurchaseRequest) => {
        if (url) {
          return (
            <Link
              href={url}
              target="_blank"
              className="text-blue-600 hover:text-blue-800"
            >
              PO-{record.id.slice(0, 8).toUpperCase()}
            </Link>
          );
        }
        return <span className="text-gray-400">Not generated</span>;
      },
    },
    {
      title: "RECEIPT STATUS",
      key: "receipt_status",
      render: (_: unknown, record: PurchaseRequest) => {
        const receiptStatus = getReceiptStatus(record);
        return (
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: receiptStatus.color }}
            />
            <span className="capitalize">{receiptStatus.status}</span>
          </div>
        );
      },
    },
    {
      title: "ACTIONS",
      key: "actions",
      render: (_: unknown, record: PurchaseRequest) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => router.push(`/requests/${record.id}`)}
          >
            View
          </Button>
          {record.purchase_order_file_url && (
            <Button
              type="link"
              icon={<DownloadOutlined />}
              onClick={() =>
                window.open(record.purchase_order_file_url || "", "_blank")
              }
            >
              Download
            </Button>
          )}
          {!record.receipt_file_url && (
            <Button
              type="link"
              icon={<UploadOutlined />}
              onClick={() => router.push(`/requests/${record.id}`)}
            >
              Upload Receipt
            </Button>
          )}
        </Space>
      ),
    },
  ];

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
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push("/requests/new")}
          >
            Create Request
          </Button>
        }
      >
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <Search
            placeholder="Search by title..."
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            onSearch={handleSearch}
            onChange={(e) => {
              if (!e.target.value) {
                handleSearch("");
              }
            }}
            style={{ maxWidth: 300 }}
          />
          <Select
            placeholder="All Receipt Statuses"
            allowClear
            size="large"
            style={{ width: 200 }}
            options={[
              { label: "Uploaded", value: "uploaded" },
              { label: "Missing", value: "missing" },
            ]}
          />
        </div>

        <Table
          columns={columns}
          dataSource={data?.results || []}
          loading={isLoading || statsLoading}
          rowKey="id"
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
    </div>
  );
}
