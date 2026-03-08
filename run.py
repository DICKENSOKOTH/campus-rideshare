#!/usr/bin/env python
"""
RideU - App Setup File
This file sets up how our app receives and handles requests.
WSGI handles normal requests, ASGI handles live/realtime ones

"""

import os
import sys


def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.config')

    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Make sure it's installed and "
            "your virtual environment is activated.") from exc

    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
