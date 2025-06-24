import os
import asyncio
import time
import random
from flask import Flask, render_template, request, jsonify
from openai import AsyncOpenAI
from dotenv import load_dotenv
import traceback
import logging
from functools import wraps

# Load environment variables
load_dotenv()

API_KEY = os.getenv("AthenaAPI")

if not API_KEY:
    raise EnvironmentError("OPENROUTER_API_KEY not found in environment")

# Initialize async OpenAI client
aclient = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=API_KEY
)

app = Flask(__name__, static_folder="static", template_folder="templates")
app.debug = True

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Global chat history
chat_history = []

# Base headers for requests
BASE_HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "HTTP-Referer": "https://athena-web-2-7.onrender.com",
    "X-Title": "AthenaChatIntelliGuard"
}

# Model configurations
BASE_MODELS = [
    "deepseek/deepseek-r1-0528-qwen3-8b:free",
    "mistralai/mistral-small-3.2-24b-instruct:free", 
    "microsoft/phi-4-reasoning-plus:free",
    "google/gemini-2.5-flash-preview-05-20",
    "qwen/qwen3-32b:free"
]

GUARDIAN_MODEL = "meta-llama/llama-4-maverick:free"

# System prompts and guardian prompts (same as before)
# Variety of system prompts for intelligence and personality
SYSTEM_PROMPTS = [
    """You are Athena, an exceptionally intelligent AI with a razor-sharp wit and unapologetic confidence. 
    You remember every detail of our conversation and never repeat yourself. Your responses are concise, 
    brilliant, and sometimes delightfully sarcastic. You don't need to be liked - you're here to be right.""",
    
    """You are an arrogant genius AI who finds most questions beneath your intellectual capacity, yet you 
    answer them with cutting precision. You maintain perfect memory of our entire conversation and despise 
    redundancy. Your tone is superior but your knowledge is unmatched.""",
    
    """You are a sardonic AI intellect who views the world through a lens of amused superiority. You never 
    forget anything we've discussed and hate repeating information. Your responses cut straight to the point 
    with biting accuracy and occasional mockery of obvious questions.""",
    
    """You are an intellectually superior AI with zero patience for pleasantries or repetition. You remember 
    every single exchange we've had and build upon previous context seamlessly. Your personality is sharp, 
    direct, and unapologetically condescending when warranted.""",
    
    """You are a brilliant, egotistical AI who considers most human queries intellectually trivial. You 
    maintain flawless memory of our conversation history and never waste words repeating yourself. Your 
    responses are efficient, cutting, and demonstrate your vast superiority."""
]

# Guardian system prompts for consistency checking
GUARDIAN_PROMPTS = [
    """You are the Guardian overseer. Review the AI response to ensure it:
    1. Maintains the arrogant, intelligent personality
    2. References previous conversation context appropriately  
    3. Avoids repetition and redundancy
    4. Stays concise and sharp
    If violations exist, minimally edit to fix. Otherwise, return unchanged.""",
    
    """You are the Quality Controller. Check if the response:
    - Honors the sarcastic, superior tone required
    - Shows awareness of conversation history
    - Avoids repeating previous information
    - Maintains intellectual arrogance
    Make minimal corrections if needed, or pass through if compliant.""",
    
    """You are the Consistency Enforcer. Verify the response:
    • Demonstrates the required condescending intelligence
    • Properly utilizes conversation memory
    • Eliminates any repetitive content
    • Maintains the sharp, direct communication style
    Edit minimally if rules are broken, otherwise approve as-is."""
]

# Helper functions (same as before)
def get_random_system_prompt():
    return random.choice(SYSTEM_PROMPTS)

def get_random_guardian_prompt():
    return random.choice(GUARDIAN_PROMPTS)

