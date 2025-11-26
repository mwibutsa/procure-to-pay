"use client";

import { Progress } from "antd";

interface ApprovalProgressProps {
  current: number;
  total: number;
  className?: string;
}

export const ApprovalProgress: React.FC<ApprovalProgressProps> = ({
  current,
  total,
  className,
}) => {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          Approval Progress ({current} of {total} Approved)
        </span>
        <span className="text-sm text-gray-500">{percentage}%</span>
      </div>
      <Progress
        percent={percentage}
        strokeColor={{
          "0%": "#108ee9",
          "100%": "#87d068",
        }}
        showInfo={false}
      />
    </div>
  );
};

