const API_BASE_URL = 'http://127.0.0.1:8000';
let appState = {
    uploadedFile: null,           // Filename reference from backend
    targetColumn: null,           // Target column name
    analysisResults: null,        // Complete results from backend
    isUploading: false,           // Upload in progress
    isAnalyzing: false,            // Analysis in progress
    charts: {},                   // Chart.js instances
    activeTab: 1,                 // Currently active tab
    analysisComplete: false,      // Has analysis finished successfully
    tabsUnlocked: false,          // Are result tabs accessible
    chartsRendered: false         // Has Tab 3 rendered charts yet
};



const elements = {
    // Tabs
    tabButtons: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),
    summaryStrip: document.getElementById('summary-strip'),
    biasBannerContainer: document.getElementById('bias-banner-container'),

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
    recommendations: document.getElementById('recommendations'),

    // Suggestion chips
    suggestionContainer: document.getElementById('suggestion-container'),
    suggestionLoading: document.getElementById('suggestion-loading'),
    suggestionChips: document.getElementById('suggestion-chips')
};



document.addEventListener('DOMContentLoaded', () => {
    // Setup event listeners
    elements.fileButton.addEventListener('click', handleFileButtonClick);
    elements.fileInput.addEventListener('change', handleFileChange);
    elements.runButton.addEventListener('click', handleRunAnalysis);
    elements.errorClose.addEventListener('click', hideError);

    // Tab Listeners
    elements.tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(parseInt(btn.getAttribute('data-tab')));
        });
    });

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
    lockTabs();
    clearSummaryStrip();
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

        // Auto-fetch target column suggestions
        fetchTargetSuggestions(data.file);
        
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
    appState.analysisResults = null;
    appState.analysisComplete = false;
    updateRunButtonState();
    hideSuggestions();
    lockTabs();
    clearSummaryStrip();
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
        
        // Check for internal analysis errors
        if (data.validation_status === 'failed' || data.validation_status === 'error') {
            const msg = data.warnings && data.warnings.length > 0 ? data.warnings[0] : 'Analysis failed internally';
            throw new Error(msg);
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
    appState.analysisComplete = true;
    appState.analysisResults = results;
    appState.chartsRendered = false;
    
    // Render each section
    renderStatistics(results.dataset_statistics);
    renderQualityIssues(results.quality_issues);
    renderModelMetrics(results.model_metrics);
    // Visualizations mapped in Tab 3 switch, not here
    renderBiasAnalysis(results.bias_findings);
    renderRecommendations(results.recommendations);

    unlockTabs();
    updateTabBadges(results);
    showSummaryStrip(results);
    switchTab(2);
}

/**
 * Render dataset statistics cards
 */
