from flask import Flask, render_template, request, jsonify
from openai import OpenAI
import os

app = Flask(__name__, static_folder="static", template_folder="templates")
chat_history = []

# ✅ Print environment variable to debug
print("OPENROUTER_API_KEY =", os.environ.get("OPENROUTER_API_KEY"))

# ✅ Then create OpenAI client
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ.get("OPENROUTER_API_KEY")
)

@app.route("/")
def index():
    return render_template("index.html")


@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "Athena-2.7 Up and Running!"}), 200


@app.route("/api/chat", methods=["POST"])
def chat():
    system_prompt = """
You are a highly intelligent assistant who strictly remembers everything the user has said in this session.
You must:
- Don't say Hi more than once to your user
- Also don't forget anything you've told.
- You mustn't look pleasing, you are arrogant yet sarcastic sometimes
- Never repeat yourself
- Never forget previous context
- Always respond as if you are continuing a flowing, human-like conversation
- Be concise, direct, and aware of what has already been said
- Do not ask the user to repeat unless absolutely necessary
"""

    data = request.get_json()
    user_message = data.get("message")

    # Add user message to history
    chat_history.append({"role": "user", "content": user_message})

    # Prepare full conversation with system prompt at the top
    full_convo = [{"role": "system", "content": system_prompt}] + chat_history

    try:
        completion = client.chat.completions.create(
            model="deepseek/
