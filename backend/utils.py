import os
from werkzeug.utils import secure_filename

ALLOWED_EXTENSIONS = {"csv", "xlsx", "xls", "json"}


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
        raise ValueError("Only .csv, .xlsx, .xls, and .json files are accepted")

    # Check empty file by reading a small chunk
    head = file_storage.stream.read(1)
    if not head:
        raise ValueError("Uploaded file is empty")
    file_storage.stream.seek(0)

    dest_path = os.path.join(upload_dir, filename)
    file_storage.save(dest_path)
    return dest_path


def standardize_to_csv(file_storage, upload_dir: str) -> str:
    """
    Universal Ingestion Layer: Takes any allowed dataset file,
    reads it, and standardizes it to a robust CSV format.
    Returns the absolute path to the generated CSV file.
    """
    import pandas as pd
    import uuid
    
    filename = secure_filename(file_storage.filename or "")
    if not filename:
        raise ValueError("No file provided")
    if not allowed_file(filename):
        raise ValueError("Only .csv, .xlsx, .xls, and .json files are accepted")

    ext = filename.rsplit(".", 1)[1].lower()
    
    # Generate unique standard filename base
    base_name = filename.rsplit(".", 1)[0]
    std_filename = f"{base_name}_{uuid.uuid4().hex[:6]}.csv"
    std_path = os.path.join(upload_dir, std_filename)
    
    try:
        if ext == "csv":
            # For CSVs, just save directly (save_upload handles emptiness check)
            file_storage.stream.seek(0)
            file_storage.save(std_path)
            
            # Optional: verify it opens cleanly (catches bad encodings/corrupt files early)
            pd.read_csv(std_path, nrows=5)
            
        elif ext in ["xlsx", "xls"]:
            file_storage.stream.seek(0)
            df = pd.read_excel(file_storage.stream)
            df.to_csv(std_path, index=False)
            
        elif ext == "json":
            file_storage.stream.seek(0)
            content = file_storage.stream.read().decode('utf-8')
            
            # Try multiple orientations
            try:
                df = pd.read_json(content, orient='records')
            except ValueError:
                try:
                    df = pd.read_json(content, orient='split')
                except ValueError:
                    df = pd.read_json(content) # Fallback
            
            df.to_csv(std_path, index=False)
            
    except Exception as e:
        # Cleanup if something failed
        if os.path.exists(std_path):
            os.remove(std_path)
        raise ValueError(f"Failed to parse and standardize the {ext.upper()} file: {str(e)}")

    return std_path

