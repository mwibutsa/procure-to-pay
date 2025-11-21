from django.contrib import admin
from .models import PurchaseRequest, Approval, RequestItem, Document


@admin.register(PurchaseRequest)
class PurchaseRequestAdmin(admin.ModelAdmin):
    list_display = ['title', 'organization', 'status', 'amount', 'created_by', 'created_at']
    list_filter = ['status', 'organization', 'created_at']
    search_fields = ['title', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']
    raw_id_fields = ['organization', 'created_by', 'updated_by']


@admin.register(Approval)
class ApprovalAdmin(admin.ModelAdmin):
    list_display = ['request', 'approver', 'approval_level', 'action', 'timestamp']
    list_filter = ['action', 'approval_level', 'timestamp']
    search_fields = ['request__title', 'approver__email']
    readonly_fields = ['timestamp']
    raw_id_fields = ['request', 'approver']


@admin.register(RequestItem)
class RequestItemAdmin(admin.ModelAdmin):
    list_display = ['request', 'description', 'quantity', 'unit_price', 'total']
    search_fields = ['description', 'request__title']
    raw_id_fields = ['request']


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['request', 'document_type', 'created_at']
    list_filter = ['document_type', 'created_at']
    search_fields = ['request__title']
    readonly_fields = ['created_at']
    raw_id_fields = ['request']
