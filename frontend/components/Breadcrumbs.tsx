"use client";

import Link from "next/link";
import { Breadcrumb } from "antd";
import { HomeOutlined } from "@ant-design/icons";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  // Get the dashboard path based on user role - this will be handled by the page
  const homePath = "/dashboard/staff"; // Default, pages can override if needed

  const breadcrumbItems = [
    {
      title: (
        <Link href={homePath}>
          <HomeOutlined /> Home
        </Link>
      ),
    },
    ...items.map((item) => ({
      title: item.href ? (
        <Link href={item.href}>{item.label}</Link>
      ) : (
        <span>{item.label}</span>
      ),
    })),
  ];

  return (
    <Breadcrumb
      items={breadcrumbItems}
      className="mb-4"
      style={{ fontSize: "14px" }}
    />
  );
};

