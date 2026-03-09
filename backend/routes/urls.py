"""
RideU - URL Configuration
Temporary placeholder until Member 4 adds the full routes.
"""

from django.urls import path
from django.http import JsonResponse


def health(request):
    return JsonResponse({
        "status": "ok", 
        "app": "RideU",
        "version": "1.0.0",
        "description": "RideU is a ride sharing app that connects drivers and riders",
        "message": "Server is up and running!"
    })



urlpatterns = [
    path('api/health/', health),
]
