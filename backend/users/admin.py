from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'role', 'approval_level', 'organization', 'is_active', 'created_at']
    list_filter = ['role', 'organization', 'is_active', 'is_staff']
    search_fields = ['email', 'first_name', 'last_name']
    ordering = ['email']
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Organization & Role', {
            'fields': ('organization', 'role', 'approval_level')
        }),
    )
    
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Organization & Role', {
            'fields': ('organization', 'role', 'approval_level','email')
        }),
    )
