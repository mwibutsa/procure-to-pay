"""Unit tests for purchase request endpoints"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient
from decimal import Decimal
from .factories import (
    PurchaseRequestFactory, RequestItemFactory, ApprovalFactory
)
from users.tests.factories import OrganizationFactory, UserFactory
from .mocks import mock_cloudinary_upload, mock_celery_task, mock_file_upload
from ..models import PurchaseRequest, Approval
from users.tests.test_utils import get_authenticated_client

User = get_user_model()


class PurchaseRequestListViewTests(TestCase):
    """Tests for GET /api/requests/"""
    
    def setUp(self):
        self.organization = OrganizationFactory.create()
        self.staff = UserFactory.create_staff(organization=self.organization)
        self.approver1 = UserFactory.create_approver(approval_level=1, organization=self.organization)
        self.approver2 = UserFactory.create_approver(approval_level=2, organization=self.organization)
        self.finance = UserFactory.create_finance(organization=self.organization)
        
        # Create another organization for isolation tests
        self.other_org = OrganizationFactory.create()
        self.other_staff = UserFactory.create_staff(organization=self.other_org)
    
    def test_staff_can_only_see_own_requests(self):
        """Test that staff can only see their own requests"""
        # Create requests for this staff
        request1 = PurchaseRequestFactory.create(created_by=self.staff, organization=self.organization)
        request2 = PurchaseRequestFactory.create(created_by=self.staff, organization=self.organization)
        
        # Create request for another staff in same org
        other_staff = UserFactory.create_staff(organization=self.organization)
        request3 = PurchaseRequestFactory.create(created_by=other_staff, organization=self.organization)
        
        client, _ = get_authenticated_client(self.staff, self.organization)
        response = client.get('/api/requests/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 2)
        request_ids = [r['id'] for r in results]
        self.assertIn(str(request1.id), request_ids)
        self.assertIn(str(request2.id), request_ids)
        self.assertNotIn(str(request3.id), request_ids)
    
    def test_approver_can_see_pending_and_reviewed_requests(self):
        """Test that approver can see pending requests + reviewed requests"""
        # Create pending request
        pending_request = PurchaseRequestFactory.create(
            created_by=self.staff,
            organization=self.organization,
            status=PurchaseRequest.Status.PENDING
        )
        
        # Create request approved by this approver
        reviewed_request = PurchaseRequestFactory.create(
            created_by=self.staff,
            organization=self.organization,
            status=PurchaseRequest.Status.PENDING
        )
        ApprovalFactory.create(
            request=reviewed_request,
            approver=self.approver1,
            approval_level=1,
            action=Approval.Action.APPROVED
        )
        
        # Create request not yet at this approver's level
        future_request = PurchaseRequestFactory.create(
            created_by=self.staff,
            organization=self.organization,
            status=PurchaseRequest.Status.PENDING
        )
        ApprovalFactory.create(
            request=future_request,
            approver=self.approver1,
            approval_level=1,
            action=Approval.Action.APPROVED
        )
        # This should be visible to approver2, not approver1
        
        client, _ = get_authenticated_client(self.approver1, self.organization)
        response = client.get('/api/requests/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        request_ids = [r['id'] for r in results]
        self.assertIn(str(pending_request.id), request_ids)
        self.assertIn(str(reviewed_request.id), request_ids)
    
    def test_finance_can_see_approved_requests(self):
        """Test that finance can see approved requests"""
        # Create approved request
        approved_request = PurchaseRequestFactory.create(
            created_by=self.staff,
            organization=self.organization,
            status=PurchaseRequest.Status.APPROVED
        )
        
        # Create pending request
        pending_request = PurchaseRequestFactory.create(
            created_by=self.staff,
            organization=self.organization,
            status=PurchaseRequest.Status.PENDING
        )
        
        client, _ = get_authenticated_client(self.finance, self.organization)
        response = client.get('/api/requests/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        request_ids = [r['id'] for r in results]
        self.assertIn(str(approved_request.id), request_ids)
        self.assertNotIn(str(pending_request.id), request_ids)
    
    def test_finance_can_see_all_when_configured(self):
        """Test that finance can see all requests when configured"""
        self.organization.set_setting('finance_can_see_all', True)
        
        # Create requests with different statuses
        approved_request = PurchaseRequestFactory.create(
            created_by=self.staff,
            organization=self.organization,
            status=PurchaseRequest.Status.APPROVED
        )
        pending_request = PurchaseRequestFactory.create(
            created_by=self.staff,
            organization=self.organization,
            status=PurchaseRequest.Status.PENDING
        )
        
        client, _ = get_authenticated_client(self.finance, self.organization)
        response = client.get('/api/requests/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        request_ids = [r['id'] for r in results]
        self.assertIn(str(approved_request.id), request_ids)
        self.assertIn(str(pending_request.id), request_ids)
    
    def test_filtering_by_status(self):
        """Test filtering requests by status"""
        PurchaseRequestFactory.create(
            created_by=self.staff,
            organization=self.organization,
            status=PurchaseRequest.Status.PENDING
        )
        PurchaseRequestFactory.create(
            created_by=self.staff,
            organization=self.organization,
            status=PurchaseRequest.Status.APPROVED
        )
        
        client, _ = get_authenticated_client(self.staff, self.organization)
        response = client.get('/api/requests/?status=PENDING')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['status'], 'PENDING')
    
    def test_search_by_title(self):
        """Test searching requests by title"""
        PurchaseRequestFactory.create(
            created_by=self.staff,
            organization=self.organization,
            title='Office Supplies'
        )
        PurchaseRequestFactory.create(
            created_by=self.staff,
            organization=self.organization,
            title='Equipment Purchase'
        )
        
        client, _ = get_authenticated_client(self.staff, self.organization)
        response = client.get('/api/requests/?search=Office')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertIn('Office', results[0]['title'])
    
    def test_ordering_by_created_at(self):
        """Test ordering requests by created_at"""
        request1 = PurchaseRequestFactory.create(
            created_by=self.staff,
            organization=self.organization,
            title='First Request'
        )
        request2 = PurchaseRequestFactory.create(
            created_by=self.staff,
            organization=self.organization,
            title='Second Request'
        )
        
        client, _ = get_authenticated_client(self.staff, self.organization)
        response = client.get('/api/requests/?ordering=-created_at')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(results[0]['title'], 'Second Request')
        self.assertEqual(results[1]['title'], 'First Request')
    
    def test_cross_organization_isolation(self):
        """Test that users cannot see requests from other organizations"""
        # Create request in other org
        other_request = PurchaseRequestFactory.create(
            created_by=self.other_staff,
            organization=self.other_org
        )
        
        client, _ = get_authenticated_client(self.staff, self.organization)
        response = client.get('/api/requests/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        request_ids = [r['id'] for r in results]
        self.assertNotIn(str(other_request.id), request_ids)


class PurchaseRequestCreateViewTests(TestCase):
    """Tests for POST /api/requests/"""
    
    def setUp(self):
        self.organization = OrganizationFactory.create()
        self.staff = UserFactory.create_staff(organization=self.organization)
        self.approver = UserFactory.create_approver(organization=self.organization)
    
    def test_staff_can_create_request(self):
        """Test that staff can create a purchase request"""
        client, _ = get_authenticated_client(self.staff, self.organization)
        
        data = {
            'title': 'Test Request',
            'description': 'Test Description',
            'amount': '1000.00',
        }
        
        response = client.post('/api/requests/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'Test Request')
        self.assertEqual(response.data['status'], 'PENDING')
        self.assertTrue(PurchaseRequest.objects.filter(title='Test Request').exists())
    
    def test_non_staff_cannot_create_request(self):
        """Test that non-staff cannot create request"""
        client, _ = get_authenticated_client(self.approver, self.organization)
        
        data = {
            'title': 'Test Request',
            'description': 'Test Description',
            'amount': '1000.00',
        }
        
        response = client.post('/api/requests/', data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_request_created_with_correct_organization_and_creator(self):
        """Test that request is created with correct organization and creator"""
        client, _ = get_authenticated_client(self.staff, self.organization)
        
        data = {
            'title': 'Test Request',
            'description': 'Test Description',
            'amount': '1000.00',
        }
        
        response = client.post('/api/requests/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        request = PurchaseRequest.objects.get(id=response.data['id'])
        self.assertEqual(request.organization, self.organization)
        self.assertEqual(request.created_by, self.staff)
    
    def test_request_items_created_correctly(self):
        """Test that request items are created correctly"""
        client, _ = get_authenticated_client(self.staff, self.organization)
        
        data = {
            'title': 'Test Request',
            'description': 'Test Description',
            'amount': '1000.00',
            'items': [
                {
                    'description': 'Item 1',
                    'quantity': '10.00',
                    'unit_price': '50.00'
                },
                {
                    'description': 'Item 2',
                    'quantity': '5.00',
                    'unit_price': '100.00'
                }
            ]
        }
        
        response = client.post('/api/requests/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        request = PurchaseRequest.objects.get(id=response.data['id'])
        self.assertEqual(request.items.count(), 2)
        self.assertEqual(request.items.first().description, 'Item 1')
    
    def test_proforma_file_upload(self):
        """Test proforma file upload with mocked Cloudinary"""
        with mock_cloudinary_upload(return_url='https://cloudinary.com/test-proforma.pdf'):
            client, _ = get_authenticated_client(self.staff, self.organization)
            
            test_file = mock_file_upload('test.pdf', 'application/pdf')
            
            data = {
                'title': 'Test Request',
                'description': 'Test Description',
                'amount': '1000.00',
                'proforma_file': test_file
            }
            
            response = client.post('/api/requests/', data, format='multipart')
            
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            # Check that proforma_file_url is in the response
            self.assertIsNotNone(response.data.get('proforma_file_url'))
            self.assertEqual(response.data.get('proforma_file_url'), 'https://cloudinary.com/test-proforma.pdf')
    
    def test_validation_error_missing_fields(self):
        """Test validation error for missing required fields"""
        client, _ = get_authenticated_client(self.staff, self.organization)
        
        data = {
            'description': 'Test Description',
            # Missing title and amount
        }
        
        response = client.post('/api/requests/', data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('title', response.data)
        self.assertIn('amount', response.data)
    
    def test_validation_error_invalid_amount(self):
        """Test validation error for invalid amount"""
        client, _ = get_authenticated_client(self.staff, self.organization)
        
        data = {
            'title': 'Test Request',
            'description': 'Test Description',
            'amount': '-100.00',  # Negative amount
        }
        
        response = client.post('/api/requests/', data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class PurchaseRequestRetrieveViewTests(TestCase):
    """Tests for GET /api/requests/{id}/"""
    
    def setUp(self):
        self.organization = OrganizationFactory.create()
        self.staff = UserFactory.create_staff(organization=self.organization)
        self.approver = UserFactory.create_approver(organization=self.organization)
        self.request = PurchaseRequestFactory.create(
            created_by=self.staff,
            organization=self.organization
        )
    
    def test_staff_can_retrieve_own_request(self):
        """Test that staff can retrieve their own request"""
        client, _ = get_authenticated_client(self.staff, self.organization)
        response = client.get(f'/api/requests/{self.request.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], str(self.request.id))
        self.assertEqual(response.data['title'], self.request.title)
    
    def test_approver_can_retrieve_request_in_organization(self):
        """Test that approver can retrieve request in their organization"""
        client, _ = get_authenticated_client(self.approver, self.organization)
        response = client.get(f'/api/requests/{self.request.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], str(self.request.id))
    
    def test_cannot_retrieve_request_from_different_organization(self):
        """Test that user cannot retrieve request from different organization"""
        other_org = OrganizationFactory.create()
        other_staff = UserFactory.create_staff(organization=other_org)
        
        client, _ = get_authenticated_client(other_staff, other_org)
        response = client.get(f'/api/requests/{self.request.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_returns_correct_serializer_data(self):
        """Test that retrieve returns correct serializer data"""
        RequestItemFactory.create(request=self.request)
        
        client, _ = get_authenticated_client(self.staff, self.organization)
        response = client.get(f'/api/requests/{self.request.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('items', response.data)
        self.assertIn('approvals', response.data)
        self.assertIn('documents', response.data)
        self.assertIn('can_be_updated', response.data)


class PurchaseRequestUpdateViewTests(TestCase):
    """Tests for PATCH /api/requests/{id}/"""
    
    def setUp(self):
        self.organization = OrganizationFactory.create()
        self.staff = UserFactory.create_staff(organization=self.organization)
        self.approver = UserFactory.create_approver(organization=self.organization)
        self.pending_request = PurchaseRequestFactory.create(
            created_by=self.staff,
            organization=self.organization,
            status=PurchaseRequest.Status.PENDING
        )
        self.approved_request = PurchaseRequestFactory.create(
            created_by=self.staff,
            organization=self.organization,
            status=PurchaseRequest.Status.APPROVED
        )
    
    def test_staff_can_update_pending_request(self):
        """Test that staff can update pending request"""
        client, _ = get_authenticated_client(self.staff, self.organization)
        
        data = {
            'title': 'Updated Title',
            'description': 'Updated Description',
            'amount': '2000.00'
        }
        
        response = client.patch(f'/api/requests/{self.pending_request.id}/', data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.pending_request.refresh_from_db()
        self.assertEqual(self.pending_request.title, 'Updated Title')
    
    def test_cannot_update_approved_request(self):
        """Test that approved request cannot be updated"""
        client, _ = get_authenticated_client(self.staff, self.organization)
        
        data = {
            'title': 'Updated Title'
        }
        
        response = client.patch(f'/api/requests/{self.approved_request.id}/', data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cannot be updated', response.data['detail'].lower())
    
    def test_cannot_update_rejected_request(self):
        """Test that rejected request cannot be updated"""
        rejected_request = PurchaseRequestFactory.create(
            created_by=self.staff,
            organization=self.organization,
            status=PurchaseRequest.Status.REJECTED
        )
        
        client, _ = get_authenticated_client(self.staff, self.organization)
        
        data = {
            'title': 'Updated Title'
        }
        
        response = client.patch(f'/api/requests/{rejected_request.id}/', data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_update_with_new_items(self):
        """Test updating request with new items"""
        RequestItemFactory.create(request=self.pending_request)
        
        client, _ = get_authenticated_client(self.staff, self.organization)
        
        data = {
            'items': [
                {
                    'description': 'New Item 1',
                    'quantity': '5.00',
                    'unit_price': '100.00'
                }
            ]
        }
        
        response = client.patch(f'/api/requests/{self.pending_request.id}/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.pending_request.refresh_from_db()
        self.assertEqual(self.pending_request.items.count(), 1)
        self.assertEqual(self.pending_request.items.first().description, 'New Item 1')
    
    def test_update_with_new_proforma_file(self):
        """Test updating request with new proforma file"""
        with mock_cloudinary_upload():
            client, _ = get_authenticated_client(self.staff, self.organization)
            
            test_file = mock_file_upload('new-proforma.pdf', 'application/pdf')
            data = {
                'proforma_file': test_file
            }
            
            response = client.patch(f'/api/requests/{self.pending_request.id}/', data, format='multipart')
            
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.pending_request.refresh_from_db()
            self.assertIsNotNone(self.pending_request.proforma_file_url)
    
    def test_non_staff_cannot_update(self):
        """Test that non-staff cannot update request"""
        client, _ = get_authenticated_client(self.approver, self.organization)
        
        data = {
            'title': 'Updated Title'
        }
        
        response = client.patch(f'/api/requests/{self.pending_request.id}/', data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_cannot_update_request_from_different_organization(self):
        """Test that user cannot update request from different organization"""
        other_org = OrganizationFactory.create()
        other_staff = UserFactory.create_staff(organization=other_org)
        
        client, _ = get_authenticated_client(other_staff, other_org)
        
        data = {
            'title': 'Updated Title'
        }
        
        response = client.patch(f'/api/requests/{self.pending_request.id}/', data)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class PurchaseRequestApproveViewTests(TestCase):
    """Tests for PATCH /api/requests/{id}/approve/"""
    
    def setUp(self):
        self.organization = OrganizationFactory.create(settings={'approval_levels_count': 2})
        self.staff = UserFactory.create_staff(organization=self.organization)
        self.approver1 = UserFactory.create_approver(approval_level=1, organization=self.organization)
        self.approver2 = UserFactory.create_approver(approval_level=2, organization=self.organization)
        self.finance = UserFactory.create_finance(organization=self.organization)
        self.request = PurchaseRequestFactory.create(
            created_by=self.staff,
            organization=self.organization,
            status=PurchaseRequest.Status.PENDING
        )
    
    def test_approver_can_approve_at_correct_level(self):
        """Test that approver can approve at correct level"""
        client, _ = get_authenticated_client(self.approver1, self.organization)
        
        data = {
            'comments': 'Approved at level 1'
        }
        
        response = client.patch(f'/api/requests/{self.request.id}/approve/', data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.request.refresh_from_db()
        self.assertEqual(self.request.current_approval_level, 1)
        self.assertTrue(Approval.objects.filter(
            request=self.request,
            approver=self.approver1,
            approval_level=1,
            action=Approval.Action.APPROVED
        ).exists())
    
    def test_cannot_approve_if_previous_level_not_completed(self):
        """Test that approver cannot approve if previous level not completed"""
        client, _ = get_authenticated_client(self.approver2, self.organization)
        
        data = {
            'comments': 'Trying to approve at level 2'
        }
        
        response = client.patch(f'/api/requests/{self.request.id}/approve/', data)
        
        # Approver2 can't see the request because level 1 hasn't approved it yet
        # So they get 404 (not found in their queryset) rather than 400
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_final_approval_sets_status_to_approved(self):
        """Test that final approval sets status to APPROVED"""
        # First approve at level 1
        ApprovalFactory.create(
            request=self.request,
            approver=self.approver1,
            approval_level=1,
            action=Approval.Action.APPROVED
        )
        self.request.current_approval_level = 1
        self.request.save()
        
        # Now approve at level 2 (final)
        client, _ = get_authenticated_client(self.approver2, self.organization)
        
        data = {
            'comments': 'Final approval'
        }
        
        response = client.patch(f'/api/requests/{self.request.id}/approve/', data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.request.refresh_from_db()
        self.assertEqual(self.request.status, PurchaseRequest.Status.APPROVED)
    
    def test_non_approver_cannot_approve(self):
        """Test that non-approver cannot approve"""
        client, _ = get_authenticated_client(self.finance, self.organization)
        
        data = {
            'comments': 'Trying to approve'
        }
        
        response = client.patch(f'/api/requests/{self.request.id}/approve/', data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_cannot_approve_request_from_different_organization(self):
        """Test that user cannot approve request from different organization"""
        other_org = OrganizationFactory.create()
        other_approver = UserFactory.create_approver(organization=other_org)
        
        client, _ = get_authenticated_client(other_approver, other_org)
        
        data = {
            'comments': 'Trying to approve'
        }
        
        response = client.patch(f'/api/requests/{self.request.id}/approve/', data)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_approval_creates_approval_record(self):
        """Test that approval creates Approval record"""
        client, _ = get_authenticated_client(self.approver1, self.organization)
        
        data = {
            'comments': 'Approved'
        }
        
        response = client.patch(f'/api/requests/{self.request.id}/approve/', data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(Approval.objects.filter(
            request=self.request,
            approver=self.approver1,
            action=Approval.Action.APPROVED
        ).exists())


class PurchaseRequestRejectViewTests(TestCase):
    """Tests for PATCH /api/requests/{id}/reject/"""
    
    def setUp(self):
        self.organization = OrganizationFactory.create()
        self.staff = UserFactory.create_staff(organization=self.organization)
        self.approver = UserFactory.create_approver(approval_level=1, organization=self.organization)
        self.finance = UserFactory.create_finance(organization=self.organization)
        self.request = PurchaseRequestFactory.create(
            created_by=self.staff,
            organization=self.organization,
            status=PurchaseRequest.Status.PENDING
        )
    
    def test_approver_can_reject_request(self):
        """Test that approver can reject request"""
        client, _ = get_authenticated_client(self.approver, self.organization)
        
        data = {
            'comments': 'Rejected due to budget constraints'
        }
        
        response = client.patch(f'/api/requests/{self.request.id}/reject/', data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.request.refresh_from_db()
        self.assertEqual(self.request.status, PurchaseRequest.Status.REJECTED)
    
    def test_rejection_requires_comments(self):
        """Test that rejection requires comments"""
        client, _ = get_authenticated_client(self.approver, self.organization)
        
        data = {
            'comments': ''  # Empty comments
        }
        
        response = client.patch(f'/api/requests/{self.request.id}/reject/', data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_rejection_sets_status_to_rejected(self):
        """Test that rejection sets status to REJECTED"""
        client, _ = get_authenticated_client(self.approver, self.organization)
        
        data = {
            'comments': 'Rejected'
        }
        
        response = client.patch(f'/api/requests/{self.request.id}/reject/', data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.request.refresh_from_db()
        self.assertEqual(self.request.status, PurchaseRequest.Status.REJECTED)
    
    def test_rejection_creates_approval_record(self):
        """Test that rejection creates Approval record"""
        client, _ = get_authenticated_client(self.approver, self.organization)
        
        data = {
            'comments': 'Rejected'
        }
        
        response = client.patch(f'/api/requests/{self.request.id}/reject/', data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(Approval.objects.filter(
            request=self.request,
            approver=self.approver,
            action=Approval.Action.REJECTED
        ).exists())
    
    def test_non_approver_cannot_reject(self):
        """Test that non-approver cannot reject"""
        client, _ = get_authenticated_client(self.finance, self.organization)
        
        data = {
            'comments': 'Trying to reject'
        }
        
        response = client.patch(f'/api/requests/{self.request.id}/reject/', data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class PurchaseRequestSubmitReceiptViewTests(TestCase):
    """Tests for POST /api/requests/{id}/submit_receipt/"""
    
    def setUp(self):
        self.organization = OrganizationFactory.create()
        self.staff = UserFactory.create_staff(organization=self.organization)
        self.approver = UserFactory.create_approver(organization=self.organization)
        self.approved_request = PurchaseRequestFactory.create(
            created_by=self.staff,
            organization=self.organization,
            status=PurchaseRequest.Status.APPROVED
        )
        self.pending_request = PurchaseRequestFactory.create(
            created_by=self.staff,
            organization=self.organization,
            status=PurchaseRequest.Status.PENDING
        )
    
    def test_staff_can_submit_receipt_for_approved_request(self):
        """Test that staff can submit receipt for approved request"""
        with mock_cloudinary_upload(), mock_celery_task():
            client, _ = get_authenticated_client(self.staff, self.organization)
            
            test_file = mock_file_upload('receipt.pdf', 'application/pdf')
            data = {
                'receipt_file': test_file
            }
            
            response = client.post(f'/api/requests/{self.approved_request.id}/submit_receipt/', data, format='multipart')
            
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.approved_request.refresh_from_db()
            self.assertIsNotNone(self.approved_request.receipt_file_url)
    
    def test_cannot_submit_receipt_for_pending_request(self):
        """Test that receipt cannot be submitted for pending request"""
        client, _ = get_authenticated_client(self.staff, self.organization)
        
        test_file = mock_file_upload('receipt.pdf', 'application/pdf')
        data = {
            'receipt_file': test_file
        }
        
        response = client.post(f'/api/requests/{self.pending_request.id}/submit_receipt/', data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('approved', response.data['detail'].lower())
    
    def test_receipt_file_upload(self):
        """Test receipt file upload with mocked Cloudinary"""
        with mock_cloudinary_upload(), mock_celery_task():
            client, _ = get_authenticated_client(self.staff, self.organization)
            
            test_file = mock_file_upload('receipt.pdf', 'application/pdf')
            data = {
                'receipt_file': test_file
            }
            
            response = client.post(f'/api/requests/{self.approved_request.id}/submit_receipt/', data, format='multipart')
            
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertIn('submitted successfully', response.data['detail'].lower())
    
    def test_celery_task_triggered(self):
        """Test that Celery task is triggered (mocked)"""
        with mock_cloudinary_upload(), mock_celery_task() as mock_task:
            client, _ = get_authenticated_client(self.staff, self.organization)
            
            test_file = mock_file_upload('receipt.pdf', 'application/pdf')
            data = {
                'receipt_file': test_file
            }
            
            response = client.post(f'/api/requests/{self.approved_request.id}/submit_receipt/', data, format='multipart')
            
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            # Verify task was called
            self.assertTrue(mock_task.called)
    
    def test_non_staff_cannot_submit_receipt(self):
        """Test that non-staff cannot submit receipt"""
        client, _ = get_authenticated_client(self.approver, self.organization)
        
        test_file = mock_file_upload('receipt.pdf', 'application/pdf')
        data = {
            'receipt_file': test_file
        }
        
        response = client.post(f'/api/requests/{self.approved_request.id}/submit_receipt/', data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

