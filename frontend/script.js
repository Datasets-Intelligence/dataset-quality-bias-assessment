const API_BASE_URL = 'http://127.0.0.1:8000';
let appState = {
    uploadedFile: null,           // Filename reference from backend
    targetColumn: null,           // Target column name
    analysisResults: null,        // Complete results from backend
    isUploading: false,           // Upload in progress
    isAnalyzing: false,            // Analysis in progress
    charts: {}                    // Chart.js instances
};



const elements = {
    // File upload
    fileInput: document.getElementById('file-input'),
    fileButton: document.getElementById('file-button'),
    fileName: document.getElementById('file-name'),
    uploadStatus: document.getElementById('upload-status'),
    
    // Target variable
    targetInput: document.getElementById('target-input'),
    
    // Analysis button
    runButton: document.getElementById('run-button'),
    
    // Error container
    errorContainer: document.getElementById('error-container'),
    errorMessage: document.getElementById('error-message'),
    errorClose: document.getElementById('error-close'),
    
    // Results section
    resultsSection: document.getElementById('results-section'),
    
    // Statistics
    statRecords: document.getElementById('stat-records'),
    statFeatures: document.getElementById('stat-features'),
    statCompleteness: document.getElementById('stat-completeness'),
    
    // Quality issues
    qualityIssues: document.getElementById('quality-issues'),
    
    // Model metrics
    modelMetrics: document.getElementById('model-metrics'),
    
    // Bias section
    biasSection: document.getElementById('bias-section'),
    biasTable: document.getElementById('bias-table'),
    
    // Recommendations
    recommendations: document.getElementById('recommendations')
};



document.addEventListener('DOMContentLoaded', () => {
    // Setup event listeners
    elements.fileButton.addEventListener('click', handleFileButtonClick);
    elements.fileInput.addEventListener('change', handleFileChange);
    elements.runButton.addEventListener('click', handleRunAnalysis);
    elements.errorClose.addEventListener('click', hideError);

    // Initialize Chart.js defaults
    if (window.Chart) {
        Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        Chart.defaults.color = '#4a5568';
    }
});



/**
 * Handle file button click - trigger file input
 */
function handleFileButtonClick() {
    elements.fileInput.click();
}

/**
 * Handle file input change event
 * Validates file type and initiates upload
 */
function handleFileChange() {
    const file = elements.fileInput.files[0];
    
    if (!file) {
        return;
    }
    
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
        showError('Please select a CSV file. Other file types are not supported.');
        elements.fileInput.value = '';
        elements.fileName.textContent = 'No file selected';
        return;
    }
    
    // Display file name
    elements.fileName.textContent = file.name;
    
    // Upload file
    uploadDataset(file);
}

/**
 * Upload dataset to backend
 * Sends multipart form data to POST /upload
 */
async function uploadDataset(file) {
    hideError();
    setLoadingState('uploading', true);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData
        });
        
        const text = await response.text();
        console.log("Upload raw response:", text);
        const data = JSON.parse(text);
        
        if (!response.ok) {
            throw new Error(data.error || 'Upload failed');
        }
        
        // Store file reference
        appState.uploadedFile = data.file;
        
        // Update UI
        setLoadingState('uploading', false);
        showUploadSuccess(data.file);
        
        // Enable target input and analysis button
        elements.targetInput.disabled = false;
        updateRunButtonState();
        
    } catch (error) {
        setLoadingState('uploading', false);
        showError(`Upload failed: ${error.message}`);
        resetUploadUI();
    }
}

/**
 * Show upload success message
 */
function showUploadSuccess(filename) {
    elements.uploadStatus.className = 'upload-status success';
    elements.uploadStatus.textContent = `✓ File uploaded successfully: ${filename}`;
}

/**
 * Reset upload UI
 */
function resetUploadUI() {
    elements.fileInput.value = '';
    elements.fileName.textContent = 'No file selected';
    elements.uploadStatus.className = 'upload-status hidden';
    elements.targetInput.disabled = true;
    appState.uploadedFile = null;
    updateRunButtonState();
}


/**
 * Handle Run Analysis button click
 * Validates inputs and sends analysis request
 */
function handleRunAnalysis() {
    // Validate inputs
    if (!appState.uploadedFile) {
        showError('Please upload a dataset first.');
        return;
    }
    
    const target = elements.targetInput.value.trim();
    if (!target) {
        showError('Please enter the target column name.');
        return;
    }
    
    // Store target column
    appState.targetColumn = target;
    
    // Run analysis
    runAnalysis();
}

