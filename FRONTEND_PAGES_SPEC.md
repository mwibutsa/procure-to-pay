# Frontend Pages Specification

This document lists all pages needed for the Procure-to-Pay frontend with detailed specifications based on backend API capabilities.

## Page List Overview

1. **Login Page** (`/login`)
2. **Staff Dashboard** (`/dashboard/staff`)
3. **Approver Dashboard** (`/dashboard/approver`)
4. **Finance Dashboard** (`/dashboard/finance`)
5. **Create Purchase Request** (`/requests/new`)
6. **Purchase Request Detail** (`/requests/[id]`)
7. **Edit Purchase Request** (`/requests/[id]/edit`) - Optional, can be part of detail page

---

## 1. Login Page (`/login`)

### Purpose

User authentication entry point

### Data Available from Backend

- `POST /api/auth/login/` - Returns: `{ access: string, user: User }`
- `POST /api/auth/refresh/` - Token refresh
- `GET /api/auth/me/` - Current user info

### Fields to Display

- Email input field
- Password input field
- "Remember me" checkbox (optional)
- Login button
- Error message display area
- Loading state during login

### User Object Structure (from API)

```typescript
{
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "STAFF" | "APPROVER" | "FINANCE";
  approval_level: number | null;
  organization: string(UUID);
  organization_name: string;
  is_active: boolean;
  created_at: string;
}
```

### Behavior

- On successful login, redirect based on role:
  - STAFF → `/dashboard/staff`
  - APPROVER → `/dashboard/approver`
  - FINANCE → `/dashboard/finance`
- Store JWT token in httpOnly cookie
- Show error messages for failed login

---

## 2. Staff Dashboard (`/dashboard/staff`)

### Purpose

Main dashboard for staff users to view and manage their purchase requests

### Data Available from Backend

- `GET /api/requests/` - Returns paginated list of user's requests
- Filters: `status`, `date_from`, `date_to`, `amount_min`, `amount_max`, `search`
- Staff only sees their own requests (filtered automatically by backend)

### Dashboard Components Needed

#### A. Header/Navigation

- User profile section (name, email, role badge)
- Logout button
- Navigation menu (if needed)

#### B. Statistics Cards (Top Section)

Display key metrics:

- **Total Requests**: Count of all user's requests
- **Pending Requests**: Count with status=PENDING
- **Approved Requests**: Count with status=APPROVED
- **Total Amount**: Sum of all approved requests (or all requests)
- **This Month**: Requests created this month

#### C. Quick Actions

- **Create New Request** button (prominent, primary color)
- **View All Requests** link
- **Filter by Status** quick filters (All, Pending, Approved, Rejected)

#### D. Recent Requests Table/List

Columns:

- **Title** (clickable, links to detail page)
- **Amount** (formatted as currency)
- **Status** (badge with color coding)
  - PENDING: Orange/Yellow
  - APPROVED: Green
  - REJECTED: Red
  - DISCREPANCY: Purple
- **Created Date** (formatted, e.g., "2 days ago")
- **Current Approval Level** (e.g., "Level 1/2")
- **Actions** (View, Edit if pending)

#### E. Filters & Search

- Search bar (searches title and description)
- Status filter dropdown
- Date range picker
- Amount range filter
- Clear filters button

#### F. Pagination

- Page size selector (10, 20, 50)
- Page navigation (Previous, Next, page numbers)
- Total count display

### Purchase Request List Item Data Structure

```typescript
{
  id: string (UUID)
  title: string
  description: string
  amount: number
  status: "PENDING" | "APPROVED" | "REJECTED" | "DISCREPANCY"
  created_by_email: string
  created_by_name: string
  current_approval_level: number
  required_approval_levels: number
  proforma_file_url: string | null
  purchase_order_file_url: string | null
  receipt_file_url: string | null
  created_at: string (ISO datetime)
  updated_at: string (ISO datetime)
  can_be_updated: boolean
}
```

### Empty States

- No requests: "You haven't created any requests yet. Create your first request!"
- No results after filter: "No requests match your filters. Try adjusting your search."

---

## 3. Approver Dashboard (`/dashboard/approver`)

### Purpose

Dashboard for approvers to see pending requests requiring their approval

### Data Available from Backend

- `GET /api/requests/` - Returns requests pending at user's approval level + reviewed requests
- Backend automatically filters to show only requests approver can act on

### Dashboard Components Needed

#### A. Header/Navigation

