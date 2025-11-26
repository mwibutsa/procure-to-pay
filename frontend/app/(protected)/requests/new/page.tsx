"use client";

import { useRouter } from "next/navigation";
import {
  Form,
  Input,
  InputNumber,
  Button,
  Card,
  message,
  Space,
  Collapse,
  Table,
  Popconfirm,
} from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { useCreatePurchaseRequest } from "@/lib/queries";
import type {
  CreatePurchaseRequestData,
  ApiError,
  RequestItem,
} from "@/lib/types";
import { useState } from "react";
import type { AxiosError } from "axios";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FileUpload } from "@/components/FileUpload";
import { formatCurrency } from "@/lib/utils";

const { TextArea } = Input;
const { Panel } = Collapse;

export default function NewRequestPage() {
  const router = useRouter();
  const createRequest = useCreatePurchaseRequest();
  const [form] = Form.useForm();
  const [proformaUrl, setProformaUrl] = useState("");
  const [items, setItems] = useState<RequestItem[]>([]);
  const [itemsForm] = Form.useForm();

  const onFinish = async (values: CreatePurchaseRequestData) => {
    try {
      // Calculate total amount from items if provided
      let totalAmount = values.amount;
      if (items.length > 0) {
        totalAmount = items.reduce((sum, item) => sum + item.total, 0);
      }

      const data: CreatePurchaseRequestData = {
        ...values,
        amount: totalAmount,
        proforma_file_url: proformaUrl || undefined,
        items: items.length > 0 ? items : undefined,
      };
      await createRequest.mutateAsync(data);
      message.success("Request created successfully!");
      router.push("/dashboard/staff");
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      message.error(
        axiosError.response?.data?.detail || "Failed to create request"
      );
    }
  };

  const addItem = () => {
    itemsForm.validateFields().then((values) => {
      const newItem: RequestItem = {
        description: values.description,
        quantity: values.quantity,
        unit_price: values.unit_price,
        total: values.quantity * values.unit_price,
      };
      setItems([...items, newItem]);
      itemsForm.resetFields();
    });
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const itemColumns = [
    {
      title: "Item Name",
      dataIndex: "description",
      key: "description",
    },
    {
      title: "Quantity",
      dataIndex: "quantity",
      key: "quantity",
    },
    {
      title: "Unit Price",
      dataIndex: "unit_price",
      key: "unit_price",
      render: (price: number | string) => formatCurrency(price),
    },
    {
      title: "Total",
      dataIndex: "total",
      key: "total",
      render: (total: number | string) => (
        <span className="font-semibold">{formatCurrency(total)}</span>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, __: unknown, index: number) => (
        <Popconfirm
          title="Remove this item?"
          onConfirm={() => removeItem(index)}
        >
          <Button type="link" danger icon={<DeleteOutlined />}>
            Remove
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Purchase Requests", href: "/dashboard/staff" },
          { label: "Create New" },
        ]}
      />

      <Card>
        <h1 className="text-2xl font-bold mb-6">Create New Purchase Request</h1>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          {/* Request Details Section */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4">Request Details</h2>
            <Form.Item
              label="Title"
              name="title"
              rules={[
                { required: true, message: "This field is required." },
                { min: 3, message: "Title must be at least 3 characters." },
              ]}
            >
              <Input placeholder="e.g., New Laptops for Design Team" />
            </Form.Item>

            <Form.Item
              label="Description"
              name="description"
              rules={[{ required: true, message: "This field is required." }]}
            >
              <TextArea
                rows={4}
                placeholder="Enter a detailed description of the purchase request."
              />
            </Form.Item>

            <Form.Item
              label="Total Amount"
              name="amount"
              rules={[
                { required: true, message: "This field is required." },
                {
                  type: "number",
                  min: 0.01,
                  message: "Amount must be greater than 0.",
                },
              ]}
            >
              <InputNumber
                style={{ width: "100%" }}
                prefix="$"
                min={0}
                step={0.01}
                precision={2}
                placeholder="0.00"
                disabled={items.length > 0}
              />
            </Form.Item>
            {items.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Total Amount:{" "}
                  <span className="font-semibold">
                    {formatCurrency(totalAmount)}
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Proforma Invoice Section */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4">
              Proforma Invoice (Optional)
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Accepted file types: PDF, JPG, PNG Max size: 5MB
            </p>
            <FileUpload
              value={proformaUrl}
              onChange={setProformaUrl}
              accept=".pdf,.jpg,.jpeg,.png"
              maxSize={5}
            />
          </div>

          {/* Add Line Items Section */}
          <div className="mb-6">
            <Collapse>
              <Panel header="Add Line Items (Optional)" key="items">
                <Form form={itemsForm} layout="inline" className="mb-4">
                  <Form.Item
                    name="description"
                    rules={[{ required: true, message: "Required" }]}
                    style={{ width: "40%" }}
                  >
                    <Input placeholder="Item Name" />
                  </Form.Item>
                  <Form.Item
                    name="quantity"
                    rules={[{ required: true, message: "Required" }]}
                    style={{ width: "15%" }}
                  >
                    <InputNumber
                      placeholder="Qty"
                      min={1}
                      style={{ width: "100%" }}
                    />
                  </Form.Item>
                  <Form.Item
                    name="unit_price"
                    rules={[{ required: true, message: "Required" }]}
                    style={{ width: "20%" }}
                  >
                    <InputNumber
                      placeholder="Unit Price"
                      prefix="$"
                      min={0}
                      step={0.01}
                      style={{ width: "100%" }}
                    />
                  </Form.Item>
                  <Form.Item>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={addItem}
                    >
                      Add Item
                    </Button>
                  </Form.Item>
                </Form>

                {items.length > 0 && (
                  <Table
                    columns={itemColumns}
                    dataSource={items.map((item, index) => ({
                      ...item,
                      key: index,
                    }))}
                    pagination={false}
                    size="small"
                  />
                )}
              </Panel>
            </Collapse>
          </div>

          {/* Action Buttons */}
          <Form.Item>
            <Space>
              <Button onClick={() => router.back()}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createRequest.isPending}
              >
                Submit Request
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
