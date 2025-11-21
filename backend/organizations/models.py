from django.db import models
from django.utils.text import slugify


class Organization(models.Model):
    """Organization model for multi-tenancy"""
    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    settings = models.JSONField(
        default=dict,
        help_text="Organization-specific settings"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def get_setting(self, key, default=None):
        """Get a setting value with default"""
        return self.settings.get(key, default)

    def set_setting(self, key, value):
        """Set a setting value"""
        self.settings[key] = value
        self.save(update_fields=['settings'])

    @property
    def approval_levels_count(self):
        """Get the number of required approval levels"""
        return self.get_setting('approval_levels_count', 2)

    @property
    def finance_can_see_all(self):
        """Check if finance can see all requests"""
        return self.get_setting('finance_can_see_all', False)

    @property
    def email_notifications_enabled(self):
        """Check if email notifications are enabled"""
        return self.get_setting('email_notifications_enabled', True)
