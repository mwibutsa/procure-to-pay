from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.mixins import CreateModelMixin
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from datetime import timedelta
from django.db.models import Q, Count, Sum
from django.db.models.functions import TruncMonth
from .models import PurchaseRequest, Approval
from .serializers import (
    PurchaseRequestSerializer,
    PurchaseRequestCreateSerializer,
    PurchaseRequestUpdateSerializer,
    ApproveRequestSerializer,
    RejectRequestSerializer,
    SubmitReceiptSerializer
)
from .services import ApprovalWorkflowService
from users.permissions import IsStaff, IsApprover, IsFinance, IsInOrganization
from documents.tasks import process_receipt_task


class PurchaseRequestViewSet(viewsets.ModelViewSet):
    """ViewSet for purchase requests"""
    queryset = PurchaseRequest.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'amount', 'status']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter queryset based on user role and organization"""
        base_queryset = PurchaseRequest.objects.filter(
            organization=self.request.user.organization
        )
        
        # Role-based filtering
        if self.request.user.role == self.request.user.Role.STAFF:
            # Staff can only see their own requests
            queryset = base_queryset.filter(created_by=self.request.user)
        elif self.request.user.role == self.request.user.Role.APPROVER:
            # Approvers can see pending requests they can act on + their reviewed requests
            # Get IDs from both querysets and then filter
            pending = ApprovalWorkflowService.get_pending_requests_for_approver(self.request.user)
            reviewed = PurchaseRequest.objects.filter(
                organization=self.request.user.organization,
                approvals__approver=self.request.user
            ).distinct()
            
            # Get IDs from both querysets
            pending_ids = list(pending.values_list('id', flat=True))
            reviewed_ids = list(reviewed.values_list('id', flat=True))
            all_ids = list(set(pending_ids + reviewed_ids))
            
            # Filter by IDs to avoid union() which doesn't support select_related
            queryset = base_queryset.filter(id__in=all_ids)
        elif self.request.user.role == self.request.user.Role.FINANCE:
            # Finance can see approved requests (or all if configured)
            if self.request.user.organization.finance_can_see_all:
                queryset = base_queryset
            else:
                queryset = base_queryset.filter(status=PurchaseRequest.Status.APPROVED)
        else:
            queryset = base_queryset
        
        # Additional filtering
        status_filter = self.request.query_params.get('status')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        amount_min = self.request.query_params.get('amount_min')
        amount_max = self.request.query_params.get('amount_max')
        
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)
        if amount_min:
            queryset = queryset.filter(amount__gte=amount_min)
        if amount_max:
            queryset = queryset.filter(amount__lte=amount_max)
        
        # Apply select_related and prefetch_related at the end
        return queryset.select_related('organization', 'created_by', 'updated_by').prefetch_related(
            'items', 'approvals__approver', 'documents'
        )
    
    def get_serializer_class(self):
        """Return appropriate serializer class"""
        if self.action == 'create':
            return PurchaseRequestCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return PurchaseRequestUpdateSerializer
        return PurchaseRequestSerializer
    
    def create(self, request, *args, **kwargs):
        """Override create to return full serializer data"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        # Use full serializer for response to include all fields
        instance = serializer.instance
        response_serializer = PurchaseRequestSerializer(instance)
        headers = self.get_success_headers(response_serializer.data)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def get_permissions(self):
        """Return appropriate permissions based on action"""
        if self.action == 'create':
            return [IsAuthenticated(), IsStaff()]
        elif self.action in ['update', 'partial_update']:
            return [IsAuthenticated(), IsStaff(), IsInOrganization()]
        elif self.action in ['approve', 'reject']:
            return [IsAuthenticated(), IsApprover(), IsInOrganization()]
        elif self.action == 'submit_receipt':
            return [IsAuthenticated(), IsStaff(), IsInOrganization()]
        return [IsAuthenticated()]
    
    def perform_create(self, serializer):
        """Create purchase request"""
        serializer.save(
            organization=self.request.user.organization,
            created_by=self.request.user
        )
    
    def create(self, request, *args, **kwargs):
        """Override create to return full serializer data"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        # Use full serializer for response to include all fields
        instance = serializer.instance
        response_serializer = PurchaseRequestSerializer(instance)
        headers = self.get_success_headers(response_serializer.data)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def update(self, request, *args, **kwargs):
        """Update purchase request (only if pending)"""
        instance = self.get_object()
        
        if not instance.can_be_updated:
            return Response(
                {'detail': 'Request cannot be updated. Only pending requests can be updated.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return super().update(request, *args, **kwargs)
    
    @action(detail=True, methods=['patch'])
    def approve(self, request, pk=None):
        """Approve a purchase request"""
        request_obj = self.get_object()
        serializer = ApproveRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            approval = ApprovalWorkflowService.approve_request(
                request_obj,
                request.user,
                comments=serializer.validated_data.get('comments', '')
            )
            return Response({
                'detail': 'Request approved successfully',
                'approval': {
                    'id': approval.id,
                    'approval_level': approval.approval_level,
                    'action': approval.action,
                    'timestamp': approval.timestamp
                }
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['patch'])
    def reject(self, request, pk=None):
        """Reject a purchase request"""
        request_obj = self.get_object()
        serializer = RejectRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            approval = ApprovalWorkflowService.reject_request(
                request_obj,
                request.user,
                comments=serializer.validated_data['comments']
            )
            return Response({
                'detail': 'Request rejected successfully',
                'approval': {
                    'id': approval.id,
                    'approval_level': approval.approval_level,
                    'action': approval.action,
                    'timestamp': approval.timestamp
                }
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def submit_receipt(self, request, pk=None):
        """Submit receipt for a purchase request"""
        from .utils import upload_file_to_cloudinary
        
        request_obj = self.get_object()
        serializer = SubmitReceiptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        if request_obj.status != PurchaseRequest.Status.APPROVED:
            return Response(
                {'detail': 'Receipt can only be submitted for approved requests.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Upload receipt file to Cloudinary
        receipt_file = serializer.validated_data['receipt_file']
        receipt_file_url = upload_file_to_cloudinary(
            receipt_file,
            folder=f'procure-to-pay/{request_obj.organization.id}/receipts'
        )
        
        if not receipt_file_url:
            return Response(
                {'detail': 'Failed to upload receipt file. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Update receipt file URL
        request_obj.receipt_file_url = receipt_file_url
        request_obj.updated_by = request.user
        request_obj.save()
        
        # Process receipt asynchronously
        process_receipt_task.delay(str(request_obj.id))
        
        return Response({
            'detail': 'Receipt submitted successfully. Validation in progress.'
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get dashboard statistics based on user role"""
        user = request.user
        organization = user.organization
        
        if user.role == user.Role.STAFF:
            # Staff statistics
            base_queryset = PurchaseRequest.objects.filter(
                organization=organization,
                created_by=user
            )
            
            total_requests = base_queryset.count()
            pending_approval = base_queryset.filter(status=PurchaseRequest.Status.PENDING).count()
            approved = base_queryset.filter(status=PurchaseRequest.Status.APPROVED).count()
            rejected = base_queryset.filter(status=PurchaseRequest.Status.REJECTED).count()
            
            # Calculate total amount for approved requests
            total_amount_result = base_queryset.filter(
                status=PurchaseRequest.Status.APPROVED
            ).aggregate(total=Sum('amount'))
            total_amount = float(total_amount_result['total'] or 0)
            
            return Response({
                'total_requests': total_requests,
                'pending_approval': pending_approval,
                'approved': approved,
                'rejected': rejected,
                'total_amount': total_amount
            })
        
        elif user.role == user.Role.APPROVER:
            # Approver statistics
            # Pending requests at user's approval level
            pending_requests = ApprovalWorkflowService.get_pending_requests_for_approver(user)
            pending_my_action = pending_requests.count()
            
            # Get current month start
            now = timezone.now()
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            # Approved by me this month
            approved_this_month = Approval.objects.filter(
                approver=user,
                action=Approval.Action.APPROVED,
                timestamp__gte=month_start
            ).count()
            
            # Rejected by me this month
            rejected_this_month = Approval.objects.filter(
                approver=user,
                action=Approval.Action.REJECTED,
                timestamp__gte=month_start
            ).count()
            
            # Total reviewed by me
            total_reviewed = Approval.objects.filter(approver=user).count()
            
            return Response({
                'pending_my_action': pending_my_action,
                'approved_this_month': approved_this_month,
                'rejected_this_month': rejected_this_month,
                'total_reviewed': total_reviewed
            })
        
        elif user.role == user.Role.FINANCE:
            # Finance statistics
            if organization.finance_can_see_all:
                base_queryset = PurchaseRequest.objects.filter(organization=organization)
            else:
                base_queryset = PurchaseRequest.objects.filter(
                    organization=organization,
                    status=PurchaseRequest.Status.APPROVED
                )
            
            total_approved_requests = base_queryset.filter(
                status=PurchaseRequest.Status.APPROVED
            ).count()
            
            # Total amount approved
            total_amount_result = base_queryset.filter(
                status=PurchaseRequest.Status.APPROVED
            ).aggregate(total=Sum('amount'))
            total_amount_approved = float(total_amount_result['total'] or 0)
            
            # Pending payments (approved requests without receipt)
            pending_payments = base_queryset.filter(
                status=PurchaseRequest.Status.APPROVED,
                receipt_file_url__isnull=True
            ).count()
            
            # Receipts pending (approved requests with receipt but not validated)
            receipts_pending = base_queryset.filter(
                status=PurchaseRequest.Status.APPROVED,
                receipt_file_url__isnull=False
            ).exclude(status=PurchaseRequest.Status.DISCREPANCY).count()
            
            return Response({
                'total_approved_requests': total_approved_requests,
                'total_amount_approved': total_amount_approved,
                'pending_payments': pending_payments,
                'receipts_pending': receipts_pending
            })
        
        else:
            return Response(
                {'detail': 'Statistics not available for this role.'},
                status=status.HTTP_403_FORBIDDEN
            )
