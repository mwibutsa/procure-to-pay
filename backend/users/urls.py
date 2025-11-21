from django.urls import path
from .views import login_view, logout_view, refresh_token_view, me_view, UserRegistrationView

urlpatterns = [
    path('login/', login_view, name='login'),
    path('logout/', logout_view, name='logout'),
    path('refresh/', refresh_token_view, name='refresh'),
    path('me/', me_view, name='me'),
    path('register/', UserRegistrationView.as_view(), name='register'),
]

