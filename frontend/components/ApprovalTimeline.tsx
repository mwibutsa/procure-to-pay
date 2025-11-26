"use client";

import { Timeline } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";
import type { Approval } from "@/lib/types";
// Using native Date formatting instead of date-fns

interface ApprovalTimelineProps {
  approvals: Approval[];
  currentLevel?: number;
  requiredLevels?: number;
}

export const ApprovalTimeline: React.FC<ApprovalTimelineProps> = ({
  approvals,
  currentLevel,
  requiredLevels,
}) => {
  const getIcon = (action: "APPROVED" | "REJECTED", isPending: boolean) => {
    if (isPending) {
      return <ClockCircleOutlined style={{ color: "#faad14" }} />;
    }
    return action === "APPROVED" ? (
      <CheckCircleOutlined style={{ color: "#52c41a" }} />
    ) : (
      <CloseCircleOutlined style={{ color: "#ff4d4f" }} />
    );
  };

  const getColor = (action: "APPROVED" | "REJECTED", isPending: boolean) => {
    if (isPending) return "yellow";
    return action === "APPROVED" ? "green" : "red";
  };

  // Create timeline items from approvals
  const timelineItems = approvals.map((approval, index) => {
    const isPending = Boolean(
      index === approvals.length - 1 && currentLevel && currentLevel < (requiredLevels || 0)
    );
    
    return {
      dot: getIcon(approval.action, isPending),
      color: getColor(approval.action, isPending),
      children: (
        <div>
          <div className="font-semibold">
            {approval.action === "APPROVED" ? "Approved" : "Rejected"} by{" "}
            {approval.approver_name || approval.approver_email}
          </div>
          <div className="text-sm text-gray-600">
            Level {approval.approval_level} • {new Date(approval.timestamp).toLocaleString("en-US", {
              month: "short",
              day: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          {approval.comments && (
            <div className="text-sm text-gray-500 mt-1">{approval.comments}</div>
          )}
        </div>
      ),
    };
  });

  // Add pending items if there are still levels to approve
  if (currentLevel && requiredLevels && currentLevel < requiredLevels) {
    for (let i = currentLevel + 1; i <= requiredLevels; i++) {
      timelineItems.push({
        dot: <ClockCircleOutlined style={{ color: "#faad14" }} />,
        color: "yellow",
        children: (
          <div>
            <div className="font-semibold text-gray-500">Pending Approval</div>
            <div className="text-sm text-gray-400">Level {i}</div>
          </div>
        ),
      });
    }
  }

  return <Timeline items={timelineItems} />;
};

