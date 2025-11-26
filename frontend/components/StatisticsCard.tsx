"use client";

import { Card } from "antd";
import { ReactNode } from "react";

interface StatisticsCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  subtitle?: string;
  className?: string;
}

export const StatisticsCard: React.FC<StatisticsCardProps> = ({
  title,
  value,
  icon,
  subtitle,
  className,
}) => {
  return (
    <Card
      className={`statistics-card ${className || ""}`}
      hoverable
      style={{
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-2">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="text-4xl opacity-80" style={{ color: "#1890ff" }}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};

