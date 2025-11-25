"""Mock utilities for purchase request tests"""
from unittest.mock import patch, MagicMock
from functools import wraps
from io import BytesIO
from django.core.files.uploadedfile import SimpleUploadedFile


def mock_cloudinary_upload(return_url='https://cloudinary.com/test-file.pdf'):
    """
    Mock Cloudinary upload function
    
    Can be used as a decorator or context manager:
        @mock_cloudinary_upload()
        def test_something():
            ...
        
        with mock_cloudinary_upload():
            ...
    
    Args:
        return_url: URL to return from the mock
    
    Returns:
        Mock context manager or decorator
    """
    def mock_upload(file, folder=None, **kwargs):
        return {
            'secure_url': return_url,
            'url': return_url,
            'public_id': 'test-public-id'
        }
    
    return patch('purchase_requests.utils.cloudinary.uploader.upload', side_effect=mock_upload)


def mock_celery_task():
    """
    Mock Celery task execution (make tasks run synchronously)
    
    Can be used as a context manager:
        with mock_celery_task() as mock_task:
            ...
            mock_task.assert_called_once()
    
    Returns:
        Mock context manager that returns the mock object
    """
    mock_delay = MagicMock()
    return patch('documents.tasks.process_receipt_task.delay', mock_delay)


def mock_file_upload(filename='test.pdf', content_type='application/pdf', content=b'fake pdf content'):
    """
    Create a mock file upload for testing
    
    Args:
        filename: Name of the file
        content_type: MIME type of the file
        content: File content as bytes
    
    Returns:
        SimpleUploadedFile instance
    """
    return SimpleUploadedFile(
        name=filename,
        content=content,
        content_type=content_type
    )