function renderStatistics(stats) {
    if (!stats || stats.total_rows === undefined) {
        if (elements.statRecords) elements.statRecords.textContent = '—';
        if (elements.statFeatures) elements.statFeatures.textContent = '—';
        if (elements.statCompleteness) elements.statCompleteness.textContent = '—';
        return;
    }
    
    // Calculate completeness percentage
    let completenessPercent = 100;
    try {
        if (stats.total_rows > 0) {
            const qualityIssues = appState.analysisResults.quality_issues;
            if (qualityIssues && qualityIssues.missing_values) {
                const missingCells = qualityIssues.missing_values.total_missing_cells || 0;
                const totalCells = stats.total_rows * stats.total_columns;
                completenessPercent = Math.round(((totalCells - missingCells) / totalCells) * 100);
            }
        }
    } catch (e) { console.warn("Error calculating completeness", e); }
    
    if (elements.statRecords) elements.statRecords.textContent = stats.total_rows.toLocaleString();
    if (elements.statFeatures) elements.statFeatures.textContent = stats.feature_count;
    if (elements.statCompleteness) elements.statCompleteness.textContent = `${completenessPercent}%`;
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
function renderVisualizations(visualData, totalRows = 0) {
    if (!window.Chart) {
        console.error('Chart.js not loaded');
        return;
    }

    if (!visualData) return;

    // Determine animation based on dataset size
    const animate = totalRows <= 50000;
    
    // Reset layout
    const mainGrid = document.getElementById('main-charts-grid');
    if (mainGrid) {
        mainGrid.classList.remove('charts-grid-2col');
    }
    const predContainer = document.getElementById('pred-actual-container');
    if (predContainer) {
        predContainer.classList.remove('chart-full-width');
    }

    // Destroy existing charts to prevent memory leaks and overlapping
    destroyCharts();

    // 1. Missing Values Chart
    renderMissingValuesChart(visualData.missing_values, animate, mainGrid);

    // 2. Target Distribution Chart
    renderTargetDistributionChart(visualData.target_distribution, animate);

    // 3. Prediction vs Actual Chart / Confusion Matrix
    renderPredictionVsActualChart(visualData.prediction_vs_actual, animate, predContainer);
    
    // 4. Feature Distributions
    renderFeatureDistributionsChart(visualData.feature_distributions, animate);
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
function renderMissingValuesChart(data, animate, gridContainer) {
    const wrapper = document.getElementById('missing-values-wrapper');
    const container = document.getElementById('missing-values-container');
    
    if (!data || !data.columns || data.columns.length === 0) {
        container.style.display = 'none';
        if (gridContainer) gridContainer.classList.add('charts-grid-2col');
        
        let successDiv = document.getElementById('missing-values-success');
        if (!successDiv) {
            successDiv = document.createElement('div');
            successDiv.id = 'missing-values-success';
            successDiv.className = 'success-message';
            successDiv.style.marginBottom = '1.5rem';
            successDiv.innerHTML = '✓ No missing values detected — dataset is complete';
            gridContainer.parentNode.insertBefore(successDiv, gridContainer);
        }
        successDiv.style.display = 'flex';
        return;
    }
    
    // Restore if there are misses
    container.style.display = 'block';
    let successDiv = document.getElementById('missing-values-success');
    if (successDiv) successDiv.style.display = 'none';

    wrapper.style.height = '250px';
    wrapper.innerHTML = '<canvas id="missing-values-chart"></canvas>';
    const ctx = document.getElementById('missing-values-chart').getContext('2d');

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
            animation: animate,
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
function renderTargetDistributionChart(data, animate) {
    const wrapper = document.getElementById('target-dist-wrapper');
    if (!data) return;

    wrapper.innerHTML = '<canvas id="target-dist-chart"></canvas>';
    const ctx = document.getElementById('target-dist-chart').getContext('2d');

    if (data.type === 'categorical') {
        if (data.labels.length > 10) {
            // Horizontal bar chart for many classes
            let labels = [...data.labels];
            let counts = [...data.counts];
            
            // Sort by count descending
            const combined = labels.map((l, i) => ({l, c: counts[i]}));
            combined.sort((a, b) => b.c - a.c);
            
            let note = null;
            if (combined.length > 20) {
                note = `Showing top 20 of ${combined.length} classes`;
                combined.splice(20);
            }
            
            labels = combined.map(x => x.l);
            counts = combined.map(x => x.c);
            
            // Dynamic height (classes * 28px, min 300px max 600px)
            const height = Math.min(Math.max(labels.length * 28, 300), 600);
            wrapper.style.height = `${height}px`;

            if (note) {
                const sub = document.getElementById('target-dist-container').querySelector('.chart-subtitle');
                if (sub && !sub.textContent.includes(note)) sub.textContent += ` (${note})`;
            }

            appState.charts.targetDist = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Count',
                        data: counts,
                        backgroundColor: 'rgba(118, 75, 162, 0.6)',
                        borderColor: 'rgba(118, 75, 162, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    animation: animate,
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { beginAtZero: true }
                    }
                }
            });
        } else {
            // Pie Chart for few classes
            wrapper.style.height = '300px';
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
                            'rgba(245, 101, 101, 0.7)',
                            'rgba(72, 187, 120, 0.7)',
                            'rgba(236, 201, 75, 0.7)',
                            'rgba(159, 122, 234, 0.7)',
                            'rgba(246, 135, 179, 0.7)',
                            'rgba(160, 174, 192, 0.7)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    animation: animate,
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
    } else {
        // Histogram for Numerical
        wrapper.style.height = '300px';
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
                animation: animate,
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
 * Render Prediction vs Actual or Confusion Matrix Chart
 */
function renderPredictionVsActualChart(data, animate, containerBlock) {
    const wrapper = document.getElementById('pred-actual-wrapper');
    const title = document.getElementById('pred-actual-title');
    const subtitle = document.getElementById('pred-actual-subtitle');
    
    if (!data || !data.type) return;

    wrapper.innerHTML = '<canvas id="pred-actual-chart"></canvas>';
    const ctx = document.getElementById('pred-actual-chart').getContext('2d');

    if (data.type === 'confusion_matrix') {
        title.textContent = 'Confusion Matrix';
        subtitle.textContent = 'Rows = Actual class, Columns = Predicted class. Diagonal = correct predictions' + (data.note ? ` (${data.note})` : '');
        
        const numClasses = data.labels.length;
        if (numClasses > 8 && containerBlock) {
            containerBlock.classList.add('chart-full-width');
        }
        
        const height = Math.min(Math.max(numClasses * 40, 400), 700);
        wrapper.style.height = `${height}px`;

        const maxVal = Math.max(...data.matrix.flat());
        const bubbleData = [];
        
        for (let i = 0; i < numClasses; i++) { // Actual (Y axis)
            for (let j = 0; j < numClasses; j++) { // Predicted (X axis)
                const count = data.matrix[i][j];
                const intensity = maxVal > 0 ? (count / maxVal) : 0;
                // Deep purple #764ba2 to white interpolation
                const r = Math.round(255 - intensity * (255 - 118));
                const g = Math.round(255 - intensity * (255 - 75));
                const b = Math.round(255 - intensity * (255 - 162));
                
                // Highlight diagonal
                let borderColor = '#e2e8f0';
                let borderWidth = 1;
                if (i === j) {
                    borderColor = '#667eea';
                    borderWidth = 2;
                }

                bubbleData.push({
                    x: j, 
                    y: numClasses - 1 - i, // invert y so actual 0 is at top
                    v: count, // store true count
                    r: 20, // bubble size
                    bgColor: `rgba(${r}, ${g}, ${b}, ${intensity > 0 ? 0.9 : 0.1})`,
                    bColor: borderColor,
                    bWidth: borderWidth
                });
            }
        }

        appState.charts.predActual = new Chart(ctx, {
            type: 'bubble',
            data: {
                datasets: [{
                    label: 'Confusion Matrix',
                    data: bubbleData,
                    backgroundColor: (ctx) => ctx.raw?.bgColor || 'white',
                    borderColor: (ctx) => ctx.raw?.bColor || '#eee',
                    borderWidth: (ctx) => ctx.raw?.bWidth || 1,
                    pointStyle: 'rectRounded',
                    radius: function(context) {
                        const chart = context.chart;
                        const w = chart.chartArea ? chart.chartArea.width / numClasses : 0;
                        const h = chart.chartArea ? chart.chartArea.height / numClasses : 0;
                        return Math.min(w, h) / 2 - 2; // fill cell
                    }
                }]
            },
            options: {
                animation: animate,
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const raw = context.raw;
                                const actual = data.labels[numClasses - 1 - raw.y];
                                const predicted = data.labels[raw.x];
                                return `Actual: ${actual}, Predicted: ${predicted} - Count: ${raw.v}`;
                            }
                        }
                    },
                    legend: { display: false }
                },
                scales: {
                    x: {
                        min: -0.5, max: numClasses - 0.5,
                        ticks: {
                            stepSize: 1,
                            callback: (value) => data.labels[value] || ''
                        },
                        title: { display: true, text: 'Predicted Class' }
                    },
                    y: {
                        min: -0.5, max: numClasses - 0.5,
                        ticks: {
                            stepSize: 1,
                            callback: (value) => data.labels[numClasses - 1 - value] || ''
                        },
                        title: { display: true, text: 'Actual Class' }
                    }
                }
            },
            plugins: [{
                id: 'cmTextPlugin',
                afterDatasetsDraw(chart) {
                    const ctx = chart.ctx;
                    chart.data.datasets.forEach((dataset, i) => {
                        const meta = chart.getDatasetMeta(i);
                        meta.data.forEach((element, index) => {
                            const val = dataset.data[index].v;
                            if (val > 0) {
                                ctx.fillStyle = dataset.data[index].bgColor.indexOf(', 0.1)') > -1 ? '#4a5568' : '#fff';
                                const fontSize = 12;
                                ctx.font = `600 ${fontSize}px sans-serif`;
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'middle';
                                ctx.fillText(val, element.x, element.y);
                            }
                        });
                    });
                }
            }]
        });

    } else if (data.type === 'scatter') {
        title.textContent = 'Prediction vs Actual';
        subtitle.textContent = 'Each dot is one test sample. Dots on the line = perfect prediction';
        
        wrapper.style.height = '350px';
        const scatterData = data.actual.map((actual, i) => ({
            x: actual,
            y: data.predicted[i]
        }));

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
                        label: 'Perfect Prediction',
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
                animation: animate,
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { title: { display: true, text: 'Actual Values' } },
                    y: { title: { display: true, text: 'Predicted Values' } }
                }
            }
        });
    }
}

