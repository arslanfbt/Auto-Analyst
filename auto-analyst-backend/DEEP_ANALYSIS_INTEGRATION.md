# Deep Analysis Integration

This document describes the integration of the deep analysis functionality into the main backend application.

## Overview

The deep analysis module provides comprehensive, multi-step analytical capabilities that automatically:

1. **Generate Deep Questions**: Break down high-level analytical goals into specific, actionable questions
2. **Create Analysis Plans**: Develop optimized execution plans using multiple specialized agents
3. **Execute Analysis**: Run coordinated analysis across preprocessing, statistical, ML, and visualization agents
4. **Synthesize Results**: Combine outputs into coherent insights and recommendations
5. **Generate Reports**: Create comprehensive HTML reports with visualizations

## Architecture

### Core Components

#### 1. Deep Analysis Module (`src/agents/deep_agents.py`)
- **`deep_analysis_module`**: Main orchestrator class
- **`deep_questions`**: Generates targeted analytical questions
- **`deep_planner`**: Creates optimized execution plans
- **`deep_synthesizer`**: Combines results into coherent insights
- **`deep_code_synthesizer`**: Optimizes and combines code from multiple agents
- **`generate_html_report`**: Creates downloadable HTML reports

#### 2. Integration Points (`app.py`)
- **Session Management**: Deep analyzers are created per session
- **Model Configuration**: Uses session-specific LLM configurations
- **Error Handling**: Comprehensive error handling with logging
- **Usage Tracking**: Monitors token usage and costs

### New Endpoints

#### `/deep_analysis` (POST)
Performs comprehensive deep analysis on the current dataset.

**Request Body:**
```json
{
    "goal": "Your analytical goal or question"
}
```

**Response:**
```json
{
    "status": "success",
    "analysis": {
        "goal": "Original goal",
        "deep_questions": "Generated questions",
        "deep_plan": "Execution plan",
        "summaries": ["Analysis summaries"],
        "code": "Combined analysis code",
        "plotly_figs": [/* Plotly figures */],
        "synthesis": ["Synthesized insights"],
        "final_conclusion": "Final conclusions",
        "html_report": "Complete HTML report"
    },
    "processing_time_seconds": 45.2,
    "session_id": "session-id"
}
```

#### `/deep_analysis_streaming` (POST)
Performs streaming deep analysis with real-time progress updates.

**Request Body:** Same as `/deep_analysis`

**Response:** Server-Sent Events (SSE) stream with progress updates:
```json
{"step": "initialization", "status": "starting", "message": "Initializing...", "progress": 10}
{"step": "questions", "status": "processing", "message": "Generating questions...", "progress": 20}
{"step": "questions", "status": "completed", "content": "Generated questions", "progress": 30}
// ... more steps
{"step": "completed", "status": "success", "analysis": {...}, "progress": 100}
```

#### `/deep_analysis/features` (GET)
Lists available deep analysis features and capabilities.

#### `/deep_analysis/download_report` (POST)
Downloads HTML report from analysis data.

**Request Body:**
```json
{
    "analysis_data": {/* Previous analysis result */}
}
```

**Response:** Downloadable HTML file

## Usage Examples

### Basic Deep Analysis
```python
import requests

# Start analysis
response = requests.post(
    "http://localhost:8000/deep_analysis",
    json={"goal": "Understand customer churn patterns"},
    headers={"X-Session-ID": "your-session-id"}
)

if response.status_code == 200:
    result = response.json()
    analysis = result["analysis"]
    
    # Access different components
    questions = analysis["deep_questions"]
    insights = analysis["synthesis"]
    conclusion = analysis["final_conclusion"]
    html_report = analysis["html_report"]
```

### Streaming Analysis
```python
import requests

response = requests.post(
    "http://localhost:8000/deep_analysis_streaming",
    json={"goal": "Analyze sales performance trends"},
    headers={"X-Session-ID": "your-session-id"},
    stream=True
)

for line in response.iter_lines():
    if line:
        data = json.loads(line.decode('utf-8'))
        print(f"Step: {data['step']}, Progress: {data['progress']}%")
        
        if data['step'] == 'completed':
            final_analysis = data['analysis']
            break
```