- User profile (name, email, role badge showing "Approver Level X")
- Logout button
- Notification indicator (if pending requests exist)

#### B. Statistics Cards

- **Pending for Approval**: Count of requests waiting at user's level
- **Approved by Me**: Count of requests user has approved
- **Rejected by Me**: Count of requests user has rejected
- **Total Reviewed**: Total requests user has acted on

#### C. Pending Approvals Section

**Priority section** - Requests requiring immediate action

Table columns:

- **Title** (clickable)
- **Amount** (formatted currency)
- **Created By** (staff member name/email)
- **Current Level** (e.g., "Level 1/2")
- **Created Date**
- **Urgency Indicator** (if needed - based on age)
- **Actions** (Quick Approve, View Details)

#### D. My Approvals Section

History of requests user has reviewed

Table columns:

- **Title**
- **Amount**
- **My Action** (Approved/Rejected badge)
- **My Approval Level**
- **Final Status** (if fully approved/rejected)
- **Action Date**
- **View Details** link

#### E. Filters

- Filter by: Pending, Approved by Me, Rejected by Me, All
- Search functionality
- Sort by: Date, Amount, Status

### Special Features

- **Bulk Actions** (optional): Select multiple requests for batch approval
- **Quick Approve Modal**: Approve without opening full detail page
- **Approval Queue**: Visual indicator of approval progress

---

## 4. Finance Dashboard (`/dashboard/finance`)

### Purpose

Dashboard for finance team to view approved requests

### Data Available from Backend

- `GET /api/requests/` - Returns approved requests (or all if `finance_can_see_all` setting is true)
- Finance can only see APPROVED status requests by default

### Dashboard Components Needed

#### A. Header/Navigation

- User profile section
- Logout button
- Organization name display

#### B. Statistics Cards

- **Total Approved Requests**: Count
- **Total Amount Approved**: Sum of all approved request amounts
- **This Month**: Approved requests this month
- **Pending Payment**: Requests with receipt submitted (optional)

#### C. Approved Requests Table

Columns:

- **Title** (clickable)
- **Amount** (formatted currency)
- **Created By** (staff member)
- **Approved Date** (when final approval happened)
- **Purchase Order**: Link/button to view/download PO
- **Receipt Status**:
  - "Not Submitted" (if no receipt)
  - "Submitted" (if receipt exists)
  - "Discrepancy" (if validation found issues)
- **Actions**: View Details, Download PO, Upload Payment Docs

#### D. Filters & Search

- Search by title/description
- Date range filter
- Amount range filter
- Receipt status filter (All, Not Submitted, Submitted, Discrepancy)
- Sort options

#### E. Financial Summary (Optional)

- Chart showing approved amounts over time
- Breakdown by department/category (if available)
- Export to CSV/Excel functionality

---

## 5. Create Purchase Request Page (`/requests/new`)

### Purpose

Form for staff to create new purchase requests

### Data Available from Backend

- `POST /api/requests/` - Creates new request
- Request body: `FormData` with `{ title, description, amount, proforma_file (File), items? }`
- Backend handles Cloudinary upload automatically

### Form Fields

#### Required Fields

1. **Title** (Text input)

   - Max length: 255 characters
   - Placeholder: "e.g., Office Supplies for Q1 2024"
   - Validation: Required, min 3 characters

2. **Description** (Textarea)

   - Multi-line text
   - Placeholder: "Describe what you need to purchase and why..."
   - Validation: Required, min 10 characters

3. **Amount** (Number input)
   - Currency format ($)
   - Decimal places: 2
   - Min: 0
   - Validation: Required, must be > 0

#### Optional Fields

4. **Proforma Invoice** (File upload)

   - Send file directly to backend (multipart/form-data)
   - Backend uploads to Cloudinary automatically
   - Accept: PDF, images (PNG, JPG, JPEG, WEBP)
   - Max file size: 10MB
   - Display file preview before submission
   - Show upload progress during API call
   - Backend returns the Cloudinary URL after successful upload

5. **Line Items** (Optional - can add multiple)
   - Description (text)
   - Quantity (number)
   - Unit Price (currency)
   - Total (auto-calculated)
   - Add/Remove item buttons
   - Items total should match main amount (validation)

### Form Layout

- Card/Container with title "Create Purchase Request"
- Form sections with clear labels
- File upload area with drag-and-drop
- Line items section (collapsible/expandable)
- Form actions: Submit (primary), Cancel (secondary)
- Loading state during submission
- Success message with redirect to detail page

### Validation

