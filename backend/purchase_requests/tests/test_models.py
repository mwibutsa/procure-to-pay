"""Tests for PurchaseRequest model"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from organizations.models import Organization
from ..models import PurchaseRequest

User = get_user_model()


class PurchaseRequestModelTest(TestCase):
    """Test PurchaseRequest model"""
    
    def setUp(self):
        self.org = Organization.objects.create(
            name='Test Org',
            settings={'approval_levels_count': 2}
        )
        self.user = User.objects.create_user(
            email='staff@test.com',
            password='testpass123',
            organization=self.org,
            role=User.Role.STAFF
        )
    
    def test_create_purchase_request(self):
        """Test creating a purchase request"""
        request = PurchaseRequest.objects.create(
            organization=self.org,
            title='Test Request',
            description='Test Description',
            amount=1000.00,
            created_by=self.user
        )
        self.assertEqual(request.status, PurchaseRequest.Status.PENDING)
        self.assertEqual(request.title, 'Test Request')
        self.assertTrue(request.is_pending)
        self.assertTrue(request.can_be_updated)
    
    def test_cannot_update_approved_request(self):
        """Test that approved requests cannot be updated"""
        request = PurchaseRequest.objects.create(
            organization=self.org,
            title='Test Request',
            description='Test Description',
            amount=1000.00,
            created_by=self.user,
            status=PurchaseRequest.Status.APPROVED
        )
        self.assertFalse(request.can_be_updated)

