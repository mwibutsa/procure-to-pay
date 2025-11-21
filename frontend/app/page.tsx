"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@/lib/queries";
import { Spin } from "antd";

export default function Home() {
  const router = useRouter();
  const { data: user, isLoading } = useMe();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        // Redirect based on role
        if (user.role === "STAFF") {
          router.push("/dashboard/staff");
        } else if (user.role === "APPROVER") {
          router.push("/dashboard/approver");
        } else if (user.role === "FINANCE") {
          router.push("/dashboard/finance");
        }
      } else {
        router.push("/login");
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Spin size="large" />
    </div>
  );
}
