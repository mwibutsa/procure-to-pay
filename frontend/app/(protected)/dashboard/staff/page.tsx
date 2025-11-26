"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Table, Input, Select } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { usePurchaseRequests, useStatistics } from "@/lib/queries";
import { useMe } from "@/lib/queries";
import type { PurchaseRequest } from "@/lib/types";
import Link from "next/link";
import type { ColumnsType } from "antd/es/table";
import { StatisticsCard } from "@/components/StatisticsCard";
import { StatusBadge } from "@/components/StatusBadge";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { EPurchaseRequestStatus } from "@/enums";
import { formatCurrency } from "@/lib/utils";

const { Search } = Input;

export default function StaffDashboard() {
  const router = useRouter();
  const { data: user } = useMe();
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined
  );
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = usePurchaseRequests({
    search: searchText || undefined,
    status: statusFilter,
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
      month: "2-digit",
      day: "2-digit",
    });
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
      title: "Date",
      dataIndex: "created_at",
      key: "created_at",
      render: (date: string) => formatDate(date),
    },
    {
      title: "Item",
      dataIndex: "title",
      key: "title",
      render: (text: string, record: PurchaseRequest) => (
        <Link
          href={`/requests/${record.id}`}
          className="text-blue-600 hover:text-blue-800"
        >
          {text}
        </Link>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount: number | string) => (
        <span className="font-semibold">{formatCurrency(amount)}</span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: EPurchaseRequestStatus) => (
        <StatusBadge status={status} />
      ),
    },
  ];

  const staffStats = statistics as {
    total_requests?: number;
    pending_approval?: number;
    approved?: number;
    rejected?: number;
    total_amount?: number;
  };

  return (
    <div>
      {/* Welcome Section */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome back, {getUserName()}!</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatisticsCard
          title="Total Requests"
          value={staffStats?.total_requests?.toString() || "0"}
          icon={<FileTextOutlined />}
        />
        <StatisticsCard
          title="Pending Approval"
          value={staffStats?.pending_approval?.toString() || "0"}
          icon={<ClockCircleOutlined />}
          subtitle="Awaiting review"
        />
        <StatisticsCard
          title="Approved"
          value={staffStats?.approved?.toString() || "0"}
          icon={<CheckCircleOutlined />}
          subtitle={`${formatCurrency(staffStats?.total_amount)} total`}
        />
      </div>

      {/* Actions and Filters */}
      <Card
        className="mb-6"
        styles={{ body: { padding: "16px" } }}
        style={{ boxShadow: "none", border: "1px solid #f0f0f0" }}
      >
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-col md:flex-row gap-4 flex-1">
            <Search
              placeholder="Search requests..."
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              onSearch={handleSearch}
              onChange={(e) => {
                if (!e.target.value) {
                  handleSearch("");
                }
              }}
              style={{ maxWidth: 400 }}
            />
            <Select
              placeholder="All Statuses"
              allowClear
              size="large"
              style={{ width: 200 }}
              onChange={handleStatusFilter}
              options={[
                { label: "Pending", value: EPurchaseRequestStatus.PENDING },
                { label: "Approved", value: EPurchaseRequestStatus.APPROVED },
                { label: "Rejected", value: EPurchaseRequestStatus.REJECTED },
                {
                  label: "Discrepancy",
                  value: EPurchaseRequestStatus.DISCREPANCY,
                },
              ]}
            />
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={() => router.push("/requests/new")}
          >
            Create New Request
          </Button>
        </div>
      </Card>

      {/* Recent Purchase Requests Table */}
      <Card
        title="Recent Purchase Requests"
        styles={{
          header: { borderBottom: "1px solid #f0f0f0" },
          body: { padding: "16px" },
        }}
        style={{ boxShadow: "none", border: "1px solid #f0f0f0" }}
      >
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
    </div>
  );
}
