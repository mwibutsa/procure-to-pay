from django.db import transaction
from django.core.exceptions import ValidationError
from .models import PurchaseRequest, Approval
from documents.tasks import generate_purchase_order_task
from notifications.tasks import send_approval_notification_task


class ApprovalWorkflowService:
    """Service for handling approval workflow"""
    
    @staticmethod
    def can_approve_at_level(request: PurchaseRequest, user, approval_level: int) -> tuple[bool, str]:
        """
        Check if user can approve at the specified level
        
        Returns:
            tuple: (can_approve: bool, reason: str)
        """
        # Check if request is pending
        if not request.is_pending:
            return False, "Request is not pending"
        
        # Check if user is approver
        if user.role != user.Role.APPROVER:
            return False, "User is not an approver"
        
        # Check if user's approval level matches
        if user.approval_level != approval_level:
            return False, f"User's approval level ({user.approval_level}) does not match required level ({approval_level})"
        
        # Check if previous levels have been approved
        required_levels = request.get_required_approval_levels()
        
        # Level 1 can always approve if no previous approvals needed
        if approval_level == 1:
            # Check if level 1 already approved
            if Approval.objects.filter(
                request=request,
                approval_level=1,
                action=Approval.Action.APPROVED
            ).exists():
                return False, "Level 1 has already approved this request"
            return True, "Can approve at level 1"
        
        # For higher levels, check if previous level approved
        previous_level = approval_level - 1
        previous_approval = Approval.objects.filter(
            request=request,
            approval_level=previous_level,
            action=Approval.Action.APPROVED
        ).first()
        
        if not previous_approval:
            return False, f"Previous level ({previous_level}) has not been approved yet"
        
        # Check if this level already approved
        if Approval.objects.filter(
            request=request,
            approval_level=approval_level,
            action=Approval.Action.APPROVED
        ).exists():
            return False, f"Level {approval_level} has already approved this request"
        
        return True, f"Can approve at level {approval_level}"
    
    @staticmethod
    @transaction.atomic
    def approve_request(request: PurchaseRequest, user, comments: str = "") -> Approval:
        """
        Approve a request at the user's approval level
        
        Args:
            request: PurchaseRequest instance
            user: User instance (must be approver)
            comments: Optional comments
        
        Returns:
            Approval instance
        
        Raises:
            ValidationError: If approval is not allowed
        """
        if not request.is_pending:
            raise ValidationError("Request is not pending")
        
        if user.role != user.Role.APPROVER:
            raise ValidationError("User is not an approver")
        
        approval_level = user.approval_level
        if approval_level is None:
            raise ValidationError("User does not have an approval level")
        
        # Check if can approve
        can_approve, reason = ApprovalWorkflowService.can_approve_at_level(
            request, user, approval_level
        )
        
        if not can_approve:
            raise ValidationError(reason)
        
        # Create approval record
        approval = Approval.objects.create(
            request=request,
            approver=user,
            approval_level=approval_level,
            action=Approval.Action.APPROVED,
            comments=comments
        )
        
        # Update request's current approval level
        request.current_approval_level = approval_level
        request.updated_by = user
        
        # Check if this is the final approval
        required_levels = request.get_required_approval_levels()
        if approval_level >= required_levels:
            # Final approval - mark as approved and generate PO
            request.status = PurchaseRequest.Status.APPROVED
            request.save()
            
            # Generate PO asynchronously
            generate_purchase_order_task.delay(str(request.id))
            
            # Send notification
            send_approval_notification_task.delay(
                str(request.id),
                'approved',
                str(user.id)
            )
        else:
            # Not final approval - send notification to next approver
            request.save()
            send_approval_notification_task.delay(
                str(request.id),
                'pending_next_level',
                str(user.id)
            )
        
        return approval
    
    @staticmethod
    @transaction.atomic
    def reject_request(request: PurchaseRequest, user, comments: str = "") -> Approval:
        """
        Reject a request
        
        Args:
            request: PurchaseRequest instance
            user: User instance (must be approver)
            comments: Rejection comments (required)
        
        Returns:
            Approval instance
        
        Raises:
            ValidationError: If rejection is not allowed
        """
        if not request.is_pending:
            raise ValidationError("Request is not pending")
        
        if user.role != user.Role.APPROVER:
            raise ValidationError("User is not an approver")
        
        if not comments:
            raise ValidationError("Rejection comments are required")
        
        approval_level = user.approval_level
        if approval_level is None:
            raise ValidationError("User does not have an approval level")
        
        # Check if can approve at this level (same check for rejection)
        can_approve, reason = ApprovalWorkflowService.can_approve_at_level(
            request, user, approval_level
        )
        
        if not can_approve:
            raise ValidationError(f"Cannot reject: {reason}")
        
        # Create rejection record
        approval = Approval.objects.create(
            request=request,
            approver=user,
            approval_level=approval_level,
            action=Approval.Action.REJECTED,
            comments=comments
        )
        
        # Mark request as rejected
        request.status = PurchaseRequest.Status.REJECTED
        request.current_approval_level = approval_level
        request.updated_by = user
        request.save()
        
        # Send notification
        send_approval_notification_task.delay(
            str(request.id),
            'rejected',
            str(user.id)
        )
        
        return approval
    
    @staticmethod
    def get_pending_requests_for_approver(user):
        """
        Get pending requests that the approver can act on
        
        Args:
            user: User instance (must be approver)
        
        Returns:
            QuerySet of PurchaseRequest instances
        """
        if user.role != user.Role.APPROVER:
            return PurchaseRequest.objects.none()
        
        approval_level = user.approval_level
        if approval_level is None:
            return PurchaseRequest.objects.none()
        
        # Get requests in user's organization
        requests = PurchaseRequest.objects.filter(
            organization=user.organization,
            status=PurchaseRequest.Status.PENDING
        )
        
        # Filter by approval level
        if approval_level == 1:
            # Level 1 can see all pending requests that haven't been approved at level 1
            return requests.exclude(
                approvals__approval_level=1,
                approvals__action=Approval.Action.APPROVED
            )
        else:
            # Higher levels can only see requests approved at previous level
            previous_level = approval_level - 1
            return requests.filter(
                approvals__approval_level=previous_level,
                approvals__action=Approval.Action.APPROVED
            ).exclude(
                approvals__approval_level=approval_level,
                approvals__action=Approval.Action.APPROVED
            )

