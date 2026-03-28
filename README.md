# Dataset Quality & Bias Assessment

> A practical diagnostic tool for analyzing dataset quality, detecting bias, and evaluating baseline machine learning performance — before your model ever trains.

[![Python](https://img.shields.io/badge/Python-3.8%2B-blue)](https://python.org)
[![Flask](https://img.shields.io/badge/Backend-Flask-lightgrey)](https://flask.palletsprojects.com)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Org](https://img.shields.io/badge/Org-Dataset--Intelligence-purple)](https://github.com/Datasets-Intelligence)

---

## 🚀 Features

### 📂 Universal Data Ingestion
- Upload **CSV**, **Excel (.xlsx / .xls)**, and **JSON** files
- All formats are automatically standardized to CSV on the backend — zero friction for the analysis engine

### 🎯 Smart Target Column Suggestions
- After upload, the system **automatically recommends the most likely target columns** based on column names, data types, cardinality, and position in the dataset
- Suggestions appear as clickable chips — click one to populate the target field instantly
- Works for **all three file formats** (CSV, JSON, Excel)

### 📊 Dataset Statistics
- Total records, feature count, and completeness percentage

### 🔍 Data Quality Checks
- **Missing values** — count and percentage per column
- **Duplicate rows** — count and percentage of dataset
- **Class imbalance** — adaptive threshold based on number of classes
- **Outlier detection** — IQR method across all numerical features
- **Data leakage detection** — correlation-based analysis against target

### 🤖 Baseline Model Evaluation
- Automatic problem-type detection (classification vs. regression)
- Decision Tree baseline (fast, no preprocessing assumptions)
- Train / Test score and **overfitting gap** detection
- Capped at 20,000 training samples for speed

### ⚖️ Bias Analysis
- Detects sensitive attributes (gender, age, race, religion, ethnicity)
- Per-group accuracy breakdown on the held-out test set
- Flags performance disparity when group gap exceeds threshold

### 📈 Visual Analytics (Tab 3)
- Missing values bar chart
- Target distribution (pie for classification, histogram for regression)
- Confusion matrix (classification) or Prediction vs Actual scatter (regression)
- Feature distribution histograms (top 5 numerical features)

### 🛠 Improve Dataset
- One-click automated cleaning:
  - Remove duplicates
  - Impute missing values (median for numeric, mode for categorical)
  - Cap outliers using IQR bounds
- Download the cleaned dataset as CSV

### 💬 AI Chat Assistant
- Ask questions about your dataset's specific analysis results
- Powered by Qwen via Groq (or any OpenAI-compatible provider)

---

## 🏗️ System Architecture

```
Browser (HTML + CSS + JS)
        │
        │  REST API (JSON)
        ▼
Flask Backend  (backend/app.py)
        │
        │  Universal Ingestion Layer (backend/utils.py)
        │  Excel / JSON → CSV standardization
        ▼
Core Analysis Engine  (dataset_analyzer.py)
  ├── DatasetAnalyzer class
  ├── suggest_target_columns()
  └── clean_dataset()
```

---

## 📁 Project Structure

```
dataset-quality-bias-assessment/
├── backend/
│   ├── app.py            ← Flask API (upload, analyze, suggest, improve, chat, download)
│   └── utils.py          ← File ingestion & CSV standardization layer
├── frontend/
│   ├── index.html        ← Single-page UI
│   ├── styles.css        ← Custom CSS design system
│   └── script.js         ← All frontend logic & Chart.js rendering
├── dataset_analyzer.py   ← Core analysis engine
├── uploads/              ← Runtime upload folder (git-ignored)
├── requirements.txt
├── .gitignore
└── README.md
```

---

## ⚙️ Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Datasets-Intelligence/dataset-quality-bias-assessment.git
cd dataset-quality-bias-assessment
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. (Optional) Configure AI Chat

```bash
# Set your API key for the AI assistant (Groq by default)
set QWEN_API_KEY=your_api_key_here         # Windows
export QWEN_API_KEY=your_api_key_here      # Linux / macOS

# Optional: override model or base URL for other providers
# set QWEN_BASE_URL=https://openrouter.ai/api/v1
# set QWEN_MODEL=qwen/qwen3-32b
```

### 4. Start the backend

```bash
python backend/app.py
```

Backend runs at: `http://127.0.0.1:8000`

### 5. Open the frontend

Simply navigate to `http://127.0.0.1:8000` in your browser — the backend serves the frontend automatically.

> Alternatively: `cd frontend && python -m http.server 5500` and open `http://127.0.0.1:5500`

---

## 🧪 How It Works

1. **Upload** a CSV, Excel, or JSON dataset
2. **Select** the target column (or click a suggestion chip)
3. **Run Analysis** — results appear across four tabs:
   - **Tab 1** — Quality Issues & Dataset Statistics
   - **Tab 2** — Model Metrics & Bias Analysis
   - **Tab 3** — Visualizations
   - **Tab 4** — Recommendations & AI Chat
4. **Improve Dataset** — run automated cleaning and download the result

---

## 📦 Requirements

```
flask
flask-cors
pandas
numpy
scikit-learn
openpyxl      # Excel support
openai        # AI chat (optional)
```

Install all at once:

```bash
pip install -r requirements.txt
```

---

## ⚠️ Current Limitations

- Designed for **small to medium datasets** (< 500k rows recommended)
- Large datasets (> 1M rows) may be slow due to in-memory processing
- Synchronous request handling — one analysis at a time per server instance
- AI chat requires an external API key

---

## 🔮 Roadmap

- [ ] Asynchronous background analysis jobs
- [ ] Chunk-based processing for very large datasets
- [ ] Downloadable PDF/HTML analysis reports
- [ ] Additional ML models (Random Forest, XGBoost baseline)
- [ ] Advanced fairness metrics (equalized odds, demographic parity)
- [ ] Dataset versioning and comparison

---

## 🤝 Contributing

Contributions are welcome!

```bash
# Recommended workflow
git checkout -b feature/your-feature-name
# make your changes
git commit -m "feat: describe your change"
git push origin feature/your-feature-name
# open a Pull Request on GitHub
```

Please ensure:
- Changes are documented
- Any new endpoints are reflected in the README
- Code follows the existing style

---

## 📜 License

[MIT License](LICENSE) — free to use, modify, and distribute.

---

## 🌟 Organization

Maintained by **[Dataset-Intelligence](https://github.com/Datasets-Intelligence)**
> Building tools for dataset quality analysis, bias detection, and reliable machine learning systems.
