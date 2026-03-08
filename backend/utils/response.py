"""
RideU - Standardised API Response Helpers
All API responses follow the same JSON envelope for consistency.
"""

from django.http import JsonResponse
import math



# Core envelope

def _envelope(success: bool,
              data=None,
              message: str = "",
              errors=None,
              status: int = 200) -> JsonResponse:
    payload = {
        "success": success,
        "message": message,
        "data": data,
    }
    if errors is not None:
        payload["errors"] = errors
    return JsonResponse(payload, status=status)



# Success responses

def success_response(data=None,
                     message: str = "OK",
                     status: int = 200) -> JsonResponse:
    """Generic 200 success."""
    return _envelope(True, data=data, message=message, status=status)


def created_response(data=None,
                     message: str = "Created successfully") -> JsonResponse:
    """201 Created."""
    return _envelope(True, data=data, message=message, status=201)


def no_content_response() -> JsonResponse:
    """204 No Content."""
    return _envelope(True, message="No content", status=204)


# Error responses

def error_response(message: str = "An error occurred",
                   errors=None,
                   status: int = 400) -> JsonResponse:
    """Generic client-error response."""
    return _envelope(False, message=message, errors=errors, status=status)


def validation_error(errors,
                     message: str = "Validation failed") -> JsonResponse:
    """422 Unprocessable Entity — field-level validation errors."""
    if isinstance(errors, str):
        errors = {"detail": errors}
    return _envelope(False, message=message, errors=errors, status=422)


def not_found_response(resource: str = "Resource") -> JsonResponse:
    """404 Not Found."""
    return _envelope(False, message=f"{resource} not found.", status=404)


def unauthorized_response(
        message: str = "Authentication required.") -> JsonResponse:
    """401 Unauthorized."""
    return _envelope(False, message=message, status=401)


def forbidden_response(
    message: str = "You do not have permission to perform this action."
) -> JsonResponse:
    """403 Forbidden."""
    return _envelope(False, message=message, status=403)


def server_error_response(
        message: str = "Internal server error.") -> JsonResponse:
    """500 Internal Server Error."""
    return _envelope(False, message=message, status=500)


def conflict_response(
        message: str = "Conflict with existing data.") -> JsonResponse:
    """409 Conflict."""
    return _envelope(False, message=message, status=409)


# Paginated list helper

def paginated_response(items: list,
                       total: int,
                       page: int,
                       page_size: int,
                       message: str = "OK") -> JsonResponse:
    """Wrap a paginated list with metadata."""
    data = {
        "items": items,
        "pagination": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": math.ceil(total / page_size) if page_size else 1,
        }
    }
    return _envelope(True, data=data, message=message, status=200)
