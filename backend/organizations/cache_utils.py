from django.core.cache import cache
from .models import Organization


def get_organization_settings(organization_id: str, ttl: int = 3600) -> dict:
    """
    Get organization settings from cache or database
    
    Args:
        organization_id: Organization ID
        ttl: Time to live in seconds (default: 1 hour)
    
    Returns:
        Dictionary with organization settings
    """
    cache_key = f"org_settings_{organization_id}"
    settings = cache.get(cache_key)
    
    if settings is None:
        try:
            org = Organization.objects.get(id=organization_id)
            settings = org.settings
            cache.set(cache_key, settings, ttl)
        except Organization.DoesNotExist:
            settings = {}
    
    return settings


def invalidate_organization_cache(organization_id: str):
    """Invalidate organization settings cache"""
    cache_key = f"org_settings_{organization_id}"
    cache.delete(cache_key)


def get_user_permissions_cache_key(user_id: str) -> str:
    """Get cache key for user permissions"""
    return f"user_permissions_{user_id}"


def cache_user_permissions(user_id: str, permissions: dict, ttl: int = 1800):
    """
    Cache user permissions
    
    Args:
        user_id: User ID
        permissions: Dictionary with permissions
        ttl: Time to live in seconds (default: 30 minutes)
    """
    cache_key = get_user_permissions_cache_key(user_id)
    cache.set(cache_key, permissions, ttl)


def get_cached_user_permissions(user_id: str) -> dict:
    """Get cached user permissions"""
    cache_key = get_user_permissions_cache_key(user_id)
    return cache.get(cache_key, {})


def invalidate_user_permissions_cache(user_id: str):
    """Invalidate user permissions cache"""
    cache_key = get_user_permissions_cache_key(user_id)
    cache.delete(cache_key)

