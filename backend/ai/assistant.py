"""
Campus Ride-Share Platform - AI Assistant (Chatbot).

Professional, secure AI assistant supporting multiple providers:
- Groq (FREE tier, blazing fast - recommended)
- Google Gemini API (cloud, requires API key)

Security-first design: Never sends personal data (names, phones, emails) to AI.
Only sanitized ride data (IDs, routes, dates, times, prices) is included in prompts.
"""

import logging
import requests
from typing import Optional, List, Dict, Any

from backend.config import config
from backend.database.database import (
    get_all_active_rides,
    get_user_chat_count_last_minute,
    log_chat_interaction,
)
from .prompts import SYSTEM_PROMPT_TEMPLATE
from .context import get_current_date, build_rides_context


class RideShareChatbot:
    """
    Secure AI Assistant for the Campus Rideshare platform.

    Security Features:
    - NEVER sends driver names to AI
    - NEVER sends phone numbers to AI
    - NEVER sends email addresses to AI
    - NEVER sends license plates to AI
    - Only sends: Ride IDs, routes, dates, times, prices, seat counts
    
    Supports:
    - Groq (FREE, fast) - recommended
    - Google Gemini (cloud API)
    """

    def __init__(self):
        """Initialize the chatbot with the configured AI provider."""
        self.provider = config.AI_PROVIDER
        self.enabled = False
        self.client = None
        
        if config.is_groq_enabled():
            self.enabled = True
            logging.getLogger(__name__).info(
                'Groq initialized with model: %s', config.GROQ_MODEL
            )
        elif config.is_gemini_enabled():
            self.enabled = self._init_gemini()
        
        self.max_tokens = config.GEMINI_MAX_TOKENS
        self.rate_limit = config.CHATBOT_RATE_LIMIT
    
    def _init_gemini(self) -> bool:
        """Initialize Google Gemini client."""
        try:
            from google import genai
            self.client = genai.Client(api_key=config.GEMINI_API_KEY)
            self.model = config.GEMINI_MODEL
            logging.getLogger(__name__).info('Gemini client initialized')
            return True
        except Exception as e:
            logging.getLogger(__name__).warning('Gemini client init failed: %s', e)
            return False

    def _build_system_prompt(self) -> str:
        """
        Build the system prompt with SANITIZED real-time data.

        SECURITY: No personal information is included in this prompt.
        """
        current_date = get_current_date()
        ctx = build_rides_context()
        stats = ctx['stats']

        return SYSTEM_PROMPT_TEMPLATE.format(
            current_date=current_date,
            active_ride_count=len(ctx['active_rides']),
            total_users=stats['total_users'],
            average_price=int(stats['average_price']),
            origins=ctx['origins'],
            destinations=ctx['destinations'],
            rides_section=ctx['rides_section'],
        )

    def _call_groq(
        self,
        user_message: str,
        conversation_history: List[Dict[str, str]],
    ) -> Dict[str, Any]:
        """Call Groq API (FREE tier, blazing fast)."""
        system_prompt = self._build_system_prompt()
        
        # Build messages for Groq (OpenAI-compatible format)
        messages = [{"role": "system", "content": system_prompt}]
        
        for msg in conversation_history[-10:]:
            role = msg.get("role", "user")
            messages.append({
                "role": role,
                "content": msg.get("content", "")
            })
        
        messages.append({"role": "user", "content": user_message})
        
        try:
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {config.GROQ_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": config.GROQ_MODEL,
                    "messages": messages,
                    "max_tokens": self.max_tokens,
                    "temperature": 0.3,
                },
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                bot_response = data["choices"][0]["message"]["content"].strip()
                tokens_used = data.get("usage", {}).get("total_tokens", 0)
                return {
                    "success": True,
                    "response": bot_response,
                    "tokens_used": tokens_used,
                    "provider": "groq"
                }
            else:
                error_data = response.json() if response.text else {}
                error_msg = error_data.get("error", {}).get("message", f"Status {response.status_code}")
                raise Exception(f"Groq error: {error_msg}")
                
        except requests.RequestException as e:
            raise Exception(f"Groq connection error: {str(e)}")

    def _call_gemini(
        self,
        user_message: str,
        conversation_history: List[Dict[str, str]],
    ) -> Dict[str, Any]:
        """Call Google Gemini API."""
        from google.genai import types
        
        contents = []
        for msg in conversation_history[-10:]:
            role = msg.get("role", "user")
            if role == "assistant":
                role = "model"
            contents.append({
                "role": role,
                "parts": [{"text": msg.get("content", "")}],
            })
        contents.append({"role": "user", "parts": [{"text": user_message}]})

        response = self.client.models.generate_content(
            model=self.model,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=self._build_system_prompt(),
                max_output_tokens=self.max_tokens,
                temperature=0.3,
            ),
        )

        bot_response = response.text.strip()
        tokens_used = (
            response.usage_metadata.total_token_count
            if response.usage_metadata else None
        )
        
        return {
            "success": True,
            "response": bot_response,
            "tokens_used": tokens_used,
            "provider": "gemini"
        }

    def check_rate_limit(self, user_id: int) -> tuple:
        """Check if the user has exceeded the rate limit."""
        request_count = get_user_chat_count_last_minute(user_id)
        if request_count >= self.rate_limit:
            return False, "Rate limit reached. Please wait before sending another message."
        return True, ""

    def get_response(
        self,
        user_id: int,
        user_message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """
        Get a response from the AI Assistant.

        SECURITY: Personal data (names, phones, emails) is NEVER sent to AI.
        """
        if not self.enabled:
            fallback = self._get_fallback_response()
            logging.getLogger(__name__).info('AI unavailable, returning fallback response')
            return {
                "success": True,
                "response": fallback,
                "tokens_used": 0,
                "note": "fallback",
            }

        is_allowed, rate_limit_error = self.check_rate_limit(user_id)
        if not is_allowed:
            return {"success": False, "error": rate_limit_error, "response": rate_limit_error}

        if not user_message or not user_message.strip():
            return {"success": False, "error": "Please enter a message.", "response": "Please enter a message."}

        if len(user_message) > 1000:
            return {
                "success": False,
                "error": "Message too long.",
                "response": "Message exceeds 1000 character limit. Please shorten your query.",
            }

        conversation_history = conversation_history or []

        try:
            # Call the appropriate provider
            if config.is_groq_enabled():
                result = self._call_groq(user_message, conversation_history)
            else:
                result = self._call_gemini(user_message, conversation_history)

            log_chat_interaction(
                user_id=user_id,
                user_message=user_message,
                bot_response=result["response"],
                tokens_used=result.get("tokens_used"),
            )

            return result

        except Exception as e:
            error_message = str(e)
            fallback_response = self._get_fallback_response()

            try:
                log_chat_interaction(
                    user_id=user_id,
                    user_message=user_message,
                    bot_response=f"[ERROR] {fallback_response}",
                    tokens_used=0,
                )
            except Exception:
                pass

            logging.getLogger(__name__).warning('Chatbot error: %s', error_message)

            return {
                "success": True,
                "response": fallback_response,
                "tokens_used": 0,
                "note": "fallback",
                "error": error_message,
            }

    def _get_fallback_response(self) -> str:
        """Get a professional fallback response when the API fails."""
        try:
            active_rides = get_all_active_rides()
            ride_count = len(active_rides)

            if ride_count > 0:
                destinations = list(set([r['destination'] for r in active_rides[:5]]))
                dest_list = ", ".join(destinations[:3])
                return (
                    f"Experiencing technical difficulties. {ride_count} rides are currently "
                    f"available to destinations including {dest_list}. Please use the Search "
                    f"page to find and book rides."
                )
            else:
                return (
                    "Experiencing technical difficulties. Please use the Search page to "
                    "browse available rides, or try again in a moment."
                )
        except Exception:
            return "Experiencing technical difficulties. Please use the Search page or try again in a moment."

    def get_quick_suggestions(self) -> List[str]:
        """Get professional quick action buttons based on current data."""
        suggestions = []

        try:
            active_rides = get_all_active_rides()

            if active_rides:
                destinations = {}
                for ride in active_rides:
                    dest = ride['destination']
                    destinations[dest] = destinations.get(dest, 0) + 1

                sorted_dests = sorted(destinations.items(), key=lambda x: x[1], reverse=True)

                if sorted_dests:
                    suggestions.append(f"Search {sorted_dests[0][0]} rides")

                suggestions.append("Check weekend availability")
                suggestions.append("View pricing guide")
            else:
                suggestions.append("How to post a ride")

            suggestions.append("Platform help")

        except Exception:
            suggestions = ["Search available rides", "How booking works", "Platform help"]

        return suggestions[:4]

    def get_initial_greeting(self) -> str:
        """Get the professional initial greeting for the chat interface."""
        try:
            active_rides = get_all_active_rides()
            ride_count = len(active_rides)

            if ride_count > 0:
                destinations = list(set([r['destination'] for r in active_rides]))[:3]
                dest_text = ", ".join(destinations)
                return (
                    f"I can help you find rides, check availability, or answer questions about "
                    f"the platform. Currently {ride_count} rides available to destinations "
                    f"including {dest_text}. What would you like to know?"
                )
            else:
                return (
                    "I can help you find rides, check availability, or answer questions about "
                    "the platform. What would you like to know?"
                )
        except Exception:
            return (
                "I can help you find rides, check availability, or answer questions about "
                "the platform. What would you like to know?"
            )


# Global chatbot instance
chatbot = RideShareChatbot()


def get_chat_response(
    user_id: int,
    message: str,
    history: Optional[List[Dict[str, str]]] = None,
) -> Dict[str, Any]:
    """Convenience function to get a chatbot response."""
    return chatbot.get_response(user_id, message, history)


def get_quick_suggestions() -> List[str]:
    """Convenience function to get quick suggestions."""
    return chatbot.get_quick_suggestions()


def get_initial_greeting() -> str:
    """Convenience function to get the initial greeting."""
    return chatbot.get_initial_greeting()
