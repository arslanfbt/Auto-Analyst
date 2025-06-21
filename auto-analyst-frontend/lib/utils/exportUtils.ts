import { marked } from 'marked';

// Define interfaces for the output data structure
interface CodeOutput {
  type: 'output' | 'error' | 'plotly' | 'matplotlib';
  content: string | any;
  messageIndex: number;
  codeId: string;
}

/**
 * Exports content as a downloadable file
 * @param content The content to be downloaded
 * @param format The format of the file (md or html)
 * @param filename Optional custom filename
 * @param outputs Optional array of code outputs (errors, text outputs, plots)
 */
export function exportContent(
  content: string, 
  format: 'md' | 'html', 
  filename?: string,
  outputs?: CodeOutput[]
): void {
  let processedContent = content;
  let mimeType = 'text/plain';
  let extension = 'txt';

  // Add outputs to the content if provided
  if (outputs && outputs.length > 0) {
    const outputSections = formatOutputsForExport(outputs, format);
    if (outputSections) {
      processedContent += '\n\n' + outputSections;
    }
  }
  
  if (format === 'html') {
    // Convert markdown to HTML first
    const htmlContent = marked.parse(processedContent);
    
    // Create HTML version with enhanced styling
    processedContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Auto Analyst Export</title>
  <!-- Add highlight.js for Python syntax highlighting -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/languages/python.min.js"></script>
  <!-- Add Plotly.js for interactive charts -->
  <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', (event) => {
      document.querySelectorAll('pre code').forEach((el) => {
        hljs.highlightElement(el);
      });
      
      // Render Plotly charts
      document.querySelectorAll('.plotly-chart').forEach((el) => {
        try {
          const plotData = JSON.parse(el.dataset.plotly);
          Plotly.newPlot(el, plotData.data, plotData.layout, {
            responsive: true,
            displayModeBar: true,
            displaylogo: false
          });
        } catch (e) {
          console.error('Error rendering Plotly chart:', e);
          el.innerHTML = '<p class="text-red-500">Error rendering chart</p>';
        }
      });
    });
  </script>
  <style>
    :root {
      --primary-color: #FF7F7F;
      --primary-hover: #FF6666;
      --text-color: #1f2937;
      --text-muted: #6b7280;
      --bg-color: #ffffff;
      --code-bg: #f8fafc;
      --border-color: #e5e7eb;
      --output-bg: #f8fafc;
      --error-bg: #fef2f2;
      --error-border: #fecaca;
      --stats-bg: #f0f9ff;
      --regression-bg: #fffbeb;
      --df-info-bg: #f8fafc;
      --df-border: #3b82f6;
    }
    html, body { 
      background-color: var(--bg-color) !important;
      margin: 0;
      padding: 0;
    }
    body { 
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; 
      line-height: 1.6; 
      padding: 30px; 
      max-width: 1000px; 
      margin: 0 auto; 
      color: var(--text-color);
      background-color: var(--bg-color) !important;
    }
    h1, h2, h3, h4, h5, h6 { 
      color: var(--primary-color);
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
      break-inside: avoid;
    }
    h1 { font-size: 2em; }
    h2 { font-size: 1.5em; }
    h3 { font-size: 1.25em; }
    pre { 
      background-color: var(--code-bg);
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 16px 0;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 13px;
      border-left: 4px solid var(--primary-color);
      word-wrap: break-word;
      white-space: pre-wrap;
      border: 1px solid var(--border-color);
    }
    code { 
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 0.9em;
    }
    .hljs {
      background-color: var(--code-bg) !important;
      padding: 0;
    }
    table { 
      border-collapse: collapse; 
      width: 100%;
      margin: 16px 0; 
      break-inside: avoid;
    }
    th, td { 
      border: 1px solid var(--border-color);
      padding: 8px 12px;
      text-align: left;
    }
    th { 
      background-color: var(--primary-color);
      color: white;
      font-weight: 600;
    }
    tr:nth-child(even) {
      background-color: #f9fafb;
    }
    blockquote {
      border-left: 4px solid var(--primary-color);
      margin: 16px 0;
      padding: 0 16px;
      color: var(--text-muted);
    }
    a {
      color: var(--primary-color);
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
      color: var(--primary-hover);
    }
    ul, ol {
      padding-left: 24px;
    }
    li::marker {
      color: var(--primary-color);
    }
    .content {
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
      margin-bottom: 30px;
      border-top: 5px solid var(--primary-color);
      background-color: var(--bg-color);
      break-inside: avoid;
    }
    .output-section {
      margin: 24px 0;
      padding: 20px;
      border-radius: 8px;
      background-color: var(--output-bg);
      border: 1px solid var(--border-color);
      border-left: 4px solid var(--primary-color);
      break-inside: avoid;
    }
    .error-section {
      margin: 24px 0;
      padding: 20px;
      border-radius: 8px;
      background-color: var(--error-bg);
      border: 1px solid var(--error-border);
      border-left: 4px solid #dc2626;
      break-inside: avoid;
    }
    .plotly-chart {
      margin: 24px 0;
      padding: 20px;
      border-radius: 8px;
      background-color: var(--bg-color);
      border: 1px solid var(--border-color);
      border-left: 4px solid var(--primary-color);
      min-height: 400px;
      break-inside: avoid;
    }
    .section-title {
      font-weight: 600;
      margin-bottom: 16px;
      color: var(--primary-color);
      font-size: 1.1em;
      border-bottom: 2px solid var(--primary-color);
      padding-bottom: 8px;
    }
    
    /* DataFrame Info Styles - Match the app screenshot */
    .dataframe-info {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 13px;
      background-color: var(--df-info-bg);
      padding: 16px;
      border-radius: 8px;
      border-left: 4px solid var(--df-border);
      border: 1px solid var(--border-color);
      line-height: 1.4;
    }
    .df-header {
      font-weight: 600;
      color: #1e40af;
      margin-bottom: 8px;
      font-size: 14px;
    }
    .df-summary {
      color: var(--text-color);
      margin: 8px 0;
      font-weight: 500;
    }
    .df-table-header {
      color: var(--text-muted);
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 4px;
      margin: 12px 0 8px 0;
      font-weight: 500;
    }
    .df-row {
      color: var(--text-color);
      padding: 1px 0;
      font-family: monospace;
    }
    .df-info {
      color: var(--text-muted);
      font-style: italic;
    }
    .df-types {
      color: #059669;
      margin-top: 8px;
    }
    .df-memory {
      color: #7c3aed;
      margin-top: 4px;
    }
    
    /* Statistical Output Styles */
    .statistical-output {
      background-color: var(--stats-bg);
      border-radius: 8px;
      border-left: 4px solid #0ea5e9;
      border: 1px solid var(--border-color);
    }
    .stats-table {
      font-size: 12px;
      margin: 0;
      padding: 16px;
      background-color: transparent;
      border: none;
      overflow-x: auto;
      white-space: pre;
      color: var(--text-color);
    }
    
    /* Regression Output Styles */
    .regression-output {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 12px;
      background-color: var(--regression-bg);
      padding: 16px;
      border-radius: 8px;
      border-left: 4px solid #f59e0b;
      border: 1px solid var(--border-color);
    }
    .regression-title {
      font-weight: bold;
      text-align: center;
      margin-bottom: 16px;
      color: #92400e;
    }
    .regression-separator {
      color: #d97706;
      margin: 8px 0;
    }
    .regression-stat {
      color: #92400e;
      font-weight: 500;
    }
    .regression-coef {
      color: #451a03;
      font-family: monospace;
    }
    .regression-line {
      color: var(--text-muted);
    }
    
    /* Correlation Output Styles */
    .correlation-output {
      background-color: #f0fdf4;
      border-radius: 8px;
      border-left: 4px solid #22c55e;
      border: 1px solid var(--border-color);
    }
    .correlation-table {
      font-size: 12px;
      margin: 0;
      padding: 16px;
      background-color: transparent;
      border: none;
      overflow-x: auto;
      white-space: pre;
      color: var(--text-color);
    }
    
    /* Table Output Styles */
    .table-output {
      background-color: #fafafa;
      border-radius: 8px;
      border-left: 4px solid #6b7280;
      border: 1px solid var(--border-color);
    }
    .simple-table {
      font-size: 12px;
      margin: 0;
      padding: 16px;
      background-color: transparent;
      border: none;
      overflow-x: auto;
      white-space: pre;
      color: var(--text-color);
    }
    
    /* Error Output Styles */
    .error-output {
      font-size: 12px;
      margin: 0;
      padding: 12px;
      background-color: transparent;
      border: none;
      color: #dc2626;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    }
    
    /* Generic Output Styles */
    .generic-output {
      font-size: 12px;
      margin: 0;
      padding: 12px;
      background-color: var(--code-bg);
      border: none;
      border-radius: 6px;
      color: var(--text-color);
    }
    
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid var(--primary-color);
      color: var(--primary-color);
      font-size: 14px;
      break-inside: avoid;
    }
    
    /* Print and PDF Styles */
    @media print {
      body {
        max-width: none;
        padding: 20px;
        font-size: 11px;
      }
      .content {
        box-shadow: none;
        border: 1px solid var(--border-color);
        page-break-inside: avoid;
      }
      .output-section, .error-section, .plotly-chart {
        page-break-inside: avoid;
        box-shadow: none;
      }
      .section-title {
        page-break-after: avoid;
      }
      pre {
        font-size: 10px;
        white-space: pre-wrap;
        word-break: break-all;
      }
    }
    
    /* Responsive Design */
    @media (max-width: 768px) {
      body {
        padding: 15px;
        font-size: 14px;
      }
      .content {
        padding: 16px;
      }
      .output-section, .error-section, .plotly-chart {
        padding: 16px;
      }
      pre {
        font-size: 11px;
        padding: 12px;
      }
      .dataframe-info, .regression-output {
        font-size: 11px;
        padding: 12px;
      }
    }
    
    /* Override dark mode entirely to ensure consistency */
    @media (prefers-color-scheme: dark) {
      :root {
        --primary-color: #FF7F7F;
        --primary-hover: #FF6666;
        --text-color: #1f2937;
        --text-muted: #6b7280;
        --bg-color: #ffffff;
        --code-bg: #f8fafc;
        --border-color: #e5e7eb;
        --output-bg: #f8fafc;
        --error-bg: #fef2f2;
        --error-border: #fecaca;
        --stats-bg: #f0f9ff;
        --regression-bg: #fffbeb;
        --df-info-bg: #f8fafc;
        --df-border: #3b82f6;
      }
      body {
        background-color: var(--bg-color) !important;
        color: var(--text-color) !important;
      }
      h1, h2, h3, h4, h5, h6 {
        color: var(--primary-color);
      }
      a {
        color: var(--primary-color);
      }
      a:hover {
        color: var(--primary-hover);
      }
      tr:nth-child(even) {
        background-color: #f9fafb;
      }
      pre, code {
        background-color: var(--code-bg);
      }
    }
  </style>
