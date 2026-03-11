import os
import sys
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.exceptions import BadRequest

# Ensure core logic import
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CORE_DIR = BASE_DIR  # dataset_analyzer.py lives at project root
if CORE_DIR not in sys.path:
    sys.path.append(CORE_DIR)

from dataset_analyzer import analyze_dataset, suggest_target_columns  # noqa: E402
from backend.utils import ensure_upload_dir, save_upload

FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
UPLOAD_DIR = ensure_upload_dir(BASE_DIR)


@app.route("/", defaults={"filename": "index.html"})
@app.route("/<path:filename>")
def serve_frontend(filename):
    return send_from_directory(FRONTEND_DIR, filename)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


@app.route("/upload", methods=["POST"])
def upload():
    try:
        if "file" not in request.files:
            raise BadRequest("Missing file part in request")
        file = request.files["file"]
        saved_path = save_upload(file, UPLOAD_DIR)
        filename = os.path.basename(saved_path)
        return jsonify({"file": filename, "message": "Upload successful"}), 201
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400


@app.route("/analyze", methods=["POST"])
def analyze():
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


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=False)
