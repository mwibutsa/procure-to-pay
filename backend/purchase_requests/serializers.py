from rest_framework import serializers
from .models import PurchaseRequest, Approval, RequestItem, Document
from users.serializers import UserSerializer


class RequestItemSerializer(serializers.ModelSerializer):
    """Request item serializer"""
    
    class Meta:
        model = RequestItem
        fields = ['id', 'description', 'quantity', 'unit_price', 'total']
        read_only_fields = ['id', 'total']


class ApprovalSerializer(serializers.ModelSerializer):
    """Approval serializer"""
    approver_email = serializers.CharField(source='approver.email', read_only=True)
    approver_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Approval
        fields = [
            'id', 'approver', 'approver_email', 'approver_name',
            'approval_level', 'action', 'comments', 'timestamp'
        ]
        read_only_fields = ['id', 'timestamp']
    
    def get_approver_name(self, obj):
        return f"{obj.approver.first_name} {obj.approver.last_name}".strip() or obj.approver.email


class DocumentSerializer(serializers.ModelSerializer):
    """Document serializer"""
    
    class Meta:
        model = Document
        fields = ['id', 'document_type', 'file_url', 'extracted_data', 'created_at']
        read_only_fields = ['id', 'created_at']


class PurchaseRequestSerializer(serializers.ModelSerializer):
    """Purchase request serializer"""
    created_by_email = serializers.CharField(source='created_by.email', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    items = RequestItemSerializer(many=True, read_only=True)
    approvals = ApprovalSerializer(many=True, read_only=True)
    documents = DocumentSerializer(many=True, read_only=True)
    can_be_updated = serializers.BooleanField(read_only=True)
    required_approval_levels = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = PurchaseRequest
        fields = [
            'id', 'organization', 'organization_name',
            'title', 'description', 'amount', 'status',
            'created_by', 'created_by_email', 'created_by_name',
            'updated_by', 'current_approval_level',
            'proforma_file_url', 'purchase_order_file_url', 'receipt_file_url',
            'items', 'approvals', 'documents',
            'can_be_updated', 'required_approval_levels',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_by', 'updated_by', 'current_approval_level',
            'status', 'created_at', 'updated_at'
        ]
    
    def get_created_by_name(self, obj):
        return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.email
    
    def get_required_approval_levels(self, obj):
        return obj.get_required_approval_levels()


class PurchaseRequestCreateSerializer(serializers.ModelSerializer):
    """Purchase request create serializer"""
    items = RequestItemSerializer(many=True, required=False)
    
    class Meta:
        model = PurchaseRequest
        fields = [
            'title', 'description', 'amount',
            'proforma_file_url', 'items'
        ]
    
    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        request = PurchaseRequest.objects.create(
            **validated_data,
            organization=self.context['request'].user.organization,
            created_by=self.context['request'].user
        )
        
        # Create items
        for item_data in items_data:
            RequestItem.objects.create(request=request, **item_data)
        
        return request


class PurchaseRequestUpdateSerializer(serializers.ModelSerializer):
    """Purchase request update serializer"""
    items = RequestItemSerializer(many=True, required=False)
    
    class Meta:
        model = PurchaseRequest
        fields = [
            'title', 'description', 'amount',
            'proforma_file_url', 'items'
        ]
    
    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        
        # Update request fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.updated_by = self.context['request'].user
        instance.save()
        
        # Update items if provided
        if items_data is not None:
            # Delete existing items
            instance.items.all().delete()
            # Create new items
            for item_data in items_data:
                RequestItem.objects.create(request=instance, **item_data)
        
        return instance


class ApproveRequestSerializer(serializers.Serializer):
    """Approve request serializer"""
    comments = serializers.CharField(required=False, allow_blank=True)


class RejectRequestSerializer(serializers.Serializer):
    """Reject request serializer"""
    comments = serializers.CharField(required=True)


class SubmitReceiptSerializer(serializers.Serializer):
    """Submit receipt serializer"""
    receipt_file_url = serializers.URLField(required=True)

