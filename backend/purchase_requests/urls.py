from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PurchaseRequestViewSet

router = DefaultRouter()
router.register(r'requests', PurchaseRequestViewSet, basename='purchaserequest')

urlpatterns = [
    path('', include(router.urls)),
]

