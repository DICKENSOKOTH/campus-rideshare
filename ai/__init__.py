"""
AI Module - Campus Rideshare AI chatbot powered by Google Gemini.

Security-first design: Never sends personal data to Gemini.
"""
from .assistant import chatbot, get_chat_response, get_quick_suggestions, get_initial_greeting

__all__ = ['chatbot', 'get_chat_response', 'get_quick_suggestions', 'get_initial_greeting']
