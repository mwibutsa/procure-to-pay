"use client";

import { useRouter } from "next/navigation";
import { Form, Input, Button, Checkbox, message } from "antd";
import { useLogin } from "@/lib/queries";
import type { ApiError } from "@/lib/types";
import type { AxiosError } from "axios";
import { EUserRole } from "@/enums";

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();

  const onFinish = async (values: {
    email: string;
    password: string;
    remember?: boolean;
  }) => {
    try {
      const user = await login.mutateAsync({
        email: values.email,
        password: values.password,
      });
      message.success("Login successful!");

      // Redirect based on role
      if (user.role === EUserRole.STAFF) {
        router.push("/dashboard/staff");
      } else if (user.role === EUserRole.APPROVER) {
        router.push("/dashboard/approver");
      } else if (user.role === EUserRole.FINANCE) {
        router.push("/dashboard/finance");
      }
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      message.error(axiosError.response?.data?.detail || "Login failed");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Visual Section */}
      <div className="hidden md:flex md:w-2/5 lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[#1890ff] via-[#096dd9] to-[#0050b3]">
        {/* Animated Background Shapes */}
        <div className="absolute inset-0">
          {/* Large Circle */}
          <div className="absolute top-20 -left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>

          {/* Medium Circle */}
          <div className="absolute bottom-20 -right-20 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>

          {/* Small Blob */}
          <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-blue-300/15 rounded-full blur-2xl animate-pulse delay-2000"></div>

          {/* Animated Gradient Orbs */}
          <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-gradient-to-r from-cyan-400/30 to-blue-400/30 rounded-full blur-3xl animate-bounce-slow"></div>
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 flex flex-col justify-center items-start px-8 md:px-12 lg:px-16 text-white">
          <div className="mb-8">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm mb-6">
              <svg
                className="w-6 h-6 md:w-8 md:h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
              Welcome to
              <br />
              Procure-to-Pay
            </h1>
            <p className="text-base md:text-lg lg:text-xl text-white/90 leading-relaxed max-w-md">
              Streamline your purchase requests and approvals with our
              comprehensive procurement management system.
            </p>
          </div>

          {/* Feature Points */}
          <div className="mt-8 md:mt-12 space-y-3 md:space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-white rounded-full flex-shrink-0"></div>
              <span className="text-white/90 text-sm md:text-base">
                Multi-level approval workflow
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-white rounded-full flex-shrink-0"></div>
              <span className="text-white/90 text-sm md:text-base">
                AI-powered document processing
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-white rounded-full flex-shrink-0"></div>
              <span className="text-white/90 text-sm md:text-base">
                Real-time status tracking
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form Section */}
      <div className="w-full md:w-3/5 lg:w-1/2 flex items-center justify-center bg-gray-50 px-4 sm:px-6 md:px-8 lg:px-12 py-8 sm:py-12">
        <div className="w-full max-w-md">
          {/* Logo/Icon */}
          <div className="mb-6 md:mb-8 text-center md:text-left">
            <div className="inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 bg-[#1890ff] rounded-full mb-4">
              <svg
                className="w-6 h-6 md:w-7 md:h-7 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Sign in to your account
            </h2>
            <p className="text-sm sm:text-base text-gray-600">
              Welcome back! Please enter your details.
            </p>
          </div>

          {/* Login Form */}
          <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-6 sm:p-8 border border-gray-100">
            <Form
              name="login"
              onFinish={onFinish}
              layout="vertical"
              autoComplete="off"
              size="large"
              className="login-form"
            >
              <Form.Item
                label={
                  <span className="text-gray-700 font-medium text-sm sm:text-base">
                    Email Address
                  </span>
                }
                name="email"
                rules={[
                  { required: true, message: "Please input your email!" },
                  { type: "email", message: "Please enter a valid email!" },
                ]}
                className="mb-4 sm:mb-5"
              >
                <Input
                  placeholder="Enter your email address"
                  className="h-11 sm:h-12 rounded-lg border-gray-300 hover:border-[#1890ff] focus:border-[#1890ff] transition-colors"
                />
              </Form.Item>

              <Form.Item
                label={
                  <span className="text-gray-700 font-medium text-sm sm:text-base">
                    Password
                  </span>
                }
                name="password"
                rules={[
                  { required: true, message: "Please input your password!" },
                ]}
                className="mb-4"
              >
                <Input.Password
                  placeholder="Enter your password"
                  className="h-11 sm:h-12 rounded-lg border-gray-300 hover:border-[#1890ff] focus:border-[#1890ff] transition-colors"
                />
              </Form.Item>

              <div className="flex items-center justify-between mb-6">
                <Form.Item
                  name="remember"
                  valuePropName="checked"
                  className="mb-0"
                >
                  <Checkbox className="text-gray-600">Remember me</Checkbox>
                </Form.Item>
                <a
                  href="#"
                  className="text-[#1890ff] hover:text-[#096dd9] font-medium text-sm transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    message.info("Forgot password feature coming soon!");
                  }}
                >
                  Forgot Password?
                </a>
              </div>

              <Form.Item className="mb-0">
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  loading={login.isPending}
                  className="h-11 sm:h-12 rounded-lg bg-[#1890ff] hover:bg-[#096dd9] border-none text-sm sm:text-base font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                >
                  Sign In
                </Button>
              </Form.Item>
            </Form>
          </div>

          {/* Footer Text */}
          <p className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <a
              href="#"
              className="text-[#1890ff] hover:text-[#096dd9] font-medium transition-colors"
              onClick={(e) => {
                e.preventDefault();
                message.info("Contact your administrator for account access.");
              }}
            >
              Contact Administrator
            </a>
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce-slow {
          0%,
          100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-20px) scale(1.05);
          }
        }

        .animate-bounce-slow {
          animation: bounce-slow 6s ease-in-out infinite;
        }

        .delay-1000 {
          animation-delay: 1s;
        }

        .delay-2000 {
          animation-delay: 2s;
        }

        :global(.login-form .ant-input-affix-wrapper) {
          border-radius: 0.5rem;
          border-color: #d9d9d9;
          transition: all 0.2s;
        }

        :global(.login-form .ant-input-affix-wrapper:hover) {
          border-color: #1890ff;
        }

        :global(.login-form .ant-input-affix-wrapper-focused) {
          border-color: #1890ff;
          box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
        }

        :global(.login-form .ant-input) {
          border-radius: 0.5rem;
          border-color: #d9d9d9;
          transition: all 0.2s;
        }

        :global(.login-form .ant-input:hover) {
          border-color: #1890ff;
        }

        :global(.login-form .ant-input:focus) {
          border-color: #1890ff;
          box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
        }

        :global(.login-form .ant-checkbox-checked .ant-checkbox-inner) {
          background-color: #1890ff;
          border-color: #1890ff;
        }

        :global(.login-form .ant-checkbox:hover .ant-checkbox-inner) {
          border-color: #1890ff;
        }
      `}</style>
    </div>
  );
}
