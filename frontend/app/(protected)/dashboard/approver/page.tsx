"use client";

import { useState } from "react";
import { Button, Card, Table, Space, Input, message } from "antd";
import {
  SearchOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { usePurchaseRequests, useStatistics } from "@/lib/queries";
import { useMe } from "@/lib/queries";
import type { PurchaseRequest } from "@/lib/types";
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

const { Search } = Input;

export default function ApproverDashboard() {
  const { data: user } = useMe();
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);

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

  const handleApprove = async (id: string) => {
    try {
      await approveRequest.mutateAsync({ id, comments: "" });
      message.success("Request approved successfully!");
      refetchPending();
    } catch {
      message.error("Failed to approve request");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectRequest.mutateAsync({ id, comments: "Rejected" });
      message.success("Request rejected");
      refetchPending();
    } catch {
      message.error("Failed to reject request");
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const pendingColumns: ColumnsType<PurchaseRequest> = [
    {
      title: "REQUEST ID",
      dataIndex: "id",
      key: "id",
      render: (id: string) => (
        <span className="font-mono text-sm">
          #{id.slice(0, 8).toUpperCase()}
        </span>
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
      title: "DEPARTMENT",
      dataIndex: "organization_name",
      key: "organization_name",
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
      title: "SUBMITTED",
      dataIndex: "created_at",
      key: "created_at",
      render: (date: string) => formatDate(date),
    },
    {
      title: "ACTIONS",
      key: "actions",
      render: (_: unknown, record: PurchaseRequest) => (
        <Space>
          <Button
            danger
            size="small"
            icon={<CloseOutlined />}
            onClick={() => handleReject(record.id)}
            loading={rejectRequest.isPending}
          >
            Reject
          </Button>
          <Button
            type="primary"
            size="small"
            icon={<CheckOutlined />}
            onClick={() => handleApprove(record.id)}
            loading={approveRequest.isPending}
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
        <span className="font-mono text-sm">
          #{id.slice(0, 8).toUpperCase()}
        </span>
      ),
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
      render: (status: EPurchaseRequestStatus) => (
        <StatusBadge status={status} />
      ),
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

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Approver Dashboard
        </h1>
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
    </div>
  );
}
