"""Factory classes for generating test data using Faker"""
from faker import Faker
from django.contrib.auth import get_user_model
from organizations.models import Organization

fake = Faker()
User = get_user_model()


class OrganizationFactory:
    """Factory for creating Organization instances"""
    
    @staticmethod
    def create(**kwargs):
        """Create an Organization with fake data"""
        defaults = {
            'name': fake.company(),
            'settings': {
                'approval_levels_count': kwargs.get('approval_levels_count', 2),
                'finance_can_see_all': kwargs.get('finance_can_see_all', False),
                'email_notifications_enabled': kwargs.get('email_notifications_enabled', True),
            }
        }
        defaults.update(kwargs)
        if 'settings' in kwargs:
            defaults['settings'].update(kwargs['settings'])
        return Organization.objects.create(**defaults)


class UserFactory:
    """Factory for creating User instances"""
    
    @staticmethod
    def create(**kwargs):
        """Create a User with fake data"""
        defaults = {
            'email': fake.unique.email(),
            'password': fake.password(length=12),
            'first_name': fake.first_name(),
            'last_name': fake.last_name(),
            'is_active': True,
        }
        defaults.update(kwargs)
        
        # Handle organization
        if 'organization' not in defaults:
            defaults['organization'] = OrganizationFactory.create()
        
        # Handle role-specific defaults
        role = defaults.get('role', User.Role.STAFF)
        if role == User.Role.APPROVER and 'approval_level' not in defaults:
            defaults['approval_level'] = 1
        
        password = defaults.pop('password')
        user = User.objects.create_user(password=password, **defaults)
        return user
    
    @staticmethod
    def create_staff(**kwargs):
        """Create a Staff user"""
        kwargs.setdefault('role', User.Role.STAFF)
        return UserFactory.create(**kwargs)
    
    @staticmethod
    def create_approver(approval_level=1, **kwargs):
        """Create an Approver user"""
        kwargs.setdefault('role', User.Role.APPROVER)
        kwargs.setdefault('approval_level', approval_level)
        return UserFactory.create(**kwargs)
    
    @staticmethod
    def create_finance(**kwargs):
        """Create a Finance user"""
        kwargs.setdefault('role', User.Role.FINANCE)
        return UserFactory.create(**kwargs)

