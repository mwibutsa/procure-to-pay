from django.db import models
from django.core.validators import MinValueValidator
from organizations.models import Organization
from users.models import User
import uuid


class PurchaseRequest(models.Model):
    """Purchase Request model"""
    
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
        DISCREPANCY = 'DISCREPANCY', 'Discrepancy'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='purchase_requests'
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_requests'
    )
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='updated_requests',
        null=True,
        blank=True
    )
    
    # File URLs (stored in Cloudinary)
    proforma_file_url = models.URLField(max_length=500, blank=True, null=True)
    purchase_order_file_url = models.URLField(max_length=500, blank=True, null=True)
    receipt_file_url = models.URLField(max_length=500, blank=True, null=True)
    
    # Current approval tracking
    current_approval_level = models.IntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'status']),
            models.Index(fields=['created_by', 'status']),
            models.Index(fields=['status', 'created_at']),
        ]

    def __str__(self):
        return f"{self.title} - {self.get_status_display()}"

    @property
    def is_pending(self):
        """Check if request is pending"""
        return self.status == self.Status.PENDING

    @property
    def is_approved(self):
        """Check if request is approved"""
        return self.status == self.Status.APPROVED

    @property
    def is_rejected(self):
        """Check if request is rejected"""
        return self.status == self.Status.REJECTED

    @property
    def can_be_updated(self):
        """Check if request can be updated (only if pending and no approvals yet)"""
        # Cannot update if status is not pending
        if self.status != self.Status.PENDING:
            return False
        # Cannot update if any approval has been made (even if still pending)
        if self.approvals.exists():
            return False
        return True

    def get_required_approval_levels(self):
        """Get the number of required approval levels from organization"""
        return self.organization.approval_levels_count

    def is_final_approval(self):
        """Check if this is the final approval level"""
        return self.current_approval_level >= self.get_required_approval_levels()


class Approval(models.Model):
    """Approval history model"""
    
    class Action(models.TextChoices):
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
    
    request = models.ForeignKey(
        PurchaseRequest,
        on_delete=models.CASCADE,
        related_name='approvals'
    )
    approver = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='approvals'
    )
    approval_level = models.IntegerField()
    action = models.CharField(max_length=20, choices=Action.choices)
    comments = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        unique_together = [['request', 'approval_level']]
        indexes = [
            models.Index(fields=['request', 'approval_level']),
        ]

    def __str__(self):
        return f"{self.request.title} - Level {self.approval_level} - {self.get_action_display()}"


class RequestItem(models.Model):
    """Request item model for line items"""
    request = models.ForeignKey(
        PurchaseRequest,
        on_delete=models.CASCADE,
        related_name='items'
    )
    description = models.CharField(max_length=255)
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"{self.description} - {self.quantity} x {self.unit_price}"

    def save(self, *args, **kwargs):
        """Calculate total before saving"""
        self.total = self.quantity * self.unit_price
        super().save(*args, **kwargs)


class Document(models.Model):
    """Document model for extracted data"""
    
    class DocumentType(models.TextChoices):
        PROFORMA = 'PROFORMA', 'Proforma'
        PO = 'PO', 'Purchase Order'
        RECEIPT = 'RECEIPT', 'Receipt'
    
    request = models.ForeignKey(
        PurchaseRequest,
        on_delete=models.CASCADE,
        related_name='documents'
    )
    document_type = models.CharField(max_length=20, choices=DocumentType.choices)
    file_url = models.URLField(max_length=500)
    extracted_data = models.JSONField(
        default=dict,
        help_text="Extracted data from document (vendor, items, prices, terms)"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['request', 'document_type']),
        ]

    def __str__(self):
        return f"{self.request.title} - {self.get_document_type_display()}"