/**
 * Run analysis by sending request to backend
 * Sends POST request to /analyze with file and target
 */
async function runAnalysis() {
    hideError();
    // Show loading state
    setLoadingState('analyzing', true);
    
    const payload = {
        file: appState.uploadedFile,
        target: appState.targetColumn
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const text = await response.text();
        console.log("Analysis raw response:", text);
        const data = JSON.parse(text);
        
        if (!response.ok) {
            throw new Error(data.error || 'Analysis failed');
        }
        
        // Store results
        appState.analysisResults = data;
        
        // Update UI
        setLoadingState('analyzing', false);
        renderResults(data);
        
    } catch (error) {
        setLoadingState('analyzing', false);
        showError(`Analysis failed: ${error.message}`);
    }
}


/**
 * Render all analysis results into the UI
 */
function renderResults(results) {
    // Show results section
    elements.resultsSection.classList.remove('hidden');
    
    // Scroll to results
    setTimeout(() => {
        elements.resultsSection.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    
    // Render each section
    renderStatistics(results.dataset_statistics);
    renderQualityIssues(results.quality_issues);
    renderModelMetrics(results.model_metrics);
    renderVisualizations(results.visual_data); // Add visualization rendering
    renderBiasAnalysis(results.bias_findings);
    renderRecommendations(results.recommendations);
}

/**
 * Render dataset statistics cards
 */
function renderStatistics(stats) {
    if (!stats) return;
    
    // Calculate completeness percentage
    let completenessPercent = 100;
    if (stats.total_rows > 0) {
        const qualityIssues = appState.analysisResults.quality_issues;
        const missingCells = qualityIssues.missing_values.total_missing_cells || 0;
        const totalCells = stats.total_rows * stats.total_columns;
        completenessPercent = Math.round(((totalCells - missingCells) / totalCells) * 100);
    }
    
    elements.statRecords.textContent = stats.total_rows.toLocaleString();
    elements.statFeatures.textContent = stats.feature_count;
    elements.statCompleteness.textContent = `${completenessPercent}%`;
}

/**
 * Render detected quality issues
 */
function renderQualityIssues(issues) {
    if (!issues) {
        elements.qualityIssues.innerHTML = '<p class="placeholder">No quality issues detected</p>';
        return;
    }
    
    const issuesList = [];
    
    // Missing values
    if (issues.missing_values && issues.missing_values.has_missing) {
        issuesList.push(`<li><strong>Missing Values:</strong> ${issues.missing_values.total_missing_cells} cells missing across ${issues.missing_values.columns_with_missing.length} columns</li>`);
    }
    
    // Duplicates
    if (issues.duplicates && issues.duplicates.has_duplicates) {
        issuesList.push(`<li><strong>Duplicate Rows:</strong> ${issues.duplicates.duplicate_count} duplicate rows (${issues.duplicates.duplicate_percentage}% of dataset)</li>`);
    }
    
    // Class imbalance
    if (issues.class_distribution && issues.class_distribution.is_imbalanced) {
        issuesList.push(`<li><strong>Class Imbalance:</strong> Minority class represents ${(issues.class_distribution.minority_class_ratio * 100).toFixed(1)}% of data</li>`);
    }
    
    // Outliers
    if (issues.outliers && issues.outliers.has_outliers) {
        issuesList.push(`<li><strong>Outliers Detected:</strong> Found in ${issues.outliers.columns_with_outliers.length} numerical columns</li>`);
    }
    
    // Data leakage
    if (issues.potential_leakage && issues.potential_leakage.potential_leakage_detected) {
        issuesList.push(`<li><strong>Potential Data Leakage:</strong> ${issues.potential_leakage.suspicious_features.length} features show high correlation with target</li>`);
    }
    
    if (issuesList.length === 0) {
        elements.qualityIssues.innerHTML = '<p class="placeholder">No major quality issues detected</p>';
    } else {
        elements.qualityIssues.innerHTML = `<ul>${issuesList.join('')}</ul>`;
    }
}

/**
 * Render baseline model evaluation metrics
 */
function renderModelMetrics(metrics) {
    if (!metrics) {
        elements.modelMetrics.innerHTML = '<p class="placeholder">Model evaluation metrics not available</p>';
        return;
    }
    
    const metricsHTML = `
        <div class="metric-item">
            <div class="metric-label">Problem Type</div>
            <div class="metric-value">${metrics.problem_type || '—'}</div>
        </div>
        <div class="metric-item">
            <div class="metric-label">Model Type</div>
            <div class="metric-value">${metrics.model_type || '—'}</div>
        </div>
        <div class="metric-item">
            <div class="metric-label">Train ${metrics.metric || 'Score'}</div>
            <div class="metric-value">${(metrics.train_score || 0).toFixed(4)}</div>
        </div>
        <div class="metric-item">
            <div class="metric-label">Test ${metrics.metric || 'Score'}</div>
            <div class="metric-value">${(metrics.test_score || 0).toFixed(4)}</div>
        </div>
        <div class="metric-item">
            <div class="metric-label">Train-Test Gap</div>
            <div class="metric-value">${(metrics.train_test_gap || 0).toFixed(4)}</div>
        </div>
    `;
    
    elements.modelMetrics.innerHTML = metricsHTML;
}

/**
 * Render Chart.js visualizations
 */
function renderVisualizations(visualData) {
    if (!window.Chart) {
        console.error('Chart.js not loaded');
        return;
    }

    if (!visualData) return;

    // Destroy existing charts to prevent memory leaks and overlapping
    destroyCharts();

    // 1. Missing Values Chart
    renderMissingValuesChart(visualData.missing_values);

    // 2. Target Distribution Chart
    renderTargetDistributionChart(visualData.target_distribution);

    // 3. Prediction vs Actual Chart
    renderPredictionVsActualChart(visualData.prediction_vs_actual);
}

/**
 * Destroy all active Chart.js instances
 */
function destroyCharts() {
    Object.keys(appState.charts).forEach(key => {
        if (appState.charts[key]) {
            appState.charts[key].destroy();
            appState.charts[key] = null;
        }
    });
}

/**
 * Render Missing Values Bar Chart
 */
function renderMissingValuesChart(data) {
    const ctx = document.getElementById('missing-values-chart').getContext('2d');
    
    if (!data || !data.columns || data.columns.length === 0) {
        // Render a placeholder or empty state text on canvas if possible, or just skip
        // For now, let's just clear the canvas or leave it blank
        return;
    }

    appState.charts.missingValues = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.columns,
            datasets: [{
                label: 'Missing Values Count',
                data: data.counts,
                backgroundColor: 'rgba(239, 68, 68, 0.6)',
                borderColor: 'rgba(239, 68, 68, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Count' }
                }
            }
        }
    });
}

