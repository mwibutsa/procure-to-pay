from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from .serializers import LoginSerializer, UserSerializer, UserRegistrationSerializer

User = get_user_model()


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Login view"""
    serializer = LoginSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)
    user = serializer.validated_data['user']
    
    # Generate tokens
    refresh = RefreshToken.for_user(user)
    
    # Set tokens in httpOnly cookies
    response = Response({
        'user': UserSerializer(user).data,
        'access': str(refresh.access_token),
    }, status=status.HTTP_200_OK)
    
    response.set_cookie(
        'refresh_token',
        str(refresh),
        httponly=True,
        secure=not request.get_host().startswith('localhost'),
        samesite='Lax',
        max_age=60 * 60 * 24 * 7  # 7 days
    )
    
    return response


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Logout view"""
    response = Response({'detail': 'Successfully logged out.'}, status=status.HTTP_200_OK)
    response.delete_cookie('refresh_token')
    return response


@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token_view(request):
    """Refresh token view"""
    refresh_token = request.COOKIES.get('refresh_token') or request.data.get('refresh')
    
    if not refresh_token:
        return Response(
            {'detail': 'Refresh token not provided.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        refresh = RefreshToken(refresh_token)
        response = Response({
            'access': str(refresh.access_token),
        }, status=status.HTTP_200_OK)
        
        # Rotate refresh token
        refresh.set_jti()
        refresh.set_exp()
        response.set_cookie(
            'refresh_token',
            str(refresh),
            httponly=True,
            secure=not request.get_host().startswith('localhost'),
            samesite='Lax',
            max_age=60 * 60 * 24 * 7  # 7 days
        )
        
        return response
    except Exception as e:
        return Response(
            {'detail': 'Invalid refresh token.'},
            status=status.HTTP_401_UNAUTHORIZED
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    """Get current user"""
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


class UserRegistrationView(generics.CreateAPIView):
    """User registration view"""
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = UserRegistrationSerializer