</head>
<body>
  <div class="content">
    ${htmlContent}
  </div>
  <div class="footer">
    Generated by <a href="https://autoanalyst.ai" style="text-decoration: underline;">Auto-Analyst</a> | ${new Date().toLocaleDateString()}
  </div>
</body>
</html>`;
    mimeType = 'text/html';
    extension = 'html';
  } else if (format === 'md') {
    // Keep as is for markdown
    mimeType = 'text/markdown';
    extension = 'md';
  }
  
  // Generate filename if not provided
  const outputFilename = filename || `auto-analyst-export-${Date.now()}.${extension}`;
  
  // Create and download the file
  const blob = new Blob([processedContent], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = outputFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Formats outputs (code execution results, errors, plots) for export
 * @param outputs Array of code outputs
 * @param format Export format (md or html)
 * @returns Formatted string to append to content
 */
function formatOutputsForExport(outputs: CodeOutput[], format: 'md' | 'html'): string {
  if (!outputs || outputs.length === 0) return '';

  const sections: string[] = [];
  
  // Group outputs by type
  const errorOutputs = outputs.filter(output => output.type === 'error');
  const textOutputs = outputs.filter(output => output.type === 'output');
  const plotlyOutputs = outputs.filter(output => output.type === 'plotly');
  const matplotlibOutputs = outputs.filter(output => output.type === 'matplotlib');

  // Add error outputs
  if (errorOutputs.length > 0) {
    if (format === 'html') {
      errorOutputs.forEach((output, index) => {
        const formattedContent = formatErrorOutput(output.content, format);
        sections.push(`<div class="error-section">
  <div class="section-title">❌ Error Output ${index + 1}</div>
  ${formattedContent}