/**
 * Render Target Distribution Chart (Pie or Histogram)
 */
function renderTargetDistributionChart(data) {
    const ctx = document.getElementById('target-dist-chart').getContext('2d');

    if (!data) return;

    if (data.type === 'categorical') {
        // Pie Chart for Categorical
        appState.charts.targetDist = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.counts,
                    backgroundColor: [
                        'rgba(102, 126, 234, 0.7)',
                        'rgba(118, 75, 162, 0.7)',
                        'rgba(56, 178, 172, 0.7)',
                        'rgba(237, 137, 54, 0.7)',
                        'rgba(245, 101, 101, 0.7)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    } else {
        // Bar Chart (Histogram) for Numerical
        // Note: 'bins' usually has N+1 edges for N counts. Chart.js bar chart needs N labels.
        // We'll format the bins as range labels.
        const labels = data.bins.slice(0, -1).map((val, i) => {
            const nextVal = data.bins[i+1];
            return `${parseFloat(val).toFixed(1)} - ${parseFloat(nextVal).toFixed(1)}`;
        });

        appState.charts.targetDist = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Frequency',
                    data: data.counts,
                    backgroundColor: 'rgba(102, 126, 234, 0.6)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 1,
                    barPercentage: 1.0,
                    categoryPercentage: 1.0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                            font: { size: 10 }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Count' }
                    }
                }
            }
        });
    }
}

/**
 * Render Prediction vs Actual Scatter Plot
 */
