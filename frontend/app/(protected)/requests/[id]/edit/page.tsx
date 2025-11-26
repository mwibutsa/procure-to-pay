"use client";

import { useParams, useRouter } from "next/navigation";
import {
  Form,
  Input,
  InputNumber,
  Button,
  Card,
  message,
  Space,
  Alert,
  Table,
  Popconfirm,
} from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { usePurchaseRequest, useUpdatePurchaseRequest } from "@/lib/queries";
import type {
  UpdatePurchaseRequestData,
  ApiError,
  RequestItem,
} from "@/lib/types";
import { useState, useEffect } from "react";
import type { AxiosError } from "axios";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FileUpload } from "@/components/FileUpload";
import { StatusBadge } from "@/components/StatusBadge";
import { EPurchaseRequestStatus } from "@/enums";
import { formatCurrency } from "@/lib/utils";

const { TextArea } = Input;

export default function EditRequestPage() {
  const params = useParams();
  const router = useRouter();
  const { data: request, isLoading } = usePurchaseRequest(params.id as string);
  const updateRequest = useUpdatePurchaseRequest();
  const [form] = Form.useForm();
  const [itemsForm] = Form.useForm();
  const [proformaUrl, setProformaUrl] = useState("");
  const [items, setItems] = useState<RequestItem[]>([]);

  useEffect(() => {
    if (request) {
      form.setFieldsValue({
        title: request.title,
        description: request.description,
        amount: request.amount,
      });
      setProformaUrl(request.proforma_file_url || "");
      setItems(request.items || []);
    }
  }, [request, form]);

  const onFinish = async (values: UpdatePurchaseRequestData) => {
    if (!request) return;

    if (!request.can_be_updated) {
      message.error("This request cannot be updated.");
      return;
    }

    try {
      // Calculate total amount from items if provided
      let totalAmount = values.amount || request.amount;
      if (items.length > 0) {
        totalAmount = items.reduce((sum, item) => sum + item.total, 0);
      }

      const data: UpdatePurchaseRequestData = {
        ...values,
        amount: totalAmount,
        proforma_file_url: proformaUrl || undefined,
        items: items.length > 0 ? items : undefined,
      };
      await updateRequest.mutateAsync({
        id: params.id as string,
        data,
      });
      message.success("Request updated successfully!");
      router.push(`/requests/${params.id}`);
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      message.error(
        axiosError.response?.data?.detail || "Failed to update request"
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

  if (isLoading) return <div>Loading...</div>;
  if (!request) return <div>Request not found</div>;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Purchase Requests", href: "/dashboard/staff" },
          { label: request.title, href: `/requests/${request.id}` },
          { label: "Edit Request" },
        ]}
      />

      <Card>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">
            Edit Purchase Request #{request.id.slice(0, 8).toUpperCase()}
          </h1>
          <StatusBadge status={request.status} />
        </div>

        {!request.can_be_updated && (
          <Alert
            message="Request cannot be updated"
            description="Only pending requests without approvals can be updated."
            type="warning"
            className="mb-6"
          />
        )}

        {request.status === EPurchaseRequestStatus.PENDING &&
          request.can_be_updated && (
            <Alert
              message="Status: Pending Approval"
              description="You can edit the details below."
              type="info"
              className="mb-6"
            />
          )}

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
              label="Request Title"
              name="title"
              rules={[
                { required: true, message: "This field is required." },
                { min: 3, message: "Title must be at least 3 characters." },
              ]}
            >
              <Input placeholder="e.g., New Laptops for Design Team" />
            </Form.Item>

            <Form.Item label="Department" name="department">
              <Input placeholder="e.g., Marketing & Design" />
            </Form.Item>

            <div className="grid grid-cols-2 gap-4">
              <Form.Item label="Required By Date" name="required_by_date">
                <Input type="date" />
              </Form.Item>

              <Form.Item label="Submission Date">
                <Input
                  value={new Date(request.created_at).toLocaleDateString(
                    "en-US"
                  )}
                  disabled
                />
              </Form.Item>
            </div>
          </div>

          {/* Purchase Information Section */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4">Purchase Information</h2>
            <Form.Item label="Suggested Supplier" name="suggested_supplier">
              <Input placeholder="e.g., Tech Solutions Inc." />
            </Form.Item>

            <Form.Item label="Budget Code / Cost Center" name="budget_code">
              <Input placeholder="e.g., MKT-4012" />
            </Form.Item>

            <Form.Item
              label="Business Justification"
              name="description"
              rules={[{ required: true, message: "This field is required." }]}
            >
              <TextArea
                rows={4}
                placeholder="Current laptops are outdated and slowing down workflow..."
              />
            </Form.Item>
          </div>

          {/* Items Section */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4">Items</h2>
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
              <>
                <Table
                  columns={itemColumns}
                  dataSource={items.map((item, index) => ({
                    ...item,
                    key: index,
                  }))}
                  pagination={false}
                  size="small"
                />
                <div className="mt-4 text-right">
                  <p className="text-lg font-semibold">
                    Total: {formatCurrency(totalAmount)}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Attachments Section */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4">Attachments</h2>
            <FileUpload
              value={proformaUrl}
              onChange={setProformaUrl}
              accept=".pdf,.jpg,.jpeg,.png,.docx"
              maxSize={10}
            />
            {request.proforma_file_url && (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  Current: {request.proforma_file_url.split("/").pop()}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <Form.Item>
            <Space>
              <Button onClick={() => router.back()}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={updateRequest.isPending}
                disabled={!request.can_be_updated}
              >
                Save Changes
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
