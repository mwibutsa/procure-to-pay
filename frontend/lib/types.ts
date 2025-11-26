import { EDocumentType, EPurchaseRequestStatus, EUserRole } from "@/enums";

// User types
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: EUserRole;
  approval_level: number | null;
  organization: string;
  organization_name: string;
  is_active: boolean;
  created_at: string;
}

// Purchase Request types
export interface RequestItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Approval {
  id: string;
  approver: string;
  approver_email: string;
  approver_name: string;
  approval_level: number;
  action: "APPROVED" | "REJECTED";
  comments: string;
  timestamp: string;
}

export interface Document {
  id: string;
  document_type: EDocumentType;
  file_url: string;
  extracted_data: Record<string, unknown>;
  created_at: string;
}

export interface PurchaseRequest {
  id: string;
  organization: string;
  organization_name: string;
  title: string;
  description: string;
  amount: number;
  status: EPurchaseRequestStatus;
  created_by: string;
  created_by_email: string;
  created_by_name: string;
  updated_by: string | null;
  current_approval_level: number;
  proforma_file_url: string | null;
  purchase_order_file_url: string | null;
  receipt_file_url: string | null;
  items: RequestItem[];
  approvals: Approval[];
  documents: Document[];
  can_be_updated: boolean;
  required_approval_levels: number;
  created_at: string;
  updated_at: string;
}

// API Response types
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
  current_page?: number;
  page_size?: number;
}

export interface CreatePurchaseRequestData {
  title: string;
  description: string;
  amount: number;
  proforma_file_url?: string;
  items?: RequestItem[];
}

export interface UpdatePurchaseRequestData {
  title?: string;
  description?: string;
  amount?: number;
  proforma_file_url?: string;
  items?: RequestItem[];
}

export interface ApiError {
  detail?: string;
  message?: string;
  errors?: Record<string, string[]>;
}
