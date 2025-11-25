"""Factory classes for generating test data using Faker"""
from faker import Faker
from decimal import Decimal
from django.contrib.auth import get_user_model
from organizations.models import Organization
from ..models import PurchaseRequest, RequestItem, Approval

fake = Faker()
User = get_user_model()


class PurchaseRequestFactory:
    """Factory for creating PurchaseRequest instances"""
    
    @staticmethod
    def create(**kwargs):
        """Create a PurchaseRequest with fake data"""
        defaults = {
            'title': fake.sentence(nb_words=4),
            'description': fake.text(max_nb_chars=200),
            'amount': Decimal(str(round(fake.pydecimal(left_digits=5, right_digits=2, positive=True), 2))),
            'status': PurchaseRequest.Status.PENDING,
        }
        defaults.update(kwargs)
        
        # Handle organization
        if 'organization' not in defaults:
            defaults['organization'] = Organization.objects.create(
                name=fake.company(),
                settings={'approval_levels_count': 2}
            )
        
        # Handle created_by
        if 'created_by' not in defaults:
            defaults['created_by'] = User.objects.create_user(
                email=fake.unique.email(),
                password=fake.password(),
                organization=defaults['organization'],
                role=User.Role.STAFF
            )
        
        return PurchaseRequest.objects.create(**defaults)


class RequestItemFactory:
    """Factory for creating RequestItem instances"""
    
    @staticmethod
    def create(**kwargs):
        """Create a RequestItem with fake data"""
        defaults = {
            'description': fake.sentence(nb_words=3),
            'quantity': Decimal(str(round(fake.pydecimal(left_digits=3, right_digits=2, positive=True), 2))),
            'unit_price': Decimal(str(round(fake.pydecimal(left_digits=4, right_digits=2, positive=True), 2))),
        }
        defaults.update(kwargs)
        
        # Handle request
        if 'request' not in defaults:
            defaults['request'] = PurchaseRequestFactory.create()
        
        return RequestItem.objects.create(**defaults)


class ApprovalFactory:
    """Factory for creating Approval instances"""
    
    @staticmethod
    def create(**kwargs):
        """Create an Approval with fake data"""
        defaults = {
            'approval_level': 1,
            'action': Approval.Action.APPROVED,
            'comments': fake.text(max_nb_chars=100),
        }
        defaults.update(kwargs)
        
        # Handle request
        if 'request' not in defaults:
            defaults['request'] = PurchaseRequestFactory.create()
        
        # Handle approver
        if 'approver' not in defaults:
            defaults['approver'] = User.objects.create_user(
                email=fake.unique.email(),
                password=fake.password(),
                organization=defaults['request'].organization,
                role=User.Role.APPROVER,
                approval_level=defaults['approval_level']
            )
        
        return Approval.objects.create(**defaults)