- Client-side validation before submission
- Show field-level errors
- Disable submit button if invalid
- Amount validation: must match sum of line items (if provided)

### Success Flow

- Show success message
- Redirect to `/requests/[id]` (newly created request)

---

## 6. Purchase Request Detail Page (`/requests/[id]`)

### Purpose

View complete details of a purchase request with all information and actions

### Data Available from Backend

- `GET /api/requests/{id}/` - Full request details with nested data
- `PUT /api/requests/{id}/` - Update (staff, if pending) - FormData with `proforma_file` (File)
- `PATCH /api/requests/{id}/approve/` - Approve (approver)
- `PATCH /api/requests/{id}/reject/` - Reject (approver)
- `POST /api/requests/{id}/submit-receipt/` - Submit receipt (staff) - FormData with `receipt_file` (File)

### Page Layout

#### A. Header Section

- **Title** (large, prominent)
- **Status Badge** (color-coded, large)
- **Request ID** (small, monospace font)
- **Action Buttons** (role-based):
  - Staff (if pending): Edit, Submit Receipt (if approved)
  - Approver (if pending): Approve, Reject
  - Finance: Download PO, Upload Payment Docs

#### B. Main Information Card

Two-column layout:

**Left Column:**

- **Amount** (large, prominent currency display)
- **Description** (full text, formatted)
- **Created By**: Name and email
- **Organization**: Organization name
- **Created Date**: Formatted datetime
- **Last Updated**: Formatted datetime

**Right Column:**

- **Current Approval Level**: Progress indicator (e.g., "Level 1 of 2")
- **Required Approvals**: Total levels needed
- **Approval Progress Bar**: Visual progress (e.g., 50% if 1 of 2 approved)

#### C. Approval History Section

Timeline/List view showing:

- Each approval/rejection
- Approver name and email
- Approval level
- Action (Approved/Rejected)
- Comments (if any)
- Timestamp
- Visual timeline connecting approvals

**Data Structure:**

```typescript
{
  id: string;
  approver_email: string;
  approver_name: string;
  approval_level: number;
  action: "APPROVED" | "REJECTED";
  comments: string;
  timestamp: string;
}
```

#### D. Documents Section

Tabs or cards for each document type:

1. **Proforma Invoice**

   - File preview/thumbnail
   - Download button
   - Upload date
   - Extracted data display (if available):
     - Vendor name
     - Items list
     - Total amount
     - Terms

2. **Purchase Order**

   - Generated PO document
   - PO Number
   - Download button
   - Generated date
   - Status: "Generated" or "Not Generated"

3. **Receipt**
   - Receipt file preview
   - Upload date
   - Validation status:
     - "Valid" (green)
     - "Discrepancies Found" (red/yellow)
   - Discrepancy details (if any):
     - Item mismatches
     - Price differences
     - Seller name mismatch

**Document Data Structure:**

```typescript
{
  id: string
  document_type: "PROFORMA" | "PO" | "RECEIPT"
  file_url: string
  extracted_data: {
    vendor_name?: string
    items?: Array<{
      description: string
      quantity: number
      unit_price: number
      total: number
    }>
    total_amount?: number
    currency?: string
    terms?: string
    // For receipts:
    seller_name?: string
    validation?: {
      is_valid: boolean
      discrepancies: Array<{
        type: string
        message: string
      }>
    }
  }
  created_at: string
}
```

#### E. Line Items Section (if available)

Table showing:

- Description
- Quantity
- Unit Price
- Total
- Subtotal calculation

#### F. Action Modals

**Approve Modal:**

- Comments field (optional, textarea)
- Approve button
- Cancel button
- Confirmation message

**Reject Modal:**

- Comments field (required, textarea)
- Reject button (red/danger style)
- Cancel button
- Warning message about rejection being final

**Submit Receipt Modal:**

- File upload area (drag & drop or file picker)
- File preview before submission
- Upload progress during API call
- Submit button (sends file to backend)
- Cancel button
- Backend handles Cloudinary upload automatically

**Edit Modal (Staff only, if pending):**

- Same form as create page
- Pre-filled with current values
- Update button
- Cancel button

---

## 7. Edit Purchase Request Page (`/requests/[id]/edit`) - Optional

### Purpose

Allow staff to edit pending requests

### Data Available

- `GET /api/requests/{id}/` - Get current data
- `PUT /api/requests/{id}/` - Update request

### Form

- Same as Create Request form
- Pre-populated with existing data
- Only editable if `can_be_updated: true`
- Show warning if request is not pending
- Save changes button
- Cancel (returns to detail page)