/**
 * Render Feature Distributions Charts
 */
function renderFeatureDistributionsChart(featureData, animate) {
    const section = document.getElementById('feature-distributions-section');
    const grid = document.getElementById('feature-charts-grid');
    
    if (!featureData || Object.keys(featureData).length === 0) {
        section.classList.add('hidden');
        return;
    }
    
    section.classList.remove('hidden');
    grid.innerHTML = '';
    
    let index = 0;
    Object.keys(featureData).forEach((feature) => {
        const data = featureData[feature];
        
        // Create container elements
        const container = document.createElement('div');
        container.className = 'chart-container';
        
        const header = document.createElement('h4');
        header.textContent = feature;
        
        const subtitle = document.createElement('div');
        subtitle.className = 'chart-subtitle';
        subtitle.textContent = 'Distribution of values in this feature';
        
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.style.width = '100%';
        wrapper.style.height = '200px';
        
        const canvas = document.createElement('canvas');
        const id = `feature-chart-${index}`;
        canvas.id = id;
        
        wrapper.appendChild(canvas);
        container.appendChild(header);
        container.appendChild(subtitle);
        container.appendChild(wrapper);
        grid.appendChild(container);

        // Render chart
        const ctx = canvas.getContext('2d');
        const labels = data.bins.slice(0, -1).map((val, i) => {
            return `${parseFloat(val).toFixed(1)} - ${parseFloat(data.bins[i+1]).toFixed(1)}`;
        });
        
        appState.charts[`featureChart_${index}`] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Frequency',
                    data: data.counts,
                    backgroundColor: 'rgba(56, 178, 172, 0.6)', // Teal color
                    borderColor: 'rgba(56, 178, 172, 1)',
                    borderWidth: 1,
                    barPercentage: 1.0,
                    categoryPercentage: 1.0
                }]
            },
            options: {
                animation: animate,
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { display: false } }, // Hide x labels for cleanliness on small charts
                    y: { beginAtZero: true }
                }
            }
        });
        index++;
    });
}


