from django.utils.functional import SimpleLazyObject
from .models import Organization


def get_organization(request):
    """Get organization from request header or subdomain"""
    if not hasattr(request, '_cached_organization'):
        organization = None
        
        # Try to get from header (X-Organization-ID or X-Organization-Slug)
        org_id = request.headers.get('X-Organization-ID')
        org_slug = request.headers.get('X-Organization-Slug')
        
        if org_id:
            try:
                organization = Organization.objects.get(id=org_id)
            except Organization.DoesNotExist:
                pass
        elif org_slug:
            try:
                organization = Organization.objects.get(slug=org_slug)
            except Organization.DoesNotExist:
                pass
        
        # If user is authenticated, try to get from user's organization
        if not organization and request.user.is_authenticated:
            if hasattr(request.user, 'organization') and request.user.organization:
                organization = request.user.organization
        
        request._cached_organization = organization
    
    return request._cached_organization


class OrganizationMiddleware:
    """Middleware to set organization context"""
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.organization = SimpleLazyObject(lambda: get_organization(request))
        response = self.get_response(request)
        return response