</div>`);
      });
    } else {
      errorOutputs.forEach((output, index) => {
        const formattedContent = formatErrorOutput(output.content, format);
        sections.push(`## ❌ Error Output ${index + 1}\n\n${formattedContent}\n`);
      });
    }
  }

  // Add text outputs with improved formatting
  if (textOutputs.length > 0) {
    if (format === 'html') {
      textOutputs.forEach((output, index) => {
        const formattedContent = formatTextOutput(output.content, format);
        sections.push(`<div class="output-section">
  <div class="section-title">📊 Execution Output ${index + 1}</div>
  ${formattedContent}
</div>`);
      });
    } else {
      textOutputs.forEach((output, index) => {
        const formattedContent = formatTextOutput(output.content, format);
        sections.push(`## 📊 Execution Output ${index + 1}\n\n${formattedContent}\n`);
      });
    }
  }

  // Add plotly visualizations
  if (plotlyOutputs.length > 0) {
    if (format === 'html') {
      plotlyOutputs.forEach((output, index) => {
        const plotlyData = JSON.stringify({
          data: output.content.data,
          layout: {
            ...output.content.layout,
            // Ensure responsive layout for reports
            autosize: true,
            margin: { t: 50, b: 50, l: 50, r: 50 },
            font: { size: 12 }
          }
        });
        
        sections.push(`<div class="plotly-chart" data-plotly='${escapeHtml(plotlyData)}'>
  <div class="section-title">📈 Interactive Visualization ${index + 1}</div>
</div>`);
      });
    } else {
      plotlyOutputs.forEach((output, index) => {
        const plotlyJson = JSON.stringify({
          data: output.content.data,
          layout: output.content.layout
        }, null, 2);
        
        sections.push(`## 📈 Interactive Visualization ${index + 1}\n\n\`\`\`plotly\n${plotlyJson}\n\`\`\`\n`);
      });
    }
  }

  // Add matplotlib visualizations
  if (matplotlibOutputs.length > 0) {
    if (format === 'html') {
      matplotlibOutputs.forEach((output, index) => {
        const imageData = output.content.startsWith('data:image/') ? output.content : `data:image/png;base64,${output.content}`;
        
        sections.push(`<div class="matplotlib-chart" style="margin: 24px 0; padding: 20px; border-radius: 8px; background-color: var(--bg-color); border: 1px solid var(--border-color); border-left: 4px solid var(--primary-color);">
  <div class="section-title">📈 Chart Visualization ${index + 1}</div>
  <div style="text-align: center;">
    <img src="${escapeHtml(imageData)}" alt="Matplotlib Chart ${index + 1}" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" />
  </div>
</div>`);
      });
    } else {
      matplotlibOutputs.forEach((output, index) => {
        sections.push(`## 📈 Chart Visualization ${index + 1}\n\n\`\`\`matplotlib\n${output.content}\n\`\`\`\n`);
      });
    }
  }

  return sections.join('\n');
}

