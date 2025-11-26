"use client";

import { useRouter } from "next/navigation";
import { Button, Card, Table, Space } from "antd";
import { LogoutOutlined } from "@ant-design/icons";
import { usePurchaseRequests, useLogout } from "@/lib/queries";
import { useMe } from "@/lib/queries";
import type { PurchaseRequest } from "@/lib/types";
import Link from "next/link";
import type { ColumnsType } from "antd/es/table";

export default function ApproverDashboard() {
  const router = useRouter();
  const { data: user } = useMe();
  const { data, isLoading } = usePurchaseRequests({ status: "PENDING" });
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
      title: "Current Level",
      dataIndex: "current_approval_level",
      key: "current_approval_level",
    },
    {
      title: "Created By",
      dataIndex: "created_by_email",
      key: "created_by_email",
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
          <h1 className="text-3xl font-bold">Approver Dashboard</h1>
          <Space>
            <span>
              Welcome, {user?.email} (Level {user?.approval_level})
            </span>
            <Button icon={<LogoutOutlined />} onClick={handleLogout}>
              Logout
            </Button>
          </Space>
        </div>

        <Card title="Pending Approvals">
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