---

## Additional UI Components Needed

### 1. Navigation/Layout Component

- Sidebar or top navigation
- Role-based menu items
- User profile dropdown
- Logout option
- Breadcrumbs (for nested pages)

### 2. Status Badges Component

Reusable status badge with colors:

- PENDING: Orange/Yellow
- APPROVED: Green
- REJECTED: Red
- DISCREPANCY: Purple

### 3. File Upload Component

- Drag and drop area
- File picker button
- Progress indicator
- File preview
- Remove file option
- Upload to Cloudinary integration

### 4. Approval Progress Component

- Visual progress bar
- Level indicators
- Current position highlight
- "Level X of Y" text

### 5. Timeline Component

- For approval history
- Vertical timeline with icons
- Connection lines
- Color coding (approved=green, rejected=red)

### 6. Statistics Cards Component

- Icon
- Title
- Value (large, prominent)
- Subtitle/description
- Optional trend indicator

### 7. Data Table Component

- Sortable columns
- Filterable
- Pagination
- Row actions
- Responsive (mobile-friendly)
- Loading states
- Empty states

### 8. Modal/Dialog Components

- Approve modal
- Reject modal
- Confirm dialogs
- File upload modal
- Form modals

---

## API Endpoints Summary

### Authentication

- `POST /api/auth/login/` - Login
- `POST /api/auth/logout/` - Logout
- `POST /api/auth/refresh/` - Refresh token
- `GET /api/auth/me/` - Current user

### Purchase Requests

- `GET /api/requests/` - List (with filters, pagination)
- `GET /api/requests/{id}/` - Detail
- `POST /api/requests/` - Create (FormData: title, description, amount, proforma_file (File), items)
- `PUT /api/requests/{id}/` - Update (if pending) (FormData: same as create)
- `PATCH /api/requests/{id}/approve/` - Approve (JSON: comments?)
- `PATCH /api/requests/{id}/reject/` - Reject (JSON: comments)
- `POST /api/requests/{id}/submit-receipt/` - Submit receipt (FormData: receipt_file (File))

**Note:** All file uploads are handled by the backend. Frontend sends files via FormData, backend uploads to Cloudinary and stores the URL.

### Response Format

```typescript
// List response
{
  count: number
  next: string | null
  previous: string | null
  results: PurchaseRequest[]
}

// Single item response
PurchaseRequest (with nested approvals, documents, items)
```

---

## Design Requirements

### Color Scheme

- Primary: Professional blue (#1890ff or similar)
- Success/Approved: Green (#52c41a)
- Warning/Pending: Orange (#faad14)
- Error/Rejected: Red (#ff4d4f)
- Info: Blue (#1890ff)
- Background: Light gray (#f5f5f5)
- Card background: White (#ffffff)

### Typography

- Headings: Bold, clear hierarchy
- Body: Readable, appropriate line height
- Monospace: For IDs, amounts

### Spacing

- Consistent padding/margins
- Card spacing: 16-24px
- Section spacing: 32-48px

### Responsive Design

- Mobile-first approach
- Breakpoints: Mobile (< 768px), Tablet (768-1024px), Desktop (> 1024px)
- Tables should be scrollable on mobile or use card layout

### Accessibility

- Proper ARIA labels
- Keyboard navigation
- Focus indicators
- Color contrast compliance
- Screen reader friendly

---

## Implementation Notes

1. **State Management**: Use TanStack Query for all server state
2. **Error Handling**: Show user-friendly error messages
3. **Loading States**: Show spinners/skeletons during data fetching
4. **Optimistic Updates**: Update UI immediately, rollback on error
5. **File Uploads**: Use Cloudinary widget or direct upload API
6. **Real-time Updates**: Consider polling or WebSockets for status changes (optional)
7. **Caching**: TanStack Query handles caching automatically
8. **Pagination**: Implement infinite scroll or traditional pagination

---

## Page Priority

**High Priority (MVP):**

1. Login Page
2. Staff Dashboard
3. Create Purchase Request
4. Purchase Request Detail
5. Approver Dashboard

**Medium Priority:** 6. Finance Dashboard 7. Edit Purchase Request

**Nice to Have:**

- Analytics/Charts
- Export functionality
- Advanced filters
- Bulk actions
- Notifications center

---

This specification provides all the details needed to generate comprehensive UI designs. Each page should be modern, clean, and professional, following best practices for dashboard and form design.
