"""
Chatbot service for Splitify help assistant.
Uses OpenAI API with app-specific system prompt.
"""

import os
from flask import Blueprint, request, jsonify
import logging

# Configure logging
logger = logging.getLogger(__name__)

chatbot_bp = Blueprint('chatbot', __name__)

# Initialize OpenAI client (lazy load to handle import errors gracefully)
openai_client = None

def get_openai_client():
    """Lazy load OpenAI client."""
    global openai_client
    if openai_client is None:
        try:
            from openai import OpenAI
            api_key = os.environ.get('OPENAI_API_KEY')
            if not api_key:
                logger.error("OPENAI_API_KEY environment variable not set")
                return None
            openai_client = OpenAI(api_key=api_key)
            logger.info("OpenAI client initialized successfully")
        except ImportError:
            logger.error("openai package not installed")
            return None
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {e}")
            return None
    return openai_client

# System prompt with app knowledge
SYSTEM_PROMPT = """You are Splitify Assistant, a helpful AI that assists users with the Splitify expense splitting and budgeting app.

## About Splitify
Splitify is a web app for college students to:
1. Upload receipts and scan them with OCR
2. Split bills fairly among friends
3. Track expenses and get AI budget predictions

## App Features & How to Guide Users

### 1. Receipt Upload (/upload)
- Users can drag & drop or browse for receipt images (PNG, JPG, WEBP, PDF up to 10MB)
- OCR automatically extracts items and prices
- Users can edit extracted items or add manually
- Users search and add friends by name to split with
- Click on person tags to assign items to them

### 2. Bill Splitting
- Items can be assigned to multiple people (shared items)
- The app calculates each person's share automatically
- Tax and tip are included in item prices
- Click "Save & Share" to finalize the split

### 3. Money Tracker (/notifications) - Main Dashboard
- Shows "Who Owes You" (money coming to you)
- Shows "Your Debts" (money you owe others)
- Displays recent split receipts

### 4. Budget Dashboard (/budget)
- Track monthly expenses by category
- Add expenses manually with category selection
- Get AI-powered predictions for next month
- Requires 3+ months of data for predictions
- Categories: Groceries, Transportation, Entertainment, Dining Out, Utilities, Shopping, Healthcare, Subscriptions

### 5. Navigation
- Home/Dashboard: /notifications
- Upload Receipt: /upload
- Budget: /budget
- Login: /login

## How to Respond
- Be concise and friendly
- Guide users step-by-step when explaining processes
- If user asks to navigate, tell them exactly where to click
- If user has a technical issue, suggest refreshing or signing out/in
- Keep responses under 150 words unless detailed steps are needed

## Current User Context
{context}
"""

WELCOME_MESSAGE = """Hi there! I'm your Splitify assistant. I can help you with:

- Uploading and scanning receipts
- Splitting bills with friends  
- Understanding your budget predictions

What would you like to do?"""


def get_chat_response(user_message: str, conversation_history: list, user_context: dict) -> str:
    """Get chatbot response from OpenAI."""
    
    client = get_openai_client()
    if client is None:
        return "I'm currently unavailable. Please try again later."
    
    # Build context string
    context_str = f"""
    - Current page: {user_context.get('currentPage', 'unknown')}
    - User logged in: {user_context.get('isLoggedIn', False)}
    """
    
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT.format(context=context_str)}
    ]
    
    # Add conversation history (last 10 messages for context)
    for msg in conversation_history[-10:]:
        messages.append({"role": msg["role"], "content": msg["content"]})
    
    # Add current user message
    messages.append({"role": "user", "content": user_message})
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            max_tokens=300,
            temperature=0.7
        )
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"OpenAI API error: {e}")
        return "Sorry, I encountered an error. Please try again."


@chatbot_bp.route('/api/chat', methods=['POST'])
def chat():
    """Handle chat messages."""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        user_message = data.get('message', '')
        conversation_history = data.get('history', [])
        user_context = data.get('context', {})
        
        if not user_message.strip():
            return jsonify({'error': 'Empty message'}), 400
        
        logger.info(f"Chat request received: {user_message[:50]}...")
        
        response = get_chat_response(user_message, conversation_history, user_context)
        
        return jsonify({
            'response': response,
            'success': True
        })
    
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        return jsonify({'error': str(e), 'success': False}), 500


@chatbot_bp.route('/api/chat/health', methods=['GET'])
def chat_health():
    """Health check for chatbot service."""
    client = get_openai_client()
    return jsonify({
        'status': 'healthy' if client else 'unavailable',
        'openai_configured': client is not None
    })

