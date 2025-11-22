# File Upload Implementation

## Overview

The backend now handles all file uploads to Cloudinary. The frontend sends files directly to the backend via multipart/form-data, and the backend uploads them to Cloudinary automatically.

## Backend Changes

### 1. File Upload Utility (`backend/purchase_requests/utils.py`)

Created utility functions:
- `upload_file_to_cloudinary()` - Uploads files to Cloudinary and returns URL
- `validate_file_type()` - Validates file MIME types (PDF, images)
- `validate_file_size()` - Validates file size (10MB max)

### 2. Updated Serializers

**PurchaseRequestCreateSerializer:**
- Changed `proforma_file_url` (URLField) → `proforma_file` (FileField)
- Validates file type and size
- Uploads to Cloudinary in `create()` method
- Stores URL in `proforma_file_url` field

**PurchaseRequestUpdateSerializer:**
- Same changes as create serializer
- Replaces existing file if new one is uploaded

**SubmitReceiptSerializer:**
- Changed `receipt_file_url` (URLField) → `receipt_file` (FileField)
- Validates file type and size

### 3. Updated Views

**submit_receipt action:**
- Now accepts `receipt_file` (File) instead of `receipt_file_url`
- Uploads file to Cloudinary before saving

### 4. Parser Configuration

Added `MultiPartParser` to `REST_FRAMEWORK` settings to handle file uploads.

## API Endpoints

### Create Purchase Request
```
POST /api/requests/
Content-Type: multipart/form-data

Fields:
- title (string)
- description (string)
- amount (decimal)
- proforma_file (File, optional)
- items (JSON array, optional)
```

### Update Purchase Request
```
PUT /api/requests/{id}/
Content-Type: multipart/form-data

Fields:
- title (string)
- description (string)
- amount (decimal)
- proforma_file (File, optional)
- items (JSON array, optional)
```

### Submit Receipt
```
POST /api/requests/{id}/submit-receipt/
Content-Type: multipart/form-data

Fields:
- receipt_file (File, required)
```

## Frontend Implementation

### Example: Create Request with File

```typescript
const formData = new FormData();
formData.append('title', 'Office Supplies');
formData.append('description', 'Need office supplies');
formData.append('amount', '1500.00');
formData.append('proforma_file', file); // File object from input

const response = await api.post('/requests/', formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});
```

### Example: Submit Receipt

```typescript
const formData = new FormData();
formData.append('receipt_file', file); // File object

const response = await api.post(`/requests/${id}/submit-receipt/`, formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});
```

## File Validation

### Allowed Types
- PDF: `application/pdf`
- Images: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`

### File Size Limit
- Maximum: 10MB per file

### Validation Errors
Backend returns validation errors if:
- File type is not allowed
- File size exceeds 10MB
- Cloudinary upload fails

## Cloudinary Folder Structure

Files are organized in Cloudinary by organization:
```
procure-to-pay/
  {organization_id}/
    proformas/
      {filename}
    receipts/
      {filename}
```

## Error Handling

If Cloudinary upload fails:
- Backend returns 500 error with message
- Frontend should show error to user
- User can retry upload

## Testing

To test file uploads:
1. Ensure Cloudinary credentials are set in `.env`
2. Use Postman or similar tool to send multipart/form-data
3. Check Cloudinary dashboard for uploaded files
4. Verify URLs are stored in database

