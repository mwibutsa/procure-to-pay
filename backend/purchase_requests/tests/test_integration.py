"""Integration tests for purchase request workflows"""
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework import status
from .factories import (
    PurchaseRequestFactory, ApprovalFactory
)
from users.tests.factories import OrganizationFactory, UserFactory
from .mocks import mock_cloudinary_upload, mock_celery_task, mock_file_upload
from users.tests.test_utils import get_authenticated_client
from ..models import PurchaseRequest, Approval

User = get_user_model()


class CompletePurchaseRequestWorkflowTests(TestCase):
    """Integration tests for complete purchase request workflows"""
    
    def setUp(self):
        self.organization = OrganizationFactory.create(settings={'approval_levels_count': 2})
        self.staff = UserFactory.create_staff(organization=self.organization)
        self.approver1 = UserFactory.create_approver(approval_level=1, organization=self.organization)
        self.approver2 = UserFactory.create_approver(approval_level=2, organization=self.organization)
    
    def test_complete_approval_workflow(self):
        """Test complete workflow: Staff creates → Approver 1 approves → Approver 2 approves → Status APPROVED"""
        # Step 1: Staff creates request
        staff_client, _ = get_authenticated_client(self.staff, self.organization)
        
        create_data = {
            'title': 'Office Supplies',
            'description': 'Need office supplies for Q1',
            'amount': '1500.00',
            'items': [
                {
                    'description': 'Paper',
                    'quantity': '10.00',
                    'unit_price': '50.00'
                }
            ]
        }
        
        create_response = staff_client.post('/api/requests/', create_data, format='json')
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        request_id = create_response.data['id']
        
        # Verify request is pending
        request = PurchaseRequest.objects.get(id=request_id)
        self.assertEqual(request.status, PurchaseRequest.Status.PENDING)
        self.assertEqual(request.current_approval_level, 0)
        
        # Step 2: Approver 1 approves
        approver1_client, _ = get_authenticated_client(self.approver1, self.organization)
        
        approve1_data = {
            'comments': 'Approved at level 1'
        }
        
        approve1_response = approver1_client.patch(f'/api/requests/{request_id}/approve/', approve1_data)
        self.assertEqual(approve1_response.status_code, status.HTTP_200_OK)
        
        # Verify level 1 approval
        request.refresh_from_db()
        self.assertEqual(request.current_approval_level, 1)
        self.assertEqual(request.status, PurchaseRequest.Status.PENDING)  # Not final yet
        self.assertTrue(Approval.objects.filter(
            request=request,
            approver=self.approver1,
            approval_level=1,
            action=Approval.Action.APPROVED
        ).exists())
        
        # Step 3: Approver 2 approves (final)
        approver2_client, _ = get_authenticated_client(self.approver2, self.organization)
        
        approve2_data = {
            'comments': 'Final approval'
        }
        
        approve2_response = approver2_client.patch(f'/api/requests/{request_id}/approve/', approve2_data)
        self.assertEqual(approve2_response.status_code, status.HTTP_200_OK)
        
        # Verify final approval
        request.refresh_from_db()
        self.assertEqual(request.current_approval_level, 2)
        self.assertEqual(request.status, PurchaseRequest.Status.APPROVED)
        self.assertTrue(Approval.objects.filter(
            request=request,
            approver=self.approver2,
            approval_level=2,
            action=Approval.Action.APPROVED
        ).exists())
    
    def test_rejection_workflow(self):
        """Test workflow: Staff creates → Approver rejects → Status REJECTED"""
        # Step 1: Staff creates request
        staff_client, _ = get_authenticated_client(self.staff, self.organization)
        
        create_data = {
            'title': 'Equipment Purchase',
            'description': 'Need new equipment',
            'amount': '5000.00'
        }
        
        create_response = staff_client.post('/api/requests/', create_data)
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        request_id = create_response.data['id']
        
        # Step 2: Approver rejects
        approver1_client, _ = get_authenticated_client(self.approver1, self.organization)
        
        reject_data = {
            'comments': 'Rejected due to budget constraints'
        }
        
        reject_response = approver1_client.patch(f'/api/requests/{request_id}/reject/', reject_data)
        self.assertEqual(reject_response.status_code, status.HTTP_200_OK)
        
        # Verify rejection
        request = PurchaseRequest.objects.get(id=request_id)
        self.assertEqual(request.status, PurchaseRequest.Status.REJECTED)
        self.assertTrue(Approval.objects.filter(
            request=request,
            approver=self.approver1,
            action=Approval.Action.REJECTED
        ).exists())
    
    def test_update_after_approval_fails(self):
        """Test that staff cannot update request after approval"""
        # Step 1: Staff creates request
        staff_client, _ = get_authenticated_client(self.staff, self.organization)
        
        create_data = {
            'title': 'Test Request',
            'description': 'Test Description',
            'amount': '1000.00'
        }
        
        create_response = staff_client.post('/api/requests/', create_data)
        request_id = create_response.data['id']
        
        # Step 2: Approver 1 approves
        approver1_client, _ = get_authenticated_client(self.approver1, self.organization)
        approver1_client.patch(f'/api/requests/{request_id}/approve/', {'comments': 'Approved'})
        
        # Step 3: Staff tries to update (should fail)
        update_data = {
            'title': 'Updated Title'
        }
        
        update_response = staff_client.patch(f'/api/requests/{request_id}/', update_data)
        self.assertEqual(update_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cannot be updated', update_response.data['detail'].lower())
    
    def test_complete_workflow_with_receipt_submission(self):
        """Test complete workflow: Create → Approve → Submit Receipt"""
        with mock_cloudinary_upload(), mock_celery_task():
            # Step 1: Staff creates request
            staff_client, _ = get_authenticated_client(self.staff, self.organization)
            
            create_data = {
                'title': 'Office Supplies',
                'description': 'Need supplies',
                'amount': '1000.00'
            }
            
            create_response = staff_client.post('/api/requests/', create_data)
            request_id = create_response.data['id']
            
            # Step 2: Approver 1 approves
            approver1_client, _ = get_authenticated_client(self.approver1, self.organization)
            approver1_client.patch(f'/api/requests/{request_id}/approve/', {'comments': 'Approved'})
            
            # Step 3: Approver 2 approves (final)
            approver2_client, _ = get_authenticated_client(self.approver2, self.organization)
            approver2_client.patch(f'/api/requests/{request_id}/approve/', {'comments': 'Final approval'})
            
            # Verify approved
            request = PurchaseRequest.objects.get(id=request_id)
            self.assertEqual(request.status, PurchaseRequest.Status.APPROVED)
            
            # Step 4: Staff submits receipt
            test_file = mock_file_upload('receipt.pdf', 'application/pdf')
            receipt_data = {
                'receipt_file': test_file
            }
            
            receipt_response = staff_client.post(f'/api/requests/{request_id}/submit_receipt/', receipt_data, format='multipart')
            self.assertEqual(receipt_response.status_code, status.HTTP_200_OK)
            
            # Verify receipt submitted
            request.refresh_from_db()
            self.assertIsNotNone(request.receipt_file_url)


class RoleBasedAccessIntegrationTests(TestCase):
    """Integration tests for role-based access control"""
    
    def setUp(self):
        self.org1 = OrganizationFactory.create()
        self.org2 = OrganizationFactory.create()
        
        # Org 1 users
        self.org1_staff = UserFactory.create_staff(organization=self.org1)
        self.org1_approver = UserFactory.create_approver(organization=self.org1)
        self.org1_finance = UserFactory.create_finance(organization=self.org1)
        
        # Org 2 users
        self.org2_staff = UserFactory.create_staff(organization=self.org2)
        
        # Create requests
        self.org1_request = PurchaseRequestFactory.create(
            created_by=self.org1_staff,
            organization=self.org1
        )
        self.org2_request = PurchaseRequestFactory.create(
            created_by=self.org2_staff,
            organization=self.org2
        )
    
    def test_staff_can_only_see_own_requests(self):
        """Test that staff can only see their own requests"""
        # Create another staff in same org
        other_staff = UserFactory.create_staff(organization=self.org1)
        other_request = PurchaseRequestFactory.create(
            created_by=other_staff,
            organization=self.org1
        )
        
        client, _ = get_authenticated_client(self.org1_staff, self.org1)
        response = client.get('/api/requests/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        request_ids = [r['id'] for r in results]
        
        self.assertIn(str(self.org1_request.id), request_ids)
        self.assertNotIn(str(other_request.id), request_ids)
        self.assertNotIn(str(self.org2_request.id), request_ids)
    
    def test_approver_sees_pending_and_reviewed_requests(self):
        """Test that approver sees pending requests + reviewed requests"""
        # Create pending request
        pending_request = PurchaseRequestFactory.create(
            created_by=self.org1_staff,
            organization=self.org1,
            status=PurchaseRequest.Status.PENDING
        )
        
        # Create reviewed request
        reviewed_request = PurchaseRequestFactory.create(
            created_by=self.org1_staff,
            organization=self.org1,
            status=PurchaseRequest.Status.PENDING
        )
        ApprovalFactory.create(
            request=reviewed_request,
            approver=self.org1_approver,
            approval_level=1,
            action=Approval.Action.APPROVED
        )
        
        client, _ = get_authenticated_client(self.org1_approver, self.org1)
        response = client.get('/api/requests/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        request_ids = [r['id'] for r in results]
        
        self.assertIn(str(pending_request.id), request_ids)
        self.assertIn(str(reviewed_request.id), request_ids)
    
    def test_finance_sees_approved_requests(self):
        """Test that finance sees approved requests"""
        # Create approved request
        approved_request = PurchaseRequestFactory.create(
            created_by=self.org1_staff,
            organization=self.org1,
            status=PurchaseRequest.Status.APPROVED
        )
        
        # Create pending request
        pending_request = PurchaseRequestFactory.create(
            created_by=self.org1_staff,
            organization=self.org1,
            status=PurchaseRequest.Status.PENDING
        )
        
        client, _ = get_authenticated_client(self.org1_finance, self.org1)
        response = client.get('/api/requests/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        request_ids = [r['id'] for r in results]
        
        self.assertIn(str(approved_request.id), request_ids)
        self.assertNotIn(str(pending_request.id), request_ids)
    
    def test_cross_organization_isolation(self):
        """Test that users cannot access requests from other organizations"""
        # Org 1 staff tries to access Org 2 request
        client, _ = get_authenticated_client(self.org1_staff, self.org1)
        response = client.get(f'/api/requests/{self.org2_request.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # Org 1 approver tries to approve Org 2 request
        approver_client, _ = get_authenticated_client(self.org1_approver, self.org1)
        approve_response = approver_client.patch(
            f'/api/requests/{self.org2_request.id}/approve/',
            {'comments': 'Trying to approve'}
        )
        
        self.assertEqual(approve_response.status_code, status.HTTP_404_NOT_FOUND)


class FilteringAndSearchIntegrationTests(TestCase):
    """Integration tests for filtering, search, and ordering"""
    
    def setUp(self):
        self.organization = OrganizationFactory.create()
        self.staff = UserFactory.create_staff(organization=self.organization)
        
        # Create multiple requests with different attributes
        self.request1 = PurchaseRequestFactory.create(
            created_by=self.staff,
            organization=self.organization,
            title='Office Supplies Purchase',
            description='Need office supplies',
            amount=Decimal('1000.00'),
            status=PurchaseRequest.Status.PENDING
        )
        
        self.request2 = PurchaseRequestFactory.create(
            created_by=self.staff,
            organization=self.organization,
            title='Equipment Purchase',
            description='Need new equipment',
            amount=Decimal('5000.00'),
            status=PurchaseRequest.Status.APPROVED
        )
        
        self.request3 = PurchaseRequestFactory.create(
            created_by=self.staff,
            organization=self.organization,
            title='Software License',
            description='Annual software license',
            amount=Decimal('2000.00'),
            status=PurchaseRequest.Status.PENDING
        )
    
    def test_filtering_by_status(self):
        """Test filtering requests by status"""
        client, _ = get_authenticated_client(self.staff, self.organization)
        
        # Filter by PENDING
        response = client.get('/api/requests/?status=PENDING')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 2)
        for result in results:
            self.assertEqual(result['status'], 'PENDING')
        
        # Filter by APPROVED
        response = client.get('/api/requests/?status=APPROVED')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['status'], 'APPROVED')
    
    def test_search_by_title(self):
        """Test searching requests by title"""
        client, _ = get_authenticated_client(self.staff, self.organization)
        
        # Search for "Office"
        response = client.get('/api/requests/?search=Office')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertIn('Office', results[0]['title'])
    
    def test_search_by_description(self):
        """Test searching requests by description"""
        client, _ = get_authenticated_client(self.staff, self.organization)
        
        # Search for "equipment"
        response = client.get('/api/requests/?search=equipment')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertIn('equipment', results[0]['description'].lower())
    
    def test_ordering_by_created_at(self):
        """Test ordering requests by created_at"""
        client, _ = get_authenticated_client(self.staff, self.organization)
        
        # Order descending (newest first)
        response = client.get('/api/requests/?ordering=-created_at')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 3)
        # Should be in reverse order of creation
        self.assertEqual(results[0]['id'], str(self.request3.id))
        self.assertEqual(results[2]['id'], str(self.request1.id))
    
    def test_ordering_by_amount(self):
        """Test ordering requests by amount"""
        client, _ = get_authenticated_client(self.staff, self.organization)
        
        # Order by amount descending
        response = client.get('/api/requests/?ordering=-amount')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 3)
        # Should be ordered by amount descending
        self.assertEqual(float(results[0]['amount']), 5000.00)
        self.assertEqual(float(results[2]['amount']), 1000.00)
    
    def test_pagination(self):
        """Test pagination with large datasets"""
        # Create more requests
        for i in range(25):
            PurchaseRequestFactory.create(
                created_by=self.staff,
                organization=self.organization
            )
        
        client, _ = get_authenticated_client(self.staff, self.organization)
        
        # Get first page
        response = client.get('/api/requests/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertIn('count', response.data)
        self.assertIn('next', response.data)
        
        # Should have pagination
        self.assertIsNotNone(response.data.get('next'))
        self.assertEqual(len(response.data['results']), 20)  # Default page size

