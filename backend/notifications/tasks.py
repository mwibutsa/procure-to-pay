from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from purchase_requests.models import PurchaseRequest
from users.models import User
import logging

logger = logging.getLogger(__name__)


@shared_task
def send_approval_notification_task(request_id: str, notification_type: str, approver_id: str = None):
    """
    Send email notification for approval/rejection
    
    Args:
        request_id: PurchaseRequest ID
        notification_type: 'pending_next_level', 'approved', 'rejected'
        approver_id: User ID of the approver (optional)
    """
    try:
        request = PurchaseRequest.objects.select_related('created_by', 'organization').get(id=request_id)
        
        # Check if email notifications are enabled
        if not request.organization.email_notifications_enabled:
            logger.info(f"Email notifications disabled for organization {request.organization.id}")
            return
        
        if notification_type == 'pending_next_level':
            # Notify next approver
            next_level = request.current_approval_level + 1
            required_levels = request.get_required_approval_levels()
            
            if next_level > required_levels:
                # This shouldn't happen, but handle it
                return
            
            # Find approvers at next level
            approvers = User.objects.filter(
                organization=request.organization,
                role=User.Role.APPROVER,
                approval_level=next_level,
                is_active=True
            )
            
            for approver in approvers:
                subject = f"Purchase Request Pending Approval - {request.title}"
                message = f"""
                Hello {approver.first_name or approver.email},
                
                A purchase request requires your approval at level {next_level}.
                
                Request Details:
                - Title: {request.title}
                - Amount: ${request.amount}
                - Description: {request.description}
                - Created by: {request.created_by.email}
                
                Please review and approve or reject this request.
                
                Best regards,
                Procure-to-Pay System
                """
                
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [approver.email],
                    fail_silently=False,
                )
                logger.info(f"Approval notification sent to {approver.email}")
        
        elif notification_type == 'approved':
            # Notify requester
            subject = f"Purchase Request Approved - {request.title}"
            message = f"""
            Hello {request.created_by.first_name or request.created_by.email},
            
            Your purchase request has been approved!
            
            Request Details:
            - Title: {request.title}
            - Amount: ${request.amount}
            - Status: Approved
            
            A purchase order has been generated automatically.
            
            Best regards,
            Procure-to-Pay System
            """
            
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [request.created_by.email],
                fail_silently=False,
            )
            logger.info(f"Approval notification sent to {request.created_by.email}")
        
        elif notification_type == 'rejected':
            # Notify requester
            approver = None
            if approver_id:
                try:
                    approver = User.objects.get(id=approver_id)
                except User.DoesNotExist:
                    pass
            
            approver_name = approver.email if approver else "an approver"
            
            subject = f"Purchase Request Rejected - {request.title}"
            message = f"""
            Hello {request.created_by.first_name or request.created_by.email},
            
            Your purchase request has been rejected by {approver_name}.
            
            Request Details:
            - Title: {request.title}
            - Amount: ${request.amount}
            - Status: Rejected
            
            Please review the rejection comments and resubmit if needed.
            
            Best regards,
            Procure-to-Pay System
            """
            
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [request.created_by.email],
                fail_silently=False,
            )
            logger.info(f"Rejection notification sent to {request.created_by.email}")
        
    except Exception as e:
        logger.error(f"Error sending notification for request {request_id}: {str(e)}")
        raise