### Download Report
```python
# After getting analysis results
download_response = requests.post(
    "http://localhost:8000/deep_analysis/download_report",
    json={"analysis_data": analysis_result},
    headers={"X-Session-ID": "your-session-id"}
)

# Save the HTML file
with open("analysis_report.html", "wb") as f:
    f.write(download_response.content)
```

## Configuration

### Environment Variables
The deep analysis module uses the following environment variables:

```bash
# LLM Configuration (inherited from main app)
MODEL_PROVIDER=anthropic
MODEL_NAME=claude-3-7-sonnet-20250219
ANTHROPIC_API_KEY=your_api_key
TEMPERATURE=1.0
MAX_TOKENS=7000

# Optional: Specific model for code synthesis
CODE_SYNTHESIS_MODEL=claude-4-opus-20250514
CODE_SYNTHESIS_MAX_TOKENS=17000
```

### Session Configuration
Deep analysis respects session-specific model configurations:

```python
# Set session model configuration
session_state["model_config"] = {
    "provider": "anthropic",
    "model": "claude-3-7-sonnet-latest",
    "api_key": "your_key",
    "temperature": 0.7,
    "max_tokens": 8000
}
```

## Error Handling

### Common Errors

1. **No Dataset Loaded (400)**
   ```json
   {"detail": "No dataset is currently loaded. Please link a dataset before proceeding with your analysis."}
   ```

2. **Timeout (504)**
   ```json
   {"detail": "Request timed out. Please try a simpler query."}
   ```

3. **Analysis Failed (500)**
   ```json
   {"detail": "Deep analysis failed: [specific error message]"}
   ```

### Debugging

Enable detailed logging:
```python
# In app.py, set logging level
logger.log_message("Debug info", level=logging.DEBUG)
```

## Performance Considerations

### Optimization Tips

1. **Session Reuse**: Deep analyzers are cached per session
2. **Model Selection**: Use appropriate models for different steps
3. **Timeout Management**: Default timeout is 60 seconds per request
4. **Memory Management**: Large datasets may require chunking

### Monitoring

Track usage through the built-in AI manager:
- Token consumption per request
- Processing time by step
- Cost per analysis
- Error rates by endpoint

## Testing

Run the integration test:
```bash
python test_deep_integration.py
```

This verifies:
- ✅ Server connectivity
- ✅ Endpoint availability
- ✅ Feature listing
- ✅ Basic functionality (with expected errors for missing datasets)

## Future Enhancements

### Planned Features
1. **Batch Analysis**: Process multiple goals simultaneously
2. **Analysis Templates**: Pre-configured analysis for common use cases
3. **Custom Agent Pipelines**: User-defined agent combinations
4. **Real-time Collaboration**: Multiple users on same analysis
5. **Export Formats**: PDF, PowerPoint, Jupyter notebook exports

### Integration Opportunities
1. **Database Integration**: Store analysis results
2. **Scheduling**: Automated recurring analysis
3. **Alerts**: Threshold-based notifications
4. **API Keys**: Fine-grained access control

## Troubleshooting

### Common Issues

**Import Errors:**
- Ensure all dependencies are installed: `pip install -r requirements.txt`
- Check relative imports in `deep_agents.py`

**Memory Issues:**
- Monitor RAM usage during large dataset analysis
- Consider implementing data chunking for very large datasets

**Timeout Issues:**
- Increase timeout for complex analyses
- Break down complex goals into simpler parts

**Model Errors:**
- Verify API keys are set correctly
- Check model availability and rate limits
- Monitor token usage and costs

## Support

For issues related to deep analysis integration:
1. Check logs for detailed error messages
2. Verify dataset is properly loaded
3. Test with simpler analytical goals
4. Review session configuration
5. Monitor resource usage (RAM, tokens, API limits)
