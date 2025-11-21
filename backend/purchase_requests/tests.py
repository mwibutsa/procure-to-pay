from django.test import TestCase
from django.contrib.auth import get_user_model
from organizations.models import Organization
from .models import PurchaseRequest, Approval
from .services import ApprovalWorkflowService

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


class ApprovalWorkflowServiceTest(TestCase):
    """Test ApprovalWorkflowService"""
    
    def setUp(self):
        self.org = Organization.objects.create(
            name='Test Org',
            settings={'approval_levels_count': 2}
        )
        self.staff = User.objects.create_user(
            email='staff@test.com',
            password='testpass123',
            organization=self.org,
            role=User.Role.STAFF
        )
        self.approver1 = User.objects.create_user(
            email='approver1@test.com',
            password='testpass123',
            organization=self.org,
            role=User.Role.APPROVER,
            approval_level=1
        )
        self.approver2 = User.objects.create_user(
            email='approver2@test.com',
            password='testpass123',
            organization=self.org,
            role=User.Role.APPROVER,
            approval_level=2
        )
        self.request = PurchaseRequest.objects.create(
            organization=self.org,
            title='Test Request',
            description='Test Description',
            amount=1000.00,
            created_by=self.staff
        )
    
    def test_can_approve_at_level_1(self):
        """Test that approver1 can approve at level 1"""
        can_approve, reason = ApprovalWorkflowService.can_approve_at_level(
            self.request, self.approver1, 1
        )
        self.assertTrue(can_approve)
    
    def test_cannot_approve_at_level_2_without_level_1(self):
        """Test that approver2 cannot approve if level 1 hasn't approved"""
        can_approve, reason = ApprovalWorkflowService.can_approve_at_level(
            self.request, self.approver2, 2
        )
        self.assertFalse(can_approve)
        self.assertIn('Previous level', reason)
    
    def test_approve_request_level_1(self):
        """Test approving request at level 1"""
        approval = ApprovalWorkflowService.approve_request(
            self.request, self.approver1, 'Approved at level 1'
        )
        self.assertEqual(approval.action, Approval.Action.APPROVED)
        self.assertEqual(approval.approval_level, 1)
        self.request.refresh_from_db()
        self.assertEqual(self.request.current_approval_level, 1)
        self.assertEqual(self.request.status, PurchaseRequest.Status.PENDING)  # Not final approval yet
    
    def test_reject_request(self):
        """Test rejecting a request"""
        approval = ApprovalWorkflowService.reject_request(
            self.request, self.approver1, 'Rejected due to budget constraints'
        )
        self.assertEqual(approval.action, Approval.Action.REJECTED)
        self.request.refresh_from_db()
        self.assertEqual(self.request.status, PurchaseRequest.Status.REJECTED)
