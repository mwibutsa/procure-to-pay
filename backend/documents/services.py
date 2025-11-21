import json
import requests
from typing import Dict, Any, Optional
from django.conf import settings
from google import genai


class GeminiDocumentProcessor:
    """Service for processing documents using Google Gemini API"""
    
    def __init__(self):
        """Initialize Gemini API"""
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            raise ValueError("GEMINI_API_KEY not configured")
        # Client reads from GEMINI_API_KEY env var, but we can also pass it
        import os
        os.environ['GEMINI_API_KEY'] = api_key
        self.client = genai.Client()
    
    def extract_proforma_data(self, file_url: str) -> Dict[str, Any]:
        """
        Extract data from proforma invoice
        
        Args:
            file_url: URL of the proforma file (Cloudinary URL)
        
        Returns:
            Dictionary with extracted data: vendor, items, prices, terms
        """
        prompt = """
        Analyze this proforma invoice document and extract the following information in JSON format:
        {
            "vendor_name": "name of the vendor/company",
            "vendor_address": "vendor address if available",
            "vendor_email": "vendor email if available",
            "items": [
                {
                    "description": "item description",
                    "quantity": number,
                    "unit_price": number,
                    "total": number
                }
            ],
            "total_amount": number,
            "currency": "currency code",
            "terms": "payment terms if mentioned",
            "validity": "validity period if mentioned"
        }
        
        Extract all items and their details. Return only valid JSON.
        """
        
        try:
            # Download file from URL
            response = requests.get(file_url, timeout=30, stream=True)
            response.raise_for_status()
            
            # Get file content
            file_content = response.content
            mime_type = response.headers.get('Content-Type', 'application/pdf')
            
            # Process with Gemini
            # For file content, we need to use the proper format
            # The new API might require uploading the file first or using inline data
            import base64
            
            # Convert file to base64 for inline inclusion
            file_base64 = base64.b64encode(file_content).decode('utf-8')
            
            # Create content with file data
            contents = [
                prompt,
                {
                    "inline_data": {
                        "mime_type": mime_type,
                        "data": file_base64
                    }
                }
            ]
            
            response_obj = self.client.models.generate_content(
                model="gemini-2.0-flash-exp",
                contents=contents
            )
            
            # Parse JSON response
            text = response_obj.text.strip()
            # Remove markdown code blocks if present
            if text.startswith('```'):
                text = text.split('```')[1]
                if text.startswith('json'):
                    text = text[4:]
                text = text.strip()
            
            extracted_data = json.loads(text)
            return extracted_data
        
        except Exception as e:
            raise Exception(f"Error extracting proforma data: {str(e)}")
    
    def extract_receipt_data(self, file_url: str) -> Dict[str, Any]:
        """
        Extract data from receipt
        
        Args:
            file_url: URL of the receipt file (Cloudinary URL)
        
        Returns:
            Dictionary with extracted data: seller, items, prices, total
        """
        prompt = """
        Analyze this receipt document and extract the following information in JSON format:
        {
            "seller_name": "name of the seller/vendor",
            "seller_address": "seller address if available",
            "items": [
                {
                    "description": "item description",
                    "quantity": number,
                    "unit_price": number,
                    "total": number
                }
            ],
            "total_amount": number,
            "currency": "currency code",
            "date": "purchase date if available",
            "payment_method": "payment method if mentioned"
        }
        
        Extract all items and their details. Return only valid JSON.
        """
        
        try:
            # Download file from URL
            response = requests.get(file_url, timeout=30, stream=True)
            response.raise_for_status()
            
            # Get file content
            file_content = response.content
            mime_type = response.headers.get('Content-Type', 'application/pdf')
            
            # Process with Gemini
            # For file content, we need to use the proper format
            # The new API might require uploading the file first or using inline data
            import base64
            
            # Convert file to base64 for inline inclusion
            file_base64 = base64.b64encode(file_content).decode('utf-8')
            
            # Create content with file data
            contents = [
                prompt,
                {
                    "inline_data": {
                        "mime_type": mime_type,
                        "data": file_base64
                    }
                }
            ]
            
            response_obj = self.client.models.generate_content(
                model="gemini-2.0-flash-exp",
                contents=contents
            )
            
            # Parse JSON response
            text = response_obj.text.strip()
            # Remove markdown code blocks if present
            if text.startswith('```'):
                text = text.split('```')[1]
                if text.startswith('json'):
                    text = text[4:]
                text = text.strip()
            
            extracted_data = json.loads(text)
            return extracted_data
        
        except Exception as e:
            raise Exception(f"Error extracting receipt data: {str(e)}")
    
    def validate_receipt_against_po(self, receipt_data: Dict[str, Any], po_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate receipt against purchase order
        
        Args:
            receipt_data: Extracted receipt data
            po_data: Purchase order data
        
        Returns:
            Dictionary with validation results and discrepancies
        """
        discrepancies = []
        
        # Check seller name
        receipt_seller = receipt_data.get('seller_name', '').lower().strip()
        po_vendor = po_data.get('vendor_name', '').lower().strip()
        if receipt_seller != po_vendor:
            discrepancies.append({
                'type': 'seller_mismatch',
                'message': f"Seller name mismatch: Receipt shows '{receipt_data.get('seller_name')}' but PO shows '{po_data.get('vendor_name')}'"
            })
        
        # Check items
        receipt_items = receipt_data.get('items', [])
        po_items = po_data.get('items', [])
        
        if len(receipt_items) != len(po_items):
            discrepancies.append({
                'type': 'item_count_mismatch',
                'message': f"Item count mismatch: Receipt has {len(receipt_items)} items but PO has {len(po_items)} items"
            })
        
        # Check each item
        for i, po_item in enumerate(po_items):
            if i < len(receipt_items):
                receipt_item = receipt_items[i]
                
                # Check description
                if receipt_item.get('description', '').lower() != po_item.get('description', '').lower():
                    discrepancies.append({
                        'type': 'item_description_mismatch',
                        'message': f"Item {i+1} description mismatch"
                    })
                
                # Check quantity
                if abs(float(receipt_item.get('quantity', 0)) - float(po_item.get('quantity', 0))) > 0.01:
                    discrepancies.append({
                        'type': 'item_quantity_mismatch',
                        'message': f"Item {i+1} quantity mismatch: Receipt shows {receipt_item.get('quantity')} but PO shows {po_item.get('quantity')}"
                    })
                
                # Check unit price (allow 5% tolerance)
                receipt_price = float(receipt_item.get('unit_price', 0))
                po_price = float(po_item.get('unit_price', 0))
                if po_price > 0 and abs(receipt_price - po_price) / po_price > 0.05:
                    discrepancies.append({
                        'type': 'item_price_mismatch',
                        'message': f"Item {i+1} price mismatch: Receipt shows {receipt_price} but PO shows {po_price}"
                    })
        
        # Check total amount (allow 5% tolerance)
        receipt_total = float(receipt_data.get('total_amount', 0))
        po_total = float(po_data.get('total_amount', 0))
        if po_total > 0 and abs(receipt_total - po_total) / po_total > 0.05:
            discrepancies.append({
                'type': 'total_amount_mismatch',
                'message': f"Total amount mismatch: Receipt shows {receipt_total} but PO shows {po_total}"
            })
        
        return {
            'is_valid': len(discrepancies) == 0,
            'discrepancies': discrepancies,
            'receipt_data': receipt_data,
            'po_data': po_data
        }

