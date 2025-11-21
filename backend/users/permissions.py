from rest_framework import permissions
from .models import User


class IsStaff(permissions.BasePermission):
    """Permission to check if user is Staff"""
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == User.Role.STAFF
        )


class IsApprover(permissions.BasePermission):
    """Permission to check if user is Approver"""
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == User.Role.APPROVER
        )


class IsFinance(permissions.BasePermission):
    """Permission to check if user is Finance"""
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == User.Role.FINANCE
        )


class CanApproveAtLevel(permissions.BasePermission):
    """Permission to check if user can approve at a specific level"""
    
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        
        if request.user.role != User.Role.APPROVER:
            return False
        
        # Get the required approval level from the view
        required_level = getattr(view, 'required_approval_level', None)
        if required_level is None:
            # Try to get from request data
            required_level = request.data.get('approval_level')
        
        if required_level is None:
            return False
        
        return request.user.approval_level == required_level


class IsInOrganization(permissions.BasePermission):
    """Permission to check if user belongs to the request's organization"""
    
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Check if object has organization attribute
        if hasattr(obj, 'organization'):
            return obj.organization == request.user.organization
        
        # Check if object is a user
        if isinstance(obj, User):
            return obj.organization == request.user.organization
        
        return False

