"""
Health check view for monitoring and Docker health checks.
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Simple health check endpoint that returns 200 OK.
    Used by Docker health checks and monitoring systems.
    Does not require authentication.
    """
    return Response(
        {'status': 'healthy', 'service': 'procure-to-pay-backend'},
        status=status.HTTP_200_OK
    )

