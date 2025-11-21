from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from organizations.models import Organization


class UserManager(BaseUserManager):
    """Custom user manager"""
    
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """Custom User model with organization and role support"""
    
    class Role(models.TextChoices):
        STAFF = 'STAFF', 'Staff'
        APPROVER = 'APPROVER', 'Approver'
        FINANCE = 'FINANCE', 'Finance'
    
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, blank=True, null=True)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='users',
        null=True,
        blank=True
    )
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.STAFF
    )
    approval_level = models.IntegerField(
        null=True,
        blank=True,
        help_text="Approval level for APPROVER role (1, 2, 3, etc.)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    class Meta:
        ordering = ['email']

    def __str__(self):
        return self.email

    def clean(self):
        """Validate that approval_level is set for APPROVER role"""
        from django.core.exceptions import ValidationError
        if self.role == self.Role.APPROVER and self.approval_level is None:
            raise ValidationError({
                'approval_level': 'Approval level is required for APPROVER role'
            })
        if self.role != self.Role.APPROVER and self.approval_level is not None:
            raise ValidationError({
                'approval_level': 'Approval level should only be set for APPROVER role'
            })

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def is_staff_role(self):
        """Check if user has STAFF role"""
        return self.role == self.Role.STAFF

    @property
    def is_approver_role(self):
        """Check if user has APPROVER role"""
        return self.role == self.Role.APPROVER

    @property
    def is_finance_role(self):
        """Check if user has FINANCE role"""
        return self.role == self.Role.FINANCE
