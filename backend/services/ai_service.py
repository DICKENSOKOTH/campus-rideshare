"""
AI Service - bridge between routes and the AI module.

Provides convenience functions for the route layer to call
the AI chatbot without direct coupling.
"""
from typing import Optional, List, Dict, Any


def get_chat_response(
    user_id: int,
    message: str,
    history: Optional[List[Dict[str, str]]] = None,
) -> Dict[str, Any]:
    """Get a chatbot response (delegates to ai.assistant)."""
    from backend.ai.assistant import get_chat_response as _get_chat_response
    return _get_chat_response(user_id, message, history)


def get_quick_suggestions() -> List[str]:
    """Get quick action suggestions for the chat UI."""
    from backend.ai.assistant import get_quick_suggestions as _get_suggestions
    return _get_suggestions()


def get_initial_greeting() -> str:
    """Get the initial greeting for the chat UI."""
    from backend.ai.assistant import get_initial_greeting as _get_greeting
    return _get_greeting()
