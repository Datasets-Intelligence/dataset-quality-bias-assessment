import os
import sys
import json
import threading
import time
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.exceptions import BadRequest

# ── Core logic import ──────────────────────────────────────────────────────
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

from dataset_analyzer import analyze_dataset, suggest_target_columns, clean_dataset  # noqa: E402
from backend.utils import ensure_upload_dir, save_upload  # noqa: E402

FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
UPLOAD_DIR = ensure_upload_dir(BASE_DIR)


# ── Background cleanup: delete uploads older than 30 minutes ───────────────
def _cleanup_uploads():
    while True:
        time.sleep(600)  # check every 10 min
        try:
            cutoff = time.time() - 1800  # 30 min
            for fname in os.listdir(UPLOAD_DIR):
                fpath = os.path.join(UPLOAD_DIR, fname)
                if os.path.isfile(fpath) and os.path.getmtime(fpath) < cutoff:
                    try:
                        os.remove(fpath)
                    except OSError:
                        pass
        except Exception:
            pass


_cleanup_thread = threading.Thread(target=_cleanup_uploads, daemon=True)
_cleanup_thread.start()


# ── Static frontend ─────────────────────────────────────────────────────────
@app.route("/", defaults={"filename": "index.html"})
@app.route("/<path:filename>")
def serve_frontend(filename):
    return send_from_directory(FRONTEND_DIR, filename)


# ── Health ───────────────────────────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


# ── Upload ───────────────────────────────────────────────────────────────────
@app.route("/upload", methods=["POST"])
def upload():
    try:
        if "file" not in request.files:
            raise BadRequest("Missing file part in request")
        
        file = request.files["file"]
        original_filename = file.filename or "unknown"
        from backend.utils import standardize_to_csv
        
        # This converts Excel/JSON to CSV on the fly
        # All formats land as .csv so all downstream logic (suggest, analyze) works uniformly
        saved_path = standardize_to_csv(file, UPLOAD_DIR)
        csv_filename = os.path.basename(saved_path)
        
        return jsonify({
            "file": csv_filename,              # internal CSV reference used for /suggest_target and /analyze
            "original_filename": original_filename,  # original name for display only
            "message": "Upload and standardization successful"
        }), 201
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400


# ── Analyze ──────────────────────────────────────────────────────────────────
@app.route("/analyze", methods=["POST"])
def analyze():
    file_path = None
    try:
        data = request.get_json(silent=True) or request.form
        if not data:
            raise BadRequest("Request body required")

        filename = data.get("file")
        target = data.get("target") or data.get("target_column")

        if not filename:
            raise BadRequest("'file' is required (upload reference)")
        if not target:
            raise BadRequest("'target' column name is required")

        file_path = os.path.join(UPLOAD_DIR, os.path.basename(filename))
        if not os.path.isfile(file_path):
            raise BadRequest("Uploaded file not found; upload first")

        result = analyze_dataset(file_path, target)
        return jsonify(result), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400


# ── Suggest target ───────────────────────────────────────────────────────────
@app.route("/suggest_target", methods=["POST"])
def suggest_target():
    try:
        data = request.get_json(silent=True) or {}
        filename = data.get("file")

        if not filename:
            raise BadRequest("'file' is required")

        file_path = os.path.join(UPLOAD_DIR, os.path.basename(filename))
        if not os.path.isfile(file_path):
            raise BadRequest("Uploaded file not found; upload first")

        suggestions = suggest_target_columns(file_path)
        return jsonify({"suggestions": suggestions}), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400


# ── Improve Dataset ──────────────────────────────────────────────────────────
@app.route("/improve_dataset", methods=["POST"])
def improve_dataset():
    try:
        data = request.get_json(silent=True) or {}
        filename = data.get("file")

        if not filename:
            raise BadRequest("'file' is required")

        file_path = os.path.join(UPLOAD_DIR, os.path.basename(filename))
        if not os.path.isfile(file_path):
            raise BadRequest("Uploaded file not found; upload first")

        result = clean_dataset(file_path)
        cleaned_df = result["cleaned_df"]

        # Save cleaned CSV
        cleaned_filename = "cleaned_" + os.path.basename(filename)
        cleaned_path = os.path.join(UPLOAD_DIR, cleaned_filename)
        cleaned_df.to_csv(cleaned_path, index=False)

        return jsonify({
            "change_log": result["change_log"],
            "original_stats": result["original_stats"],
            "cleaned_stats": result["cleaned_stats"],
            "cleaned_file": cleaned_filename,
        }), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400


# ── Download cleaned file ────────────────────────────────────────────────────
@app.route("/download/<path:filename>", methods=["GET"])
def download_file(filename):
    try:
        safe_name = os.path.basename(filename)
        file_path = os.path.join(UPLOAD_DIR, safe_name)
        if not os.path.isfile(file_path):
            return jsonify({"error": "File not found"}), 404
        return send_from_directory(UPLOAD_DIR, safe_name, as_attachment=True)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400


# ── LLM Chat ─────────────────────────────────────────────────────────────────
@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json(silent=True) or {}
        user_message = data.get("message", "").strip()
        analysis_context = data.get("analysis_context", {})

        if not user_message:
            raise BadRequest("'message' is required")

        api_key = os.environ.get("QWEN_API_KEY", "")
        if not api_key:
            return jsonify({
                "reply": (
                    "⚠️ Qwen API key not configured. Set the QWEN_API_KEY environment "
                    "variable and restart the backend to enable the AI assistant. "
                    "Get a key from your provider (OpenRouter, Dashscope, Together AI, etc.)."
                )
            }), 200

        # OpenAI-compatible client — Groq is the default provider.
        # Override with QWEN_BASE_URL if using a different provider.
        # Dashscope: https://dashscope.aliyuncs.com/compatible-mode/v1
        # OpenRouter: https://openrouter.ai/api/v1
        base_url = os.environ.get("QWEN_BASE_URL", "https://api.groq.com/openai/v1")
        
        # Groq hosts Qwen 3 32B under this exact ID:
        model_name = os.environ.get("QWEN_MODEL", "qwen/qwen3-32b")

        from openai import OpenAI
        client = OpenAI(api_key=api_key, base_url=base_url)

        # Build a rich system prompt injecting the full analysis context
        context_json = json.dumps(analysis_context, indent=2)[:8000]  # cap to avoid token overflow

        system_prompt = f"""You are Dataset Intelligence Assistant, an expert ML data scientist
helping a user understand and improve their machine learning dataset.

IMPORTANT: Do NOT include any <think> tags or internal reasoning in your response.
Respond directly and concisely to the user's question.

The user has just run an automated analysis on their dataset. Here are the FULL analysis results:

{context_json}

Based ONLY on this specific dataset's analysis results, answer the user's question.
Be specific — mention actual column names, actual numbers, actual issues found.
Do NOT give generic textbook answers. If you mention a technique (like SMOTE), explain
whether it applies to THIS specific dataset and why.
Keep responses concise but complete, using plain language a non-expert can understand.
Use bullet points where helpful.
/no_think
"""

        completion = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_message},
            ],
            max_tokens=1024,
        )
        reply_text = completion.choices[0].message.content or ""

        # Strip Qwen 3 <think>...</think> reasoning blocks if present
        import re
        reply_text = re.sub(r'<think>.*?</think>', '', reply_text, flags=re.DOTALL).strip()

        return jsonify({"reply": reply_text}), 200

    except Exception as exc:
        return jsonify({"error": str(exc)}), 400


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=False)
