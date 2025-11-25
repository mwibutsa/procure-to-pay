"""Test utilities for user tests"""
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from .factories import OrganizationFactory, UserFactory
from django.contrib.auth import get_user_model

User = get_user_model()


def get_authenticated_client(user=None, organization=None):
    """
    Get an authenticated APIClient
    
    Args:
        user: User instance (if None, creates a new user)
        organization: Organization instance (if None, creates a new org)
    
    Returns:
        APIClient with authentication headers set
    """
    if organization is None:
        organization = OrganizationFactory.create()
    
    if user is None:
        user = UserFactory.create(organization=organization)
    
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return client, user


def create_test_organization(**kwargs):
    """Create a test organization"""
    return OrganizationFactory.create(**kwargs)


def create_test_users(organization=None, **kwargs):
    """
    Create test users with different roles
    
    Args:
        organization: Organization instance (if None, creates a new org)
        **kwargs: Additional kwargs for organization creation
    
    Returns:
        dict with 'organization', 'staff', 'approver1', 'approver2', 'finance'
    """
    if organization is None:
        organization = OrganizationFactory.create(**kwargs)
    
    return {
        'organization': organization,
        'staff': UserFactory.create_staff(organization=organization),
        'approver1': UserFactory.create_approver(approval_level=1, organization=organization),
        'approver2': UserFactory.create_approver(approval_level=2, organization=organization),
        'finance': UserFactory.create_finance(organization=organization),
    }

