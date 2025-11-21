"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Table, Tag, Space, message } from "antd";
import { PlusOutlined, LogoutOutlined } from "@ant-design/icons";
import { usePurchaseRequests, useLogout } from "@/lib/queries";
import { useMe } from "@/lib/queries";
import type { PurchaseRequest } from "@/lib/types";
import Link from "next/link";
import type { ColumnsType } from "antd/es/table";

export default function StaffDashboard() {
  const router = useRouter();
  const { data: user } = useMe();
  const { data, isLoading } = usePurchaseRequests();
  const logout = useLogout();

  const handleLogout = async () => {
    await logout.mutateAsync();
    router.push("/login");
  };

  const columns: ColumnsType<PurchaseRequest> = [
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      render: (text: string, record: PurchaseRequest) => (
        <Link href={`/requests/${record.id}`}>{text}</Link>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount: number) => `$${amount.toFixed(2)}`,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: PurchaseRequest["status"]) => {
        const colorMap: Record<PurchaseRequest["status"], string> = {
          PENDING: "orange",
          APPROVED: "green",
          REJECTED: "red",
          DISCREPANCY: "purple",
        };
        return <Tag color={colorMap[status]}>{status}</Tag>;
      },
    },
    {
      title: "Created At",
      dataIndex: "created_at",
      key: "created_at",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Staff Dashboard</h1>
          <Space>
            <span>Welcome, {user?.email}</span>
            <Button icon={<LogoutOutlined />} onClick={handleLogout}>
              Logout
            </Button>
          </Space>
        </div>

        <Card
          title="My Purchase Requests"
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
          <Table
            columns={columns}
            dataSource={data?.results || []}
            loading={isLoading}
            rowKey="id"
            pagination={{
              current: data?.current_page,
              total: data?.count,
              pageSize: data?.page_size || 20,
            }}
          />
        </Card>
      </div>
    </div>
  );
}