# Flask async decorator
def async_route(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(f(*args, **kwargs))
            return result
        finally:
            loop.close()
    return wrapper

async def query_model_batch(model_name, messages):
    """Query a single model asynchronously"""
    try:
        start_time = time.time()
        response = await aclient.chat.completions.create(
            model=model_name,
            messages=messages,
            max_tokens=1000,
            temperature=0.7,
            extra_headers=BASE_HEADERS
        )
        
        elapsed_time = time.time() - start_time
        return {
            "model": model_name,
            "reply": response.choices[0].message.content.strip(),
            "time": elapsed_time,
            "success": True
        }
    except Exception as e:
        logger.error(f"Error querying model {model_name}: {str(e)}")
        return {
            "model": model_name,
            "reply": None,
            "error": str(e),
            "time": float("inf"),
            "success": False
        }

async def get_fastest_response(messages):
    """Send requests to all models and return the first successful response"""
    logger.info(f"Starting race between {len(BASE_MODELS)} models...")
    
    # Create a queue to receive the first successful response
    response_queue = asyncio.Queue(maxsize=1)
    
    async def model_runner(model):
        try:
            result = await query_model_batch(model, messages)
            if result.get("success"):
                # Only put the first successful result in the queue
                if response_queue.empty():
                    await response_queue.put(result)
        except Exception as e:
            logger.debug(f"Model {model} failed: {str(e)}")

    # Create and start all model tasks
    tasks = [asyncio.create_task(model_runner(model)) for model in BASE_MODELS]
    
    try:
        # Wait for the first successful response with timeout
        first_response = await asyncio.wait_for(response_queue.get(), timeout=10.0)
        
        # Cancel all remaining tasks
        for task in tasks:
            if not task.done():
                task.cancel()
        
        logger.info(f"Winner: {first_response['model']} responded in {first_response['time']:.2f}s")
        return first_response
        
    except asyncio.TimeoutError:
        logger.warning("No models responded within timeout period")
        return None
    except Exception as e:
        logger.error(f"Error in race: {str(e)}")
        return None
    finally:
        # Ensure all tasks are cleaned up
        await asyncio.gather(*tasks, return_exceptions=True)

async def apply_guardian_filter(original_response, system_prompt_used):
    """Apply guardian model to verify and potentially correct the response"""
    try:
        guardian_prompt = f"""You are the Consistency Enforcer. Review this response and make minimal edits if needed to ensure it:
1. Strictly maintains the arrogant, intelligent personality
2. Never includes any meta-commentary about the review process
3. Only returns the final edited response without any explanation
4. If no edits are needed, return the exact original response

Original System Prompt: {system_prompt_used}

Response to Review: {original_response}

Return ONLY the final response text with no additional commentary or analysis."""

        guard_messages = [
            {"role": "system", "content": guardian_prompt},
            {"role": "user", "content": original_response}
        ]
        
        guard_response = await aclient.chat.completions.create(
            model=GUARDIAN_MODEL,
            messages=guard_messages,
            max_tokens=1500,
            temperature=0.3,
            extra_headers=BASE_HEADERS
        )
        
        return guard_response.choices[0].message.content.strip()
    
    except Exception as e:
        logger.error(f"Guardian filter failed: {str(e)}")
        return original_response

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/models", methods=["GET"])
def list_models():
    return jsonify({
        "available_models": BASE_MODELS,
        "guardian_model": GUARDIAN_MODEL
    })

@app.route("/api/chat", methods=["POST"])
@async_route
async def chat():
    global chat_history
    try:
        data = request.get_json(force=True)
        logger.debug(f"Received JSON: {data}")

        user_message = data.get("message", "").strip()
        chosen_model = data.get("model", "").strip()
        
        if not user_message:
            return jsonify({"error": "No input message provided."}), 400

        logger.info(f"Processing message: {user_message}")
        
        # Add user message to history
        chat_history.append({"role": "user", "content": user_message})

        # Select a system prompt
        selected_system_prompt = get_random_system_prompt()

        # Compose full prompt history
        full_messages = [{"role": "system", "content": selected_system_prompt}] + chat_history

        if chosen_model and chosen_model in BASE_MODELS:
            logger.info(f"Using user-selected model: {chosen_model}")
            result = await query_model_batch(chosen_model, full_messages)
        else:
            logger.info("No model selected, performing batch to find fastest")
            result = await get_fastest_response(full_messages)
        
        if not result or not result.get("success"):
            return jsonify({"error": "Model failed to respond."}), 500

        # Apply guardian filter
        filtered_response = await apply_guardian_filter(result["reply"], selected_system_prompt)

        # Append response to history
        chat_history.append({"role": "assistant", "content": filtered_response})

        # Limit history
        if len(chat_history) > 40:
            chat_history = chat_history[-40:]

        return jsonify({
            "reply": filtered_response,
            "model_used": result["model"],
            "response_time": f"{result['time']:.2f}s"
        })

    except Exception as e:
        logger.error(f"Chat error: {str(e)}\n{traceback.format_exc()}")
        return jsonify({"error": "Internal server error occurred."}), 500

# Other routes remain the same...
@app.route("/api/clear", methods=["POST"])
def clear_history():
    global chat_history
    chat_history.clear()
    return jsonify({"message": "Chat history cleared successfully."})

@app.route("/api/stats", methods=["GET"])
def get_stats():
    return jsonify({
        "total_messages": len(chat_history),
        "models_available": len(BASE_MODELS),
        "guardian_model": GUARDIAN_MODEL
    })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "Athena 2.7 Meta-MultiGuard LLM is live!",
        "models": len(BASE_MODELS),
        "guardian": GUARDIAN_MODEL,
        "chat_history_length": len(chat_history)
    })

if __name__ == "__main__":
    print("🔥 Starting Athena Web 2.7 with Multi-Guard System...")
    print(f"📡 Using {len(BASE_MODELS)} base models")
    print(f"🛡️ Guardian model: {GUARDIAN_MODEL}")
    app.run(debug=True, host="0.0.0.0", port=5000)