function renderPredictionVsActualChart(data) {
    const ctx = document.getElementById('pred-actual-chart').getContext('2d');

    if (!data || !data.actual || !data.predicted) return;

    // Create scatter points {x: actual, y: predicted}
    const scatterData = data.actual.map((actual, i) => ({
        x: actual,
        y: data.predicted[i]
    }));

    // Find min/max for ideal line
    const allValues = [...data.actual, ...data.predicted];
    const minVal = Math.min(...allValues);
    const maxVal = Math.max(...allValues);

    appState.charts.predActual = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: 'Predicted vs Actual',
                    data: scatterData,
                    backgroundColor: 'rgba(102, 126, 234, 0.5)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 1,
                    pointRadius: 3
                },
                {
                    label: 'Perfect Prediction (Ideal)',
                    data: [{x: minVal, y: minVal}, {x: maxVal, y: maxVal}],
                    type: 'line',
                    borderColor: 'rgba(160, 174, 192, 0.8)',
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: { display: true, text: 'Actual Values' }
                },
                y: {
                    title: { display: true, text: 'Predicted Values' }
                }
            }
        }
    });
}


/**
 * Render bias analysis (if available)
 */
function renderBiasAnalysis(bias) {
    if (!bias || !bias.bias_analysis_performed || !bias.bias_metrics || bias.bias_metrics.length === 0) {
        elements.biasSection.classList.add('hidden');
        return;
    }
    
    // Show bias section
    elements.biasSection.classList.remove('hidden');
    
    // Build table
    let tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>Sensitive Attribute</th>
                    <th>Group</th>
                    <th>Group Size</th>
                    <th>Accuracy</th>
                    <th>Disparity</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    for (const biasMetric of bias.bias_metrics) {
        const disparity = biasMetric.performance_disparity ? 'Yes' : 'No';
        
        for (const group of biasMetric.groups) {
            tableHTML += `
                <tr>
                    <td>${biasMetric.attribute}</td>
                    <td>${group.group}</td>
                    <td>${group.size}</td>
                    <td>${(group.accuracy).toFixed(4)}</td>
                    <td>${disparity}</td>
                </tr>
            `;
        }
    }
    
    tableHTML += `
            </tbody>
        </table>
    `;
    
    elements.biasTable.innerHTML = tableHTML;
}

/**
 * Render recommendations
 */
function renderRecommendations(recs) {
    if (!recs || recs.length === 0) {
        elements.recommendations.innerHTML = '<p class="placeholder">No specific recommendations at this time</p>';
        return;
    }
    
    const recsHTML = recs
        .map(rec => `<div class="recommendation-item">${escapeHtml(rec)}</div>`)
        .join('');
    
    elements.recommendations.innerHTML = recsHTML;
}


/**
 * Set loading state for different operations
 */
function setLoadingState(operation, isLoading) {
    if (operation === 'uploading') {
        appState.isUploading = isLoading;
        
        if (isLoading) {
            elements.uploadStatus.className = 'upload-status loading';
            elements.uploadStatus.textContent = 'Uploading...';
        }
        
        elements.fileButton.disabled = isLoading;
        elements.runButton.disabled = isLoading || !appState.uploadedFile;
    }
    
    if (operation === 'analyzing') {
        appState.isAnalyzing = isLoading;
        
        if (isLoading) {
            elements.runButton.textContent = 'Analyzing...';
        } else {
            elements.runButton.textContent = 'Run Analysis';
        }
        
        elements.runButton.disabled = isLoading;
        elements.fileButton.disabled = isLoading;
        elements.targetInput.disabled = isLoading;
    }
}

/**
 * Update run button enabled/disabled state
 */
function updateRunButtonState() {
    const isEnabled = appState.uploadedFile && elements.targetInput.value.trim().length > 0;
    elements.runButton.disabled = !isEnabled || appState.isAnalyzing;
}

// Enable/disable analysis button as user types target column
elements.targetInput.addEventListener('input', updateRunButtonState);


// ERROR HANDLING
// ============================================

/**
 * Show error message in UI
 */
function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorContainer.classList.remove('hidden');
    
    // Scroll to error
    elements.errorContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Hide error message
 */
function hideError() {
    elements.errorContainer.classList.add('hidden');
}


/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format number with thousands separator
 */
function formatNumber(num) {
    return num.toLocaleString();
}



/**
 * Handle any unhandled promise rejections
 */
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showError('An unexpected error occurred. Please try again.');
});

/**
 * Log any JavaScript errors for debugging
 */
window.addEventListener('error', (event) => {
    console.error('JavaScript error:', event.error);
});