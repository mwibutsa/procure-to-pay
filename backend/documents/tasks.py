from celery import shared_task
from django.conf import settings
from purchase_requests.models import PurchaseRequest, Document
from .services import GeminiDocumentProcessor
from .po_generator import generate_purchase_order_pdf
import cloudinary.uploader
import logging

logger = logging.getLogger(__name__)


@shared_task
def process_proforma_task(request_id: str, file_url: str):
    """Process proforma invoice and extract data"""
    try:
        request = PurchaseRequest.objects.get(id=request_id)
        processor = GeminiDocumentProcessor()
        
        # Extract data
        extracted_data = processor.extract_proforma_data(file_url)
        
        # Save document
        Document.objects.create(
            request=request,
            document_type=Document.DocumentType.PROFORMA,
            file_url=file_url,
            extracted_data=extracted_data
        )
        
        logger.info(f"Proforma processed successfully for request {request_id}")
        
    except Exception as e:
        logger.error(f"Error processing proforma for request {request_id}: {str(e)}")
        raise


@shared_task
def generate_purchase_order_task(request_id: str):
    """Generate purchase order PDF after final approval"""
    try:
        request = PurchaseRequest.objects.get(id=request_id)
        
        # Get proforma data
        proforma_doc = request.documents.filter(
            document_type=Document.DocumentType.PROFORMA
        ).first()
        
        if not proforma_doc:
            logger.warning(f"No proforma document found for request {request_id}")
            return
        
        # Generate PO PDF
        po_data = proforma_doc.extracted_data
        pdf_buffer = generate_purchase_order_pdf(request, po_data)
        
        # Upload to Cloudinary
        upload_result = cloudinary.uploader.upload(
            pdf_buffer,
            resource_type='raw',
            folder='purchase_orders'
        )
        
        po_file_url = upload_result['secure_url']
        
        # Update request
        request.purchase_order_file_url = po_file_url
        request.save()
        
        # Save document
        Document.objects.create(
            request=request,
            document_type=Document.DocumentType.PO,
            file_url=po_file_url,
            extracted_data=po_data
        )
        
        logger.info(f"Purchase order generated successfully for request {request_id}")
        
    except Exception as e:
        logger.error(f"Error generating PO for request {request_id}: {str(e)}")
        raise


@shared_task
def process_receipt_task(request_id: str):
    """Process receipt and validate against PO"""
    try:
        request = PurchaseRequest.objects.get(id=request_id)
        
        if not request.receipt_file_url:
            logger.warning(f"No receipt file URL for request {request_id}")
            return
        
        processor = GeminiDocumentProcessor()
        
        # Extract receipt data
        receipt_data = processor.extract_receipt_data(request.receipt_file_url)
        
        # Get PO data
        po_doc = request.documents.filter(
            document_type=Document.DocumentType.PO
        ).first()
        
        if not po_doc:
            logger.warning(f"No PO document found for request {request_id}")
            # Save receipt document anyway
            Document.objects.create(
                request=request,
                document_type=Document.DocumentType.RECEIPT,
                file_url=request.receipt_file_url,
                extracted_data=receipt_data
            )
            return
        
        # Validate receipt against PO
        validation_result = processor.validate_receipt_against_po(
            receipt_data,
            po_doc.extracted_data
        )
        
        # Save receipt document with validation results
        Document.objects.create(
            request=request,
            document_type=Document.DocumentType.RECEIPT,
            file_url=request.receipt_file_url,
            extracted_data={
                **receipt_data,
                'validation': validation_result
            }
        )
        
        # Update request status if discrepancies found
        if not validation_result['is_valid']:
            request.status = PurchaseRequest.Status.DISCREPANCY
            request.save()
            logger.warning(f"Discrepancies found for request {request_id}: {validation_result['discrepancies']}")
        else:
            logger.info(f"Receipt validated successfully for request {request_id}")
        
    except Exception as e:
        logger.error(f"Error processing receipt for request {request_id}: {str(e)}")
        raise

