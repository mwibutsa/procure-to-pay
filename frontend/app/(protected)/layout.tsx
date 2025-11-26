"use client";

import { FC, ReactNode, useState } from "react";
import { Layout, Menu, Avatar, Button, Typography } from "antd";
import {
  DashboardOutlined,
  ShoppingCartOutlined,
  FileTextOutlined,
  BarChartOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useRouter, usePathname } from "next/navigation";
import { useMe, useLogout } from "@/lib/queries";
import { EUserRole } from "@/enums";
import Link from "next/link";

const { Sider, Content, Header } = Layout;
const { Text } = Typography;

interface ProtectedLayoutProps {
  children: ReactNode;
}

const ProtectedLayout: FC<ProtectedLayoutProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user, isLoading } = useMe();
  const logout = useLogout();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout.mutateAsync();
    router.push("/login");
  };

  const getRoleLabel = (role: EUserRole): string => {
    switch (role) {
      case EUserRole.STAFF:
        return "Staff";
      case EUserRole.APPROVER:
        return `Approver${
          user?.approval_level ? ` (Level ${user.approval_level})` : ""
        }`;
      case EUserRole.FINANCE:
        return "Finance Manager";
      default:
        return "User";
    }
  };

  const getUserName = (): string => {
    if (!user) return "";
    if (user.first_name || user.last_name) {
      return `${user.first_name || ""} ${user.last_name || ""}`.trim();
    }
    return user.email.split("@")[0];
  };

  // Role-based menu items
  const getMenuItems = () => {
    const baseItems = [
      {
        key: "/dashboard/staff",
        icon: <DashboardOutlined />,
        label: <Link href="/dashboard/staff">Dashboard</Link>,
      },
    ];

    if (user?.role === EUserRole.STAFF) {
      return [
        ...baseItems,
        {
          key: "/requests",
          icon: <ShoppingCartOutlined />,
          label: <Link href="/dashboard/staff">Purchase Requests</Link>,
        },
      ];
    } else if (user?.role === EUserRole.APPROVER) {
      return [
        {
          key: "/dashboard/approver",
          icon: <DashboardOutlined />,
          label: <Link href="/dashboard/approver">Dashboard</Link>,
        },
        {
          key: "/requests",
          icon: <FileTextOutlined />,
          label: <Link href="/dashboard/approver">Requests</Link>,
        },
      ];
    } else if (user?.role === EUserRole.FINANCE) {
      return [
        {
          key: "/dashboard/finance",
          icon: <DashboardOutlined />,
          label: <Link href="/dashboard/finance">Dashboard</Link>,
        },
        {
          key: "/requests",
          icon: <FileTextOutlined />,
          label: <Link href="/dashboard/finance">Purchase Requests</Link>,
        },
        {
          key: "/purchase-orders",
          icon: <FileTextOutlined />,
          label: <Link href="/dashboard/finance">Purchase Orders</Link>,
        },
        {
          key: "/invoices",
          icon: <FileTextOutlined />,
          label: <Link href="/dashboard/finance">Invoices</Link>,
        },
        {
          key: "/reports",
          icon: <BarChartOutlined />,
          label: <Link href="/dashboard/finance">Reports</Link>,
        },
      ];
    }

    return baseItems;
  };

  const getDashboardPath = (): string => {
    if (!user) return "/dashboard/staff";
    switch (user.role) {
      case EUserRole.STAFF:
        return "/dashboard/staff";
      case EUserRole.APPROVER:
        return "/dashboard/approver";
      case EUserRole.FINANCE:
        return "/dashboard/finance";
      default:
        return "/dashboard/staff";
    }
  };

  // Middleware handles auth redirects, so we just show loading while fetching user
  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const selectedKey = pathname || getDashboardPath();

  return (
    <Layout className="min-h-screen">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={240}
        collapsedWidth={80}
        style={{
          background: "#fff",
          borderRight: "1px solid #f0f0f0",
          height: "100vh",
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          overflow: "auto",
          zIndex: 100,
        }}
      >
        {/* User Profile Section */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Avatar
              size={40}
              icon={<UserOutlined />}
              style={{ backgroundColor: "#1890ff", flexShrink: 0 }}
            />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <Text strong className="block truncate text-sm">
                  {getUserName()}
                </Text>
                <Text type="secondary" className="text-xs block truncate">
                  {getRoleLabel(user.role)}
                </Text>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Menu */}
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={getMenuItems()}
          className="border-r-0"
          style={{ borderRight: "none" }}
        />

        {/* Logout Button */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 p-2">
          <Button
            type="text"
            icon={<LogoutOutlined />}
            block
            danger
            style={{
              textAlign: collapsed ? "center" : "left",
              justifyContent: collapsed ? "center" : "flex-start",
            }}
            onClick={handleLogout}
          >
            {!collapsed && "Logout"}
          </Button>
        </div>
      </Sider>

      <Layout
        style={{
          marginLeft: collapsed ? 80 : 240,
          transition: "margin-left 0.2s",
          minHeight: "100vh",
        }}
      >
        <Header
          style={{
            background: "#fff",
            padding: "0 16px",
            height: "64px",
            lineHeight: "64px",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: "16px", width: 48, height: 48 }}
          />
          <div className="flex items-center gap-4">
            {user.organization_name && (
              <Text type="secondary" className="hidden md:block">
                {user.organization_name}
              </Text>
            )}
          </div>
        </Header>
        <Content
          style={{
            padding: "24px",
            background: "#f5f5f5",
            minHeight: "calc(100vh - 64px)",
            overflow: "auto",
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default ProtectedLayout;