/**
 * Render bias analysis (if available)
 */
function renderBiasAnalysis(bias) {
    if (!bias || !bias.bias_analysis_performed || !bias.bias_metrics || bias.bias_metrics.length === 0) {
        elements.biasSection.classList.add('hidden');
        if (elements.biasBannerContainer) {
            elements.biasBannerContainer.innerHTML = `<div class="bias-banner bias-banner-info">No sensitive attributes (gender, age, race, etc.) were detected in this dataset. Bias analysis was skipped.</div>`;
        }
        return;
    }
    
    elements.biasSection.classList.remove('hidden');

    let disparityFound = false;
    if (bias.bias_metrics) {
        disparityFound = bias.bias_metrics.some(m => m.performance_disparity);
    }
    
    if (elements.biasBannerContainer) {
        if (disparityFound) {
            elements.biasBannerContainer.innerHTML = `<div class="bias-banner bias-banner-warning">⚠ Performance disparity detected. Review highlighted groups below.</div>`;
        } else {
            elements.biasBannerContainer.innerHTML = `<div class="bias-banner bias-banner-success">✓ No performance disparity detected across groups.</div>`;
        }
    }
    
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
        const isDisparity = biasMetric.performance_disparity;
        const rowClassStr = isDisparity ? ' class="bias-row-disparity"' : '';
        const disparityStr = isDisparity ? 'Yes' : 'No';
        
        for (const group of biasMetric.groups) {
            tableHTML += `
                <tr${rowClassStr}>
                    <td>${biasMetric.attribute}</td>
                    <td>${group.group}</td>
                    <td>${group.size}</td>
                    <td>${(group.accuracy).toFixed(4)}</td>
                    <td>${disparityStr}</td>
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
    if (!elements.recommendations) return;
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


// ============================================
// TARGET COLUMN SUGGESTIONS
// ============================================

/**
 * Fetch target column suggestions from backend
 */
async function fetchTargetSuggestions(filename) {
    // Show container with loading state
    elements.suggestionContainer.classList.remove('hidden');
    elements.suggestionLoading.classList.remove('hidden');
    elements.suggestionChips.innerHTML = '';

    try {
        const response = await fetch(`${API_BASE_URL}/suggest_target`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file: filename })
        });

        const data = await response.json();

        if (!response.ok || !data.suggestions || data.suggestions.length === 0) {
            hideSuggestions();
            return;
        }

        elements.suggestionLoading.classList.add('hidden');
        renderSuggestionChips(data.suggestions);

    } catch (err) {
        // Silently hide — do not block manual entry
        hideSuggestions();
    }
}

/**
 * Render suggestion chips
 */
function renderSuggestionChips(suggestions) {
    elements.suggestionChips.innerHTML = '';

    suggestions.forEach(s => {
        const chip = document.createElement('button');
        chip.className = 'suggestion-chip';
        chip.type = 'button';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'suggestion-chip-name';
        nameSpan.textContent = s.column;

        const badge = document.createElement('span');
        badge.className = `suggestion-type-badge badge-${s.type}`;
        badge.textContent = s.type;

        chip.appendChild(nameSpan);
        chip.appendChild(badge);

        chip.addEventListener('click', () => {
            // Fill target input
            elements.targetInput.value = s.column;
            appState.targetColumn = s.column;
            updateRunButtonState();

            // Highlight selected chip, deselect others
            document.querySelectorAll('.suggestion-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
        });

        elements.suggestionChips.appendChild(chip);
    });
}

/**
 * Hide and clear suggestion area
 */
function hideSuggestions() {
    elements.suggestionContainer.classList.add('hidden');
    elements.suggestionLoading.classList.add('hidden');
    elements.suggestionChips.innerHTML = '';
}

// Enable/disable analysis button as user types target column
elements.targetInput.addEventListener('input', () => {
    updateRunButtonState();

    // Deselect chips when the user types manually
    document.querySelectorAll('.suggestion-chip').forEach(c => c.classList.remove('active'));

    // If the input is cleared, deselect (chips stay visible)
    if (elements.targetInput.value.trim() === '') {
        document.querySelectorAll('.suggestion-chip').forEach(c => c.classList.remove('active'));
    }
});


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


// ============================================
// TAB LOGIC
// ============================================
function switchTab(tabNumber) {
    if (!appState.tabsUnlocked && tabNumber !== 1) return;
    appState.activeTab = tabNumber;

    elements.tabButtons.forEach(btn => {
        const t = parseInt(btn.getAttribute('data-tab'));
        if (t === tabNumber) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    elements.tabContents.forEach(content => {
        const t = parseInt(content.id.replace('tab-', ''));
        if (t === tabNumber) {
            content.style.display = 'block';
            content.classList.add('active');
        } else {
            content.style.display = 'none';
            content.classList.remove('active');
        }
    });

    if (tabNumber === 3 && !appState.chartsRendered && appState.analysisResults) {
        const visualData = appState.analysisResults.visual_data;
        const totalRows = appState.analysisResults.dataset_statistics ? appState.analysisResults.dataset_statistics.total_rows : 0;
        renderVisualizations(visualData, totalRows);
        appState.chartsRendered = true;
    }
}

function unlockTabs() {
    appState.tabsUnlocked = true;
    elements.tabButtons.forEach(btn => {
        const t = parseInt(btn.getAttribute('data-tab'));
        if (t !== 1) {
            btn.classList.remove('locked');
            btn.textContent = btn.textContent.replace('🔒 ', '');
        }
    });
}

function lockTabs() {
    appState.tabsUnlocked = false;
    appState.chartsRendered = false;
    destroyCharts();
    
    elements.tabButtons.forEach(btn => {
        const t = parseInt(btn.getAttribute('data-tab'));
        if (t !== 1) {
            btn.classList.add('locked');
            if (!btn.textContent.includes('🔒')) {
                btn.textContent = '🔒 ' + btn.textContent;
            }
            const badge = btn.querySelector('.tab-badge, .dot-indicator');
            if (badge) badge.remove();
        }
    });

    if (appState.activeTab !== 1) switchTab(1);
    
    // Clear content html to match UX rules
    elements.qualityIssues.innerHTML = '<p class="placeholder">No issues detected</p>';
    elements.recommendations.innerHTML = '<p class="placeholder">Recommendations will appear here</p>';
    elements.modelMetrics.innerHTML = '<p class="placeholder">Model evaluation metrics will appear here</p>';
    elements.biasTable.innerHTML = '<p class="placeholder">Bias analysis table will appear here</p>';
    if (elements.biasBannerContainer) elements.biasBannerContainer.innerHTML = '';
    
    document.getElementById('stat-records').textContent = '—';
    document.getElementById('stat-features').textContent = '—';
    document.getElementById('stat-completeness').textContent = '—';
}

function updateTabBadges(results) {
    if (!results) return;
    let issueCount = 0;
    const qi = results.quality_issues;
    if (qi) {
        if (qi.missing_values && qi.missing_values.has_missing) issueCount++;
        if (qi.duplicates && qi.duplicates.has_duplicates) issueCount++;
        if (qi.class_distribution && qi.class_distribution.is_imbalanced) issueCount++;
        if (qi.outliers && qi.outliers.has_outliers) issueCount++;
        if (qi.potential_leakage && qi.potential_leakage.potential_leakage_detected) issueCount++;
    }
    
    const tab2Btn = document.querySelector('.tab-btn[data-tab="2"]');
    if (tab2Btn) {
        const oldBadge2 = tab2Btn.querySelector('.tab-badge');
        if (oldBadge2) oldBadge2.remove();
        
        const badge2 = document.createElement('span');
        badge2.className = `tab-badge ${issueCount > 0 ? 'badge-error' : 'badge-success'}`;
        badge2.textContent = issueCount > 0 ? `${issueCount} issues` : '✓ clean';
        tab2Btn.appendChild(badge2);
    }
    
    const tab4Btn = document.querySelector('.tab-btn[data-tab="4"]');
    if (tab4Btn) {
        const oldDot = tab4Btn.querySelector('.dot-indicator');
        if (oldDot) oldDot.remove();
        
        const bias = results.bias_findings;
        if (bias && bias.bias_analysis_performed) {
            let disparityFound = false;
            if (bias.bias_metrics) {
                disparityFound = bias.bias_metrics.some(m => m.performance_disparity);
            }
            const dot = document.createElement('span');
            dot.className = `dot-indicator ${disparityFound ? 'dot-warning' : 'dot-success'}`;
            tab4Btn.appendChild(dot);
        }
    }
}

function showSummaryStrip(results) {
    if (!results || !elements.summaryStrip) return;
    const stats = results.dataset_statistics;
    const qi = results.quality_issues;
    if (!stats) return;
    
    let completenessPercent = 100;
    if (stats.total_rows > 0 && qi && qi.missing_values) {
        const missingCells = qi.missing_values.total_missing_cells || 0;
        const totalCells = stats.total_rows * stats.total_columns;
        completenessPercent = Math.round(((totalCells - missingCells) / totalCells) * 100);
    }
    
    let issueCount = 0;
    if (qi) {
        if (qi.missing_values && qi.missing_values.has_missing) issueCount++;
        if (qi.duplicates && qi.duplicates.has_duplicates) issueCount++;
        if (qi.class_distribution && qi.class_distribution.is_imbalanced) issueCount++;
        if (qi.outliers && qi.outliers.has_outliers) issueCount++;
        if (qi.potential_leakage && qi.potential_leakage.potential_leakage_detected) issueCount++;
    }
    
    elements.summaryStrip.innerHTML = `<span>✓ Analysis Complete — ${stats.total_rows.toLocaleString()} records · ${stats.feature_count} features · ${completenessPercent}% complete · ${issueCount} issues found</span><button onclick="switchTab(2)" style="background:transparent;border:1px solid currentColor;color:inherit;padding:0.4rem 1rem;border-radius:4px;cursor:pointer;font-weight:bold;">View Report →</button>`;
    elements.summaryStrip.classList.remove('hidden');
}

function clearSummaryStrip() {
    if (elements.summaryStrip) {
        elements.summaryStrip.innerHTML = '';
        elements.summaryStrip.classList.add('hidden');
    }
}