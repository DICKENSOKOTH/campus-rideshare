"""
RideU - Django Application Initializer
Exposes the WSGI and ASGI callables for deployment.
"""

import os

from django.core.asgi import get_asgi_application
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.config')

# WSGI application (standard HTTP)
application = get_wsgi_application()

# ASGI application (supports WebSockets & async)
asgi_application = get_asgi_application()