/**
 * Formats error output for better readability
 */
function formatErrorOutput(content: string, format: 'md' | 'html'): string {
  if (format === 'html') {
    return `<pre class="error-output"><code>${escapeHtml(content)}</code></pre>`;
  } else {
    return `\`\`\`error\n${content}\n\`\`\``;
  }
}

/**
 * Formats text output with intelligent detection of different content types
 */
function formatTextOutput(content: string, format: 'md' | 'html'): string {
  // Detect different types of output
  const outputType = detectOutputType(content);
  
  if (format === 'html') {
    switch (outputType) {
      case 'dataframe_info':
        return formatDataFrameInfo(content, format);
      case 'statistical_table':
        return formatStatisticalTable(content, format);
      case 'regression_output':
        return formatRegressionOutput(content, format);
      case 'correlation_matrix':
        return formatCorrelationMatrix(content, format);
      case 'simple_table':
        return formatSimpleTable(content, format);
      default:
        return formatGenericOutput(content, format);
    }
  } else {
    // For markdown, use simpler formatting but still improve readability
    switch (outputType) {
      case 'dataframe_info':
      case 'statistical_table':
      case 'regression_output':
      case 'correlation_matrix':
      case 'simple_table':
        return `\`\`\`output\n${content}\n\`\`\``;
      default:
        return `\`\`\`output\n${content}\n\`\`\``;
    }
  }
}

