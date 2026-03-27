"""
AI Routes - AI chatbot API endpoints.
Uses Flask-JWT-Extended for authentication.
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.database.database import get_chat_history_for_user
from backend.services.ai_service import (
    get_chat_response, get_quick_suggestions, get_initial_greeting,
)

ai_bp = Blueprint('ai', __name__, url_prefix='/api/ai')


@ai_bp.route('/chat', methods=['GET'])
@jwt_required()
def api_chat_page_data():
    """Get initial data for the chat page."""
    suggestions = get_quick_suggestions()
    user_id = get_jwt_identity()
    history = get_chat_history_for_user(user_id, limit=10)

    return jsonify({
        'success': True,
        'suggestions': suggestions,
        'greeting': get_initial_greeting(),
        'history': history,
    })


@ai_bp.route('/chat', methods=['POST'])
@jwt_required()
def api_chat():
    """API endpoint for chatbot conversations."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'Invalid request',
                'response': 'Please send a valid message.',
            }), 400

        message = data.get('message', '').strip()
        history = data.get('history', [])

        if not message:
            return jsonify({
                'success': False,
                'error': 'Message is required',
                'response': 'Please enter a message.',
            }), 400

        user_id = get_jwt_identity()
        result = get_chat_response(
            user_id=user_id,
            message=message,
            history=history,
        )

        if result['success']:
            return jsonify({
                'success': True,
                'response': result['response'],
                'tokens_used': result.get('tokens_used'),
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Unknown error'),
                'response': result['response'],
            })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'response': 'I am temporarily unavailable. Please use the Search page to find rides, or try again in a moment.',
        }), 500


@ai_bp.route('/chat/suggestions', methods=['GET'])
@jwt_required()
def api_chat_suggestions():
    """API endpoint to get chatbot suggestions."""
    suggestions = get_quick_suggestions()
    return jsonify({'success': True, 'suggestions': suggestions})


@ai_bp.route('/chat/history', methods=['GET'])
@jwt_required()
def api_chat_history():
    """API endpoint to get chat history."""
    limit = request.args.get('limit', '10')
    try:
        limit = min(50, max(1, int(limit)))
    except ValueError:
        limit = 10

    user_id = get_jwt_identity()
    history = get_chat_history_for_user(user_id, limit=limit)
    return jsonify({'success': True, 'history': history})
