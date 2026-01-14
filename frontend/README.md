# Frontend - Dataset Quality and Bias Assessment

## Overview

This is a single-page web application (SPA) for analyzing dataset quality and bias in machine learning datasets. It communicates with the Flask backend API to provide comprehensive dataset analysis.

## File Structure

```
frontend/
├── index.html       # Main HTML page - layout matching wireframe
├── styles.css       # CSS styling - academic, clean design
├── script.js        # JavaScript logic - workflow implementation
└── README.md        # This file
```

## Setup Instructions

### 1. Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- Backend server running on `http://127.0.0.1:8000`
- Backend endpoints: `/health`, `/upload`, `/analyze`

### 2. Starting the Application

Simply open `index.html` in your browser:

**Option A: Direct File**
```bash
# Windows
start frontend/index.html

# macOS
open frontend/index.html

# Linux
xdg-open frontend/index.html
```

**Option B: Local HTTP Server** (recommended)
```bash
# Python 3
python -m http.server 8080 --directory frontend

# Then visit: http://localhost:8080
```

**Option C: Live Server** (if using VS Code)
- Install "Live Server" extension
- Right-click `index.html` → "Open with Live Server"

## User Workflow

### Step 1: Upload Dataset
1. Click "Choose File" button
2. Select a `.csv` file from your computer
3. File is automatically uploaded to backend
4. Success message appears when complete

### Step 2: Enter Target Variable
1. Once file is uploaded, "Target Variable" field becomes enabled
2. Enter the exact column name to predict/analyze
3. Example: `Recommended Career Path`, `Salary`, etc.

### Step 3: Run Analysis
1. Click "Run Analysis" button (enabled when both file and target are provided)
2. UI shows "Analyzing..." state
3. Wait for backend to process
4. Results automatically render

### Step 4: Review Results
Results section displays:
- **Dataset Statistics**: Total records, feature count, data completeness
- **Quality Issues**: Missing values, duplicates, imbalance, outliers, leakage
- **Model Evaluation**: Problem type, model type, train/test scores, gap
- **Bias Analysis**: Performance across sensitive attributes (if applicable)
- **Recommendations**: Actionable suggestions based on analysis

## Architecture

### Component Structure

**HTML (index.html)**
- Header: Project title and metadata
- Configuration Section: File upload, target input, run button
- Error Container: Dismissible error messages
- Results Section: Dynamic results panels
- Footer: Academic project information

**CSS (styles.css)**
- Modern, academic design with purple gradient theme
- Responsive grid layout
- Loading animations and states
- Mobile-friendly breakpoints at 768px and 480px
- Clean color palette: purples, grays, greens (success), reds (errors)

**JavaScript (script.js)**
- State management: `appState` object tracks user data
- File upload handling with client-side validation
- Fetch API calls to backend
- Dynamic HTML rendering for results
- Error handling and user feedback
- Loading state management

### Key Functions

#### File Upload
```javascript
handleFileChange()          // Validate and trigger upload
uploadDataset(file)         // Send to backend POST /upload
setLoadingState()           // Show uploading... state
showUploadSuccess()         // Display confirmation
```

#### Analysis
```javascript
handleRunAnalysis()         // Validate inputs
runAnalysis()               // Send to backend POST /analyze
renderResults()             // Display all results
```

#### Results Rendering
```javascript
renderStatistics()          // Dataset statistics cards
renderQualityIssues()       // Quality issues list
renderModelMetrics()        // Baseline model metrics
renderBiasAnalysis()        // Bias table (conditional)
renderRecommendations()     // Recommendations list
```

#### Error Handling
```javascript
showError(message)          // Display error message
hideError()                 // Dismiss error
```

## API Integration

### Backend Endpoints

**POST /upload**
- Request: `multipart/form-data` with key `file`
- Response: `{ "file": "filename.csv", "message": "Upload successful" }`
- Status: 201 Created

**POST /analyze**
- Request: 
  ```json
  {
    "file": "filename.csv",
    "target": "column_name"
  }
  ```
- Response: Complete analysis JSON with:
  - `dataset_statistics`
  - `quality_issues`
  - `model_metrics`
  - `bias_findings`
  - `recommendations`
  - `warnings`
- Status: 200 OK

## Styling & Customization

### Color Scheme
- Primary: `#667eea` (indigo)
- Secondary: `#764ba2` (purple)
- Success: `#22543d` (dark green)
- Error: `#742a2a` (dark red)
- Background: `#f8f9fa` (light gray)

### Responsive Breakpoints
- Desktop: Default
- Tablet: 768px max-width
- Mobile: 480px max-width

### Fonts
- System font stack for optimal performance
- No external font dependencies

## Browser Compatibility

| Browser | Support |
|---------|---------|
| Chrome  | ✓ Full |
| Firefox | ✓ Full |
| Safari  | ✓ Full |
| Edge    | ✓ Full |
| IE 11   | ✗ Not supported |

## Troubleshooting

### File Upload Not Working
- Ensure file is `.csv` format
- Check backend is running on `http://127.0.0.1:8000`
- Check browser console for network errors
- Verify CORS (if running on different host)

### Analysis Not Running
- Ensure target column name is exact match (case-sensitive)
- Wait for upload to complete first
- Check browser console for error messages
- Verify backend API is responding

### Results Not Displaying
- Check browser console for JavaScript errors
- Verify JSON response from backend is valid
- Ensure all required fields in backend response

### Loading Indicators Stuck
- Page may be frozen due to network error
- Check browser console for fetch errors
- Refresh page and retry

## Development Notes

### Adding New Result Sections
1. Add HTML structure to `index.html`
2. Add corresponding CSS to `styles.css`
3. Create render function in `script.js`
4. Call from `renderResults()`

### Modifying API Integration
- Update `API_BASE_URL` constant in `script.js`
- Adjust payload/response parsing as needed
- Maintain error handling patterns

### Performance Optimization
- Results automatically scroll into view
- Loading states prevent duplicate submissions
- Error messages have dismiss buttons
- No unnecessary re-renders

## Security Considerations

- ✓ Input validation on file type (.csv only)
- ✓ HTML escaping for recommendations (XSS prevention)
- ✓ Error messages don't expose file paths
- ✓ No local storage of sensitive data
- ✓ No authentication required (as per spec)

## Version Info

- **Framework**: Vanilla HTML/CSS/JavaScript
- **Dependencies**: None (no external libraries)
- **Target**: Modern browsers (2020+)
- **Status**: Production ready

## Support

For issues or questions:
1. Check browser console (F12) for errors
2. Review backend logs for API issues
3. Verify network requests in Network tab
4. Check this README for common solutions

---

**Last Updated**: January 2026  
**Project**: Minor Project–II - Web-Based Dataset Quality and Bias Assessment for Machine Learning