/**
 * Detects the type of output content
 */
function detectOutputType(content: string): string {
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('dataframe info:') || lowerContent.includes('rangeindex:')) {
    return 'dataframe_info';
  }
  if (lowerContent.includes('ols regression results') || lowerContent.includes('dep. variable:')) {
    return 'regression_output';
  }
  if (lowerContent.includes('correlation') && content.includes(':')) {
    return 'correlation_matrix';
  }
  if (lowerContent.includes('descriptive statistics') || 
      (lowerContent.includes('count') && lowerContent.includes('mean') && lowerContent.includes('std'))) {
    return 'statistical_table';
  }
  if (isTabularData(content)) {
    return 'simple_table';
  }
  
  return 'generic';
}

/**
 * Formats DataFrame info output
 */
function formatDataFrameInfo(content: string, format: 'md' | 'html'): string {
  if (format === 'html') {
    const lines = content.split('\n');
    let formattedContent = '<div class="dataframe-info">';
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      if (trimmedLine === '') {
        formattedContent += '<br>';
      } else if (trimmedLine.includes('OUTPUT FROM') && trimmedLine.includes('AGENT')) {
        // Agent header
        formattedContent += `<div class="df-header">${escapeHtml(trimmedLine)}</div>`;
      } else if (trimmedLine.includes('Processed DataFrame Info:')) {
        formattedContent += `<div class="df-summary">${escapeHtml(trimmedLine)}</div>`;
      } else if (trimmedLine.includes('pandas.core.frame.DataFrame')) {
        formattedContent += `<div class="df-header">${escapeHtml(trimmedLine)}</div>`;
      } else if (trimmedLine.includes('RangeIndex:') || trimmedLine.includes('entries,')) {
        formattedContent += `<div class="df-summary">${escapeHtml(trimmedLine)}</div>`;
      } else if (trimmedLine.includes('Data columns') && trimmedLine.includes('total')) {
        formattedContent += `<div class="df-summary">${escapeHtml(trimmedLine)}</div>`;
      } else if (trimmedLine.includes('#   Column') || trimmedLine.includes('---') || 
                 (trimmedLine.includes('Column') && trimmedLine.includes('Non-Null Count') && trimmedLine.includes('Dtype'))) {
        formattedContent += `<div class="df-table-header">${escapeHtml(trimmedLine)}</div>`;
      } else if (trimmedLine.match(/^\d+\s+\w+/) || trimmedLine.match(/^\s*\d+\s+/)) {
        // Data rows (column info)
        formattedContent += `<div class="df-row">${escapeHtml(trimmedLine)}</div>`;
      } else if (trimmedLine.includes('dtypes:')) {
        formattedContent += `<div class="df-types">${escapeHtml(trimmedLine)}</div>`;
      } else if (trimmedLine.includes('memory usage:')) {
        formattedContent += `<div class="df-memory">${escapeHtml(trimmedLine)}</div>`;
      } else if (trimmedLine.includes('None') && lines.indexOf(line) === lines.length - 1) {
        formattedContent += `<div class="df-info">${escapeHtml(trimmedLine)}</div>`;
      } else if (trimmedLine.includes('First few rows')) {
        formattedContent += `<div class="df-summary">${escapeHtml(trimmedLine)}</div>`;
      } else if (trimmedLine.length > 0) {
        // Other informational lines
        formattedContent += `<div class="df-info">${escapeHtml(trimmedLine)}</div>`;
      }
    });
    
    formattedContent += '</div>';
    return formattedContent;
  }
  
  return content;
}

