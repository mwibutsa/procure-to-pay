"""Utility functions for purchase requests"""
import cloudinary.uploader
from django.conf import settings
from typing import Optional, Tuple, List


def upload_file_to_cloudinary(file, folder: str = 'procure-to-pay') -> Optional[str]:
    """
    Upload a file to Cloudinary and return the URL
    
    Args:
        file: Django UploadedFile or file-like object
        folder: Cloudinary folder path
        
    Returns:
        URL string if successful, None if failed
    """
    try:
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            file,
            folder=folder,
            resource_type='auto',  # Auto-detect: image, video, raw (PDF)
            use_filename=True,
            unique_filename=True,
        )
        return result.get('secure_url') or result.get('url')
    except Exception as e:
        # Log error in production
        print(f"Error uploading file to Cloudinary: {str(e)}")
        return None


def validate_file_type(file, allowed_types: List[str] = None) -> Tuple[bool, Optional[str]]:
    """
    Validate file type
    
    Args:
        file: Django UploadedFile
        allowed_types: List of allowed MIME types or extensions
        
    Returns:
        (is_valid, error_message)
    """
    if allowed_types is None:
        allowed_types = [
            'application/pdf',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp',
        ]
    
    # Check content type
    if file.content_type not in allowed_types:
        return False, f"File type {file.content_type} not allowed. Allowed types: {', '.join(allowed_types)}"
    
    # Check file extension as backup
    allowed_extensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp']
    file_extension = file.name.lower().split('.')[-1] if '.' in file.name else ''
    if f'.{file_extension}' not in allowed_extensions:
        return False, f"File extension .{file_extension} not allowed"
    
    return True, None


def validate_file_size(file, max_size_mb: int = 10) -> Tuple[bool, Optional[str]]:
    """
    Validate file size
    
    Args:
        file: Django UploadedFile
        max_size_mb: Maximum file size in MB
        
    Returns:
        (is_valid, error_message)
    """
    max_size_bytes = max_size_mb * 1024 * 1024  # Convert MB to bytes
    
    if file.size > max_size_bytes:
        return False, f"File size exceeds {max_size_mb}MB limit"
    
    return True, None

