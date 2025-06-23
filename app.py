from flask import Flask, render_template, request, jsonify
from openai import OpenAI
import os

app = Flask(__name__, static_folder="static", template_folder="templates")
chat_history = []


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
            model="deepseek/deepseek-r1-0528-qwen3-8b:free",
            extra_headers={
                "HTTP-Referer": "https://sk-ant-api03.onrender.com",
                "X-Title": "ClaudeMultilingualContextBot"
            },
            messages=full_convo
        )

        reply = completion.choices[0].message.content

        # Save assistant's reply too
        chat_history.append({"role": "assistant", "content": reply})

        return jsonify({"reply": reply})

    except Exception as e:
        print("Error:", e)
        return jsonify({"reply": "Error talking to the model."}), 500

if __name__ == "__main__":
    app.run(debug=True)