/**
 * Formats statistical tables
 */
function formatStatisticalTable(content: string, format: 'md' | 'html'): string {
  if (format === 'html') {
    return `<div class="statistical-output">
      <pre class="stats-table">${escapeHtml(content)}</pre>
    </div>`;
  }
  
  return content;
}

/**
 * Formats regression analysis output
 */
function formatRegressionOutput(content: string, format: 'md' | 'html'): string {
  if (format === 'html') {
    const lines = content.split('\n');
    let formattedContent = '<div class="regression-output">';
    
    lines.forEach(line => {
      if (line.includes('OLS Regression Results')) {
        formattedContent += `<div class="regression-title">${escapeHtml(line)}</div>`;
      } else if (line.includes('=======')) {
        formattedContent += `<div class="regression-separator">${escapeHtml(line)}</div>`;
      } else if (line.includes('R-squared:') || line.includes('Adj. R-squared:')) {
        formattedContent += `<div class="regression-stat">${escapeHtml(line)}</div>`;
      } else if (line.match(/^\s*\w+\s+\d+/)) {
        formattedContent += `<div class="regression-coef">${escapeHtml(line)}</div>`;
      } else {
        formattedContent += `<div class="regression-line">${escapeHtml(line)}</div>`;
      }
    });
    
    formattedContent += '</div>';
    return formattedContent;
  }
  
  return content;
}

/**
 * Formats correlation matrices
 */
function formatCorrelationMatrix(content: string, format: 'md' | 'html'): string {
  if (format === 'html') {
    return `<div class="correlation-output">
      <pre class="correlation-table">${escapeHtml(content)}</pre>
    </div>`;
  }
  
  return content;
}

/**
 * Formats simple tables
 */
function formatSimpleTable(content: string, format: 'md' | 'html'): string {
  if (format === 'html') {
    return `<div class="table-output">
      <pre class="simple-table">${escapeHtml(content)}</pre>
    </div>`;
  }
  
  return content;
}

/**
 * Formats generic output
 */
function formatGenericOutput(content: string, format: 'md' | 'html'): string {
  if (format === 'html') {
    return `<pre class="generic-output"><code>${escapeHtml(content)}</code></pre>`;
  }
  
  return content;
}

/**
 * Checks if content looks like tabular data
 */
function isTabularData(content: string): boolean {
  const matches = content.match(/\|\s*\w+\s*\|/g);
  return content.includes('|') && 
         (content.includes('DataFrame') || 
          content.includes('Column Types') ||
          (matches !== null && matches.length > 1));
}

/**
 * Escapes HTML characters
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Creates a download handler function for a specific message
 * @param content The content to be downloaded
 * @param outputs Optional array of code outputs to include
 * @returns A function that handles downloading the content
 */
export function createDownloadHandler(content: string, outputs?: CodeOutput[]) {
  return (format: 'md' | 'html') => {
    exportContent(content, format, undefined, outputs);
  };
} 