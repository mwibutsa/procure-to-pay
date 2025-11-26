"use client";

import { Tag } from "antd";
import { EPurchaseRequestStatus } from "@/enums";

interface StatusBadgeProps {
  status: EPurchaseRequestStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className,
}) => {
  const colorMap: Record<EPurchaseRequestStatus, string> = {
    [EPurchaseRequestStatus.PENDING]: "orange",
    [EPurchaseRequestStatus.APPROVED]: "green",
    [EPurchaseRequestStatus.REJECTED]: "red",
    [EPurchaseRequestStatus.DISCREPANCY]: "purple",
  };

  return (
    <Tag color={colorMap[status]} className={className}>
      {status}
    </Tag>
  );
};

