"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Form, Input, Button, Card, message } from "antd";
import { useLogin } from "@/lib/queries";
import type { ApiError } from "@/lib/types";
import type { AxiosError } from "axios";

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();

  const onFinish = async (values: { email: string; password: string }) => {
    try {
      const user = await login.mutateAsync(values);
      message.success("Login successful!");

      // Redirect based on role
      if (user.role === "STAFF") {
        router.push("/dashboard/staff");
      } else if (user.role === "APPROVER") {
        router.push("/dashboard/approver");
      } else if (user.role === "FINANCE") {
        router.push("/dashboard/finance");
      }
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      message.error(axiosError.response?.data?.detail || "Login failed");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card title="Login" className="w-full max-w-md">
        <Form
          name="login"
          onFinish={onFinish}
          layout="vertical"
          autoComplete="off"
        >
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Please input your email!" },
              { type: "email", message: "Please enter a valid email!" },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: "Please input your password!" }]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={login.isPending}
            >
              Login
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
