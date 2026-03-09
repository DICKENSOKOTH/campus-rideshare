"""
Campus Rideshare - Standardised API Response Helpers (Flask)
All API responses follow the same JSON envelope for consistency.
"""

from flask import jsonify, make_response
import math


# Core envelope

def _envelope(success: bool,
              data=None,
              message: str = "",
              errors=None,
              status: int = 200):
    payload = {
        "success": success,
        "message": message,
        "data": data,
    }
    if errors is not None:
        payload["errors"] = errors
    return make_response(jsonify(payload), status)


# Success responses

def success_response(data=None,
                     message: str = "OK",
                     status: int = 200):
    """Generic 200 success."""
    return _envelope(True, data=data, message=message, status=status)


def created_response(data=None,
                     message: str = "Created successfully"):
    """201 Created."""
    return _envelope(True, data=data, message=message, status=201)


def no_content_response():
    """204 No Content."""
    return _envelope(True, message="No content", status=204)


# Error responses

def error_response(message: str = "An error occurred",
                   status: int = 400,
                   errors=None):
    """Generic client-error response."""
    return _envelope(False, message=message, errors=errors, status=status)


def validation_error(errors,
                     message: str = "Validation failed"):
    """422 Unprocessable Entity."""
    if isinstance(errors, str):
        errors = {"detail": errors}
    return _envelope(False, message=message, errors=errors, status=422)


def not_found_response(resource: str = "Resource"):
    """404 Not Found."""
    return _envelope(False, message=f"{resource} not found.", status=404)


def unauthorized_response(
        message: str = "Authentication required."):
    """401 Unauthorized."""
    return _envelope(False, message=message, status=401)


def forbidden_response(
        message: str = "You do not have permission to perform this action."):
    """403 Forbidden."""
    return _envelope(False, message=message, status=403)


def server_error_response(
        message: str = "Internal server error."):
    """500 Internal Server Error."""
    return _envelope(False, message=message, status=500)


def conflict_response(
        message: str = "Conflict with existing data."):
    """409 Conflict."""
    return _envelope(False, message=message, status=409)


# Paginated list helper

def paginated_response(items: list,
                       total: int,
                       page: int,
                       page_size: int,
                       message: str = "OK"):
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
