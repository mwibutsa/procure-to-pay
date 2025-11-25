"""Integration tests for user authentication flows"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from .factories import OrganizationFactory, UserFactory

User = get_user_model()


class AuthenticationFlowIntegrationTests(TestCase):
    """Integration tests for complete authentication flows"""
    
    def setUp(self):
        self.client = APIClient()
        self.organization = OrganizationFactory.create()
        self.user = UserFactory.create(
            email='test@example.com',
            password='testpass123',
            organization=self.organization
        )
    
    def test_complete_login_refresh_logout_flow(self):
        """Test complete flow: login → refresh → logout"""
        # Step 1: Login
        login_response = self.client.post('/api/auth/login/', {
            'email': 'test@example.com',
            'password': 'testpass123'
        })
        
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        access_token_1 = login_response.data['access']
        refresh_token_cookie = login_response.cookies.get('refresh_token')
        self.assertIsNotNone(refresh_token_cookie)
        
        # Step 2: Use access token to access protected endpoint
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token_1}')
        me_response = self.client.get('/api/auth/me/')
        self.assertEqual(me_response.status_code, status.HTTP_200_OK)
        
        # Step 3: Refresh token
        refresh_response = self.client.post('/api/auth/refresh/')
        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)
        access_token_2 = refresh_response.data['access']
        self.assertNotEqual(access_token_1, access_token_2)
        
        # Step 4: Use new access token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token_2}')
        me_response_2 = self.client.get('/api/auth/me/')
        self.assertEqual(me_response_2.status_code, status.HTTP_200_OK)
        
        # Step 5: Logout
        logout_response = self.client.post('/api/auth/logout/')
        self.assertEqual(logout_response.status_code, status.HTTP_200_OK)
        
        # Step 6: Verify old token no longer works (if blacklist is enabled)
        # Note: This depends on JWT blacklist configuration
    
    def test_registration_login_access_protected_endpoint_flow(self):
        """Test complete flow: register → login → access protected endpoint"""
        # Step 1: Register
        register_response = self.client.post('/api/auth/register/', {
            'email': 'newuser@example.com',
            'password': 'securepass123',
            'password_confirm': 'securepass123',
            'first_name': 'Jane',
            'last_name': 'Smith',
            'organization': self.organization.id,
            'role': User.Role.STAFF
        })
        
        self.assertEqual(register_response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email='newuser@example.com').exists())
        
        # Step 2: Login with new credentials
        login_response = self.client.post('/api/auth/login/', {
            'email': 'newuser@example.com',
            'password': 'securepass123'
        })
        
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        access_token = login_response.data['access']
        
        # Step 3: Access protected endpoint
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        me_response = self.client.get('/api/auth/me/')
        
        self.assertEqual(me_response.status_code, status.HTTP_200_OK)
        self.assertEqual(me_response.data['email'], 'newuser@example.com')
        self.assertEqual(me_response.data['first_name'], 'Jane')
        self.assertEqual(me_response.data['last_name'], 'Smith')
    
    def test_multiple_concurrent_sessions(self):
        """Test multiple concurrent sessions with same user"""
        # Create two clients
        client1 = APIClient()
        client2 = APIClient()
        
        # Both login with same credentials
        login1 = client1.post('/api/auth/login/', {
            'email': 'test@example.com',
            'password': 'testpass123'
        })
        login2 = client2.post('/api/auth/login/', {
            'email': 'test@example.com',
            'password': 'testpass123'
        })
        
        self.assertEqual(login1.status_code, status.HTTP_200_OK)
        self.assertEqual(login2.status_code, status.HTTP_200_OK)
        
        # Both should get different tokens
        token1 = login1.data['access']
        token2 = login2.data['access']
        self.assertNotEqual(token1, token2)
        
        # Both should be able to access protected endpoints
        client1.credentials(HTTP_AUTHORIZATION=f'Bearer {token1}')
        client2.credentials(HTTP_AUTHORIZATION=f'Bearer {token2}')
        
        me1 = client1.get('/api/auth/me/')
        me2 = client2.get('/api/auth/me/')
        
        self.assertEqual(me1.status_code, status.HTTP_200_OK)
        self.assertEqual(me2.status_code, status.HTTP_200_OK)
        self.assertEqual(me1.data['email'], me2.data['email'])

