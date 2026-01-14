# Quick Start Guide

## Dataset Quality and Bias Assessment Tool

### 🚀 Getting Started in 3 Steps

#### Step 1: Start the Backend
```bash
cd "C:\minnor project _ 2"
python backend/app.py
```
Backend will start on: **http://127.0.0.1:8000**

You should see:
```
WARNING in app.run, running on http://127.0.0.1:8000
```

#### Step 2: Open the Frontend
Choose one of these options:

**Option A: Direct File (Simplest)**
```bash
start frontend/index.html
```

**Option B: Python HTTP Server (Recommended)**
```bash
cd frontend
python -m http.server 8080
```
Then visit: **http://localhost:8080**

**Option C: Using VS Code**
- Right-click `frontend/index.html`
- Select "Open with Live Server"

#### Step 3: Use the Application

1. Click **"Choose File"** and select `final_project_dataset.csv`
2. Wait for upload to complete (green success message)
3. Enter target column: `Recommended Career Path`
4. Click **"Run Analysis"**
5. Review results in the Results section

---

## 📁 Project Structure

```
C:\minnor project _ 2\
├── backend/
│   ├── app.py              # Flask API
│   └── utils.py            # Utility functions
├── frontend/
│   ├── index.html          # Main page
│   ├── styles.css          # Styling
│   ├── script.js           # JavaScript logic
│   └── README.md           # Frontend docs
├── dataset_analyzer.py     # Analysis logic
├── final_project_dataset.csv   # Sample data
├── FRONTEND_IMPLEMENTATION.md   # Implementation details
└── QUICKSTART.md           # This file
```

---

## ✅ Verification Checklist

**Backend Running?**
```bash
curl http://127.0.0.1:8000/health
# Should return: {"status":"ok"}
```

**Frontend Loaded?**
- Check browser address bar shows correct URL
- Purple header visible with project title
- Configuration section visible with "Choose File" button

**Can Upload File?**
- Click "Choose File" button
- Select `final_project_dataset.csv`
- File name should appear next to button
- Green success message should appear

**Can Run Analysis?**
- Enter `Recommended Career Path` in target field
- Click "Run Analysis"
- Wait for analysis to complete
- Results should appear below (statistics cards, quality issues, etc.)

---

## 🔧 Troubleshooting

### Backend won't start
```
Issue: "Address already in use"
Solution: Port 8000 is occupied. Stop other processes or use different port.
```

### Frontend won't connect to backend
```
Issue: "Error: Upload failed"
Solution: Ensure backend is running on http://127.0.0.1:8000
          Check browser console (F12) for network errors
```

### File upload fails
```
Issue: "Please select a CSV file"
Solution: Only .csv files are supported. Check file extension.
```

### Analysis fails
```
Issue: "Analysis failed" error
Solution: Ensure target column name is exact (case-sensitive)
          Example: "Recommended Career Path" NOT "recommended career path"
```

---

## 📊 Sample Workflow

```
1. Start backend          → python backend/app.py
2. Open frontend          → start frontend/index.html  
3. Upload CSV file        → final_project_dataset.csv
4. Enter target column    → "Recommended Career Path"
5. Run analysis           → Click "Run Analysis"
6. Wait for processing    → ~5-10 seconds
7. Review results         → Scroll down to see all sections
```

---

## 🎯 Expected Results

After analysis completes, you should see:

**Dataset Statistics** (3 cards):
- Total Records: 200
- Feature Count: 13
- Completeness: ~100%

**Quality Issues**:
- Missing values (if any)
- Duplicates count
- Class balance info
- Outliers detected
- Data leakage check

**Model Metrics**:
- Problem type: classification
- Model type: DecisionTreeClassifier
- Train/Test scores
- Train-Test gap

**Recommendations**:
- Data quality suggestions
- Model improvement tips
- Bias mitigation strategies

---

## 💡 Tips & Tricks

**Keyboard Shortcuts**
- `Tab` - Navigate between form fields
- `Enter` - Submit after selecting file or entering target
- `F12` - Open browser developer tools (for debugging)

**Mobile Testing**
- Press `F12` in browser
- Click device icon (top-left of DevTools)
- Select device (iPhone, iPad, Android, etc.)
- Test responsive layout

**Performance**
- First analysis: ~2-5 seconds
- Subsequent analyses: ~1-3 seconds
- Backend processing time depends on dataset size

**Data Persistence**
- Results only stored while page is open
- Refresh page = clear all data
- No data saved to disk/database

---

## 📚 Documentation

**Detailed Documentation:**
- `frontend/README.md` - Frontend setup and features
- `FRONTEND_IMPLEMENTATION.md` - Implementation details and architecture
- `QUICKSTART.md` - This file

**Backend Documentation:**
- `backend/app.py` - Flask API endpoints
- `dataset_analyzer.py` - Analysis logic and functions

---

## 🆘 Getting Help

### Check Error Console
Press `F12` → Console tab → Look for red error messages

### Common Issues

| Issue | Solution |
|-------|----------|
| Port 8000 in use | Kill process: `netstat -ano \| findstr :8000` |
| File not uploading | Ensure .csv format, check file size < 50MB |
| Analysis stuck | Check browser console for errors, try refresh |
| Results not showing | Ensure JSON response from backend is valid |

### Support Resources

1. **Browser Console** - F12 → Console for errors
2. **Network Tab** - F12 → Network to see API calls
3. **Backend Logs** - Check terminal where backend is running
4. **README Files** - In frontend/ and root directories

---

## 🎓 Project Information

**Project Title:** Web-Based Dataset Quality and Bias Assessment for Machine Learning

**Type:** Minor Project–II (Academic)

**Components:**
- ✓ Backend API (Flask, Python)
- ✓ Frontend UI (HTML/CSS/JavaScript)
- ✓ Analysis Engine (pandas, scikit-learn)
- ✓ Testing Suite (Comprehensive tests)

**Status:** ✓ Complete and Tested

---

## 📝 Notes

- Backend runs on `http://127.0.0.1:8000`
- Frontend runs on any local port (8080 recommended)
- No external API keys or authentication needed
- No database required
- All processing is local
- Results refresh on each analysis

---

**Last Updated:** January 2026

**Ready to start?** Follow the 3 steps above! 🚀
