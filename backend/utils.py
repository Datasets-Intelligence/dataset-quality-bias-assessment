import os
from werkzeug.utils import secure_filename

ALLOWED_EXTENSIONS = {"csv"}


def ensure_upload_dir(base_dir: str) -> str:
    """Ensure uploads directory exists and return its path."""
    upload_dir = os.path.join(base_dir, "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    return upload_dir


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def save_upload(file_storage, upload_dir: str) -> str:
    """Validate and save uploaded CSV file, returning absolute path."""
    filename = secure_filename(file_storage.filename or "")
    if not filename:
        raise ValueError("No file provided")
    if not allowed_file(filename):
        raise ValueError("Only .csv files are accepted")

    # Check empty file by reading a small chunk
    head = file_storage.stream.read(1)
    if not head:
        raise ValueError("Uploaded file is empty")
    file_storage.stream.seek(0)

    dest_path = os.path.join(upload_dir, filename)
    file_storage.save(dest_path)
    return dest_path
