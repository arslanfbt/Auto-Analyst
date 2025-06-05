from bs4 import BeautifulSoup
import markdown
import numpy as np
import re
import pandas as pd


def generate_html_report(return_dict):
    """Generate a clean HTML report focusing on visualizations and key insights"""
    
    def convert_markdown_to_html(text):
        """Convert markdown text to HTML safely"""
        if not text:
            return ""
        # Don't escape HTML characters before markdown conversion
        html = markdown.markdown(str(text), extensions=['tables', 'fenced_code', 'nl2br'])
        # Use BeautifulSoup to clean up but preserve structure
        soup = BeautifulSoup(html, 'html.parser')
        return str(soup)

    def convert_conclusion_to_html(text):
        """Special conversion for conclusion with custom bullet point handling"""
        if not text:
            return ""
        
        # Clean and prepare text
        text = str(text).strip()
        
        text = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', text)
        text = re.sub(r'\*(.*?)\*', r'<em>\1</em>', text)
        
        # Handle bullet points that might not be properly formatted
        lines = text.split('\n')
        processed_lines = []
        in_list = False
        
        for line in lines:
            line = line.strip()
            if not line:
                if in_list:
                    processed_lines.append('</ul>')
                    in_list = False
                processed_lines.append('')
                continue
                
            # Check if line looks like a bullet point
            if (line.startswith('- ') or line.startswith('• ') or 
                line.startswith('* ') or re.match(r'^\d+\.\s', line)):
                
                if not in_list:
                    processed_lines.append('<ul>')
                    in_list = True
                
                # Clean the bullet point
                clean_line = re.sub(r'^[-•*]\s*', '', line)
                clean_line = re.sub(r'^\d+\.\s*', '', clean_line)
                processed_lines.append(f'<li>{clean_line}</li>')
            else:
                if in_list:
                    processed_lines.append('</ul>')
                    in_list = False
                processed_lines.append(f'<p>{line}</p>')
        
        if in_list:
            processed_lines.append('</ul>')
        
        # Join and clean up
        html_content = '\n'.join(processed_lines)
        
        # Clean up extra tags and escape HTML entities, but preserve our intentional HTML
        html_content = html_content.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        
        # Restore our intentional HTML tags
        html_content = html_content.replace('&lt;strong&gt;', '<strong>').replace('&lt;/strong&gt;', '</strong>')
        html_content = html_content.replace('&lt;em&gt;', '<em>').replace('&lt;/em&gt;', '</em>')
        html_content = html_content.replace('&lt;ul&gt;', '<ul>').replace('&lt;/ul&gt;', '</ul>')
        html_content = html_content.replace('&lt;li&gt;', '<li>').replace('&lt;/li&gt;', '</li>')
        html_content = html_content.replace('&lt;p&gt;', '<p>').replace('&lt;/p&gt;', '</p>')
        
        return html_content

    # Convert key text sections to HTML
    goal = convert_markdown_to_html(return_dict['goal'])
    questions = convert_markdown_to_html(return_dict['deep_questions'])
    conclusion = convert_conclusion_to_html(return_dict['final_conclusion'])
    # Remove duplicate conclusion headings and clean up
    conclusion = re.sub(r'<p>\s*\*\*\s*Conclusion\s*\*\*\s*</p>', '', conclusion, flags=re.IGNORECASE)
    conclusion = re.sub(r'<strong>\s*Conclusion\s*</strong>', '', conclusion, flags=re.IGNORECASE)
    conclusion = re.sub(r'<h[1-6][^>]*>\s*Conclusion\s*</h[1-6]>', '', conclusion, flags=re.IGNORECASE)
    conclusion = re.sub(r'^\s*Conclusion\s*$', '', conclusion, flags=re.MULTILINE)
    
    # Combine synthesis content
    synthesis_content = ''
    if return_dict.get('synthesis'):
        synthesis_content = ''.join(f'<div class="synthesis-section">{convert_markdown_to_html(s)}</div>' 
                       for s in return_dict['synthesis'])

    # Generate all visualizations for synthesis section
    all_visualizations = []
    if return_dict['plotly_figs']:
        for fig_group in return_dict['plotly_figs']:
            try:
                if isinstance(fig_group, list):
                    # Handle list of figures
                    for fig in fig_group:
                        if hasattr(fig, 'to_html'):
                            # It's a Plotly Figure object
                            all_visualizations.append(fig.to_html(
                                full_html=False, 
                                include_plotlyjs='cdn', 
                                config={'displayModeBar': True}
                            ))
                        elif isinstance(fig, str):
                            # It might be JSON format - try to convert
                            try:
                                import plotly.io
                                fig_obj = plotly.io.from_json(fig)
                                all_visualizations.append(fig_obj.to_html(
                                    full_html=False, 
                                    include_plotlyjs='cdn', 
                                    config={'displayModeBar': True}
                                ))
                            except Exception as e:
                                print(f"Warning: Could not process figure JSON: {e}")
                                continue
                else:
                    # Single figure
                    if hasattr(fig_group, 'to_html'):
                        # It's a Plotly Figure object
                        all_visualizations.append(fig_group.to_html(
                            full_html=False, 
                            include_plotlyjs='cdn', 
                            config={'displayModeBar': True}
                        ))
                    elif isinstance(fig_group, str):
                        # It might be JSON format - try to convert
                        try:
                            import plotly.io
                            fig_obj = plotly.io.from_json(fig_group)
                            all_visualizations.append(fig_obj.to_html(
                                full_html=False, 
                                include_plotlyjs='cdn', 
                                config={'displayModeBar': True}
                            ))
                        except Exception as e:
                            print(f"Warning: Could not process figure JSON: {e}")
                            continue
                            
            except Exception as e:
                print(f"Warning: Error processing visualizations: {e}")

    # Prepare code for syntax highlighting
    code_content = return_dict.get('code', '').strip()

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Deep Analysis Report</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
        <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/python.min.js"></script>
        <style>
            body {{ 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                line-height: 1.6; 
                margin: 0; 
                padding: 20px; 
                color: #374151; 
                background-color: #f9fafb;
            }}
            .container {{ max-width: 1400px; margin: 0 auto; }}
            .section {{ 
                margin-bottom: 24px; 
                padding: 32px; 
                background: #ffffff; 
                border-radius: 12px; 
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                border-left: 4px solid #FF7F7F;
                page-break-inside: avoid;
            }}
            h1 {{ 
                color: #FF7F7F; 
                font-size: 32px; 
                margin-bottom: 12px; 
                font-weight: 700;
                page-break-after: avoid;
            }}
            h2 {{ 
                color: #FF7F7F; 
                font-size: 24px; 
                margin-bottom: 20px; 
                font-weight: 600;
                border-bottom: 2px solid #FF7F7F;
                padding-bottom: 10px;
                page-break-after: avoid;
            }}
            h3 {{ color: #4b5563; font-size: 18px; margin-bottom: 14px; font-weight: 600; page-break-after: avoid; }}
            h4 {{ color: #6b7280; font-size: 16px; margin-bottom: 12px; font-weight: 600; page-break-after: avoid; }}
            .question-content {{ 
                background: #FFF0F0; 
                padding: 20px; 
                border-radius: 8px; 
                border-left: 3px solid #FF7F7F;
                page-break-inside: avoid;
            }}
            .synthesis-content {{ 
                background: #f9fafb; 
                padding: 24px; 
                border-radius: 8px;
                margin-bottom: 24px;
                page-break-inside: avoid;
            }}
            .visualization-container {{ 
                margin: 24px 0; 
                padding: 20px; 
                background: #ffffff; 
                border-radius: 8px; 
                border: 1px solid #e5e7eb;
                page-break-inside: avoid;
            }}
            .code-section {{ 
                background: #1f2937; 
                color: #e5e7eb; 
                border-radius: 8px; 
                overflow: hidden;
                margin: 20px 0;
                position: relative;
                page-break-inside: avoid;
            }}
            .code-header {{ 
                background: #FF7F7F; 
                color: white; 
                padding: 16px 20px; 
                cursor: pointer; 
                font-weight: 500;
                user-select: none;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }}
            .code-header:hover {{ background: #FF6666; }}
            .code-controls {{ 
                display: flex; 
                gap: 12px; 
                align-items: center; 
            }}
            .copy-button {{ 
                background: rgba(255, 255, 255, 0.2); 
                border: none; 
                color: white; 
                padding: 8px 16px; 
                border-radius: 6px; 
                cursor: pointer; 
                font-size: 14px;
                transition: background 0.2s;
            }}
            .copy-button:hover {{ background: rgba(255, 255, 255, 0.3); }}
            .copy-button.copied {{ background: #10b981; }}
            .code-content {{ 
                padding: 0; 
                max-height: 0; 
                overflow: hidden; 
                transition: max-height 0.3s ease;
                position: relative;
            }}
            .code-content.expanded {{ max-height: 1200px; overflow-y: auto; }}
            .code-content pre {{ 
                margin: 0; 
                padding: 20px;
                white-space: pre-wrap; 
                word-wrap: break-word; 
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                font-size: 14px;
                line-height: 1.5;
                background: #1f2937;
            }}
            .code-content code {{
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                font-size: 14px;
                line-height: 1.5;
            }}
            .conclusion-content {{ 
                background: linear-gradient(135deg, #FFF0F0 0%, #fdf2f8 100%); 
                padding: 28px; 
                border-radius: 8px; 
                border: 1px solid #FF7F7F;
                font-size: 16px;
                line-height: 1.7;
                page-break-inside: avoid;
            }}
            /* Enhanced conclusion formatting */
            .conclusion-content h1, .conclusion-content h2, .conclusion-content h3, .conclusion-content h4 {{
                color: #FF7F7F;
                margin-top: 20px;
                margin-bottom: 12px;
                font-weight: 600;
                page-break-after: avoid;
            }}
            .conclusion-content h1 {{ font-size: 22px; }}
            .conclusion-content h2 {{ font-size: 18px; }}
            .conclusion-content h3 {{ font-size: 16px; }}
            .conclusion-content h4 {{ font-size: 14px; }}
            .conclusion-content ul {{ 
                margin: 18px 0; 
                padding-left: 28px;
                list-style: none;
                position: relative;
                page-break-inside: avoid;
            }}
            .conclusion-content ul li {{ 
                margin-bottom: 12px; 
                line-height: 1.7;
                position: relative;
                padding-left: 0;
            }}
            .conclusion-content ul li:before {{
                content: "•";
                color: #FF7F7F;
                font-weight: bold;
                position: absolute;
                left: -24px;
                font-size: 18px;
            }}
            .conclusion-content ol {{
                margin: 18px 0; 
                padding-left: 28px;
                counter-reset: item;
                page-break-inside: avoid;
            }}
            .conclusion-content ol li {{
                margin-bottom: 12px; 
                line-height: 1.7;
                display: block;
                position: relative;
                padding-left: 0;
            }}
            .conclusion-content ol li:before {{
                content: counter(item) ".";
                counter-increment: item;
                color: #FF7F7F;
                font-weight: bold;
                position: absolute;
                left: -28px;
            }}
            .conclusion-content p {{ 
                margin-bottom: 18px; 
                line-height: 1.7;
            }}
            .conclusion-content strong {{ 
                color: #FF7F7F; 
                font-weight: 600; 
            }}
            .conclusion-content em {{ 
                font-style: italic; 
                color: #6b7280;
            }}
            .synthesis-section {{ margin-bottom: 18px; page-break-inside: avoid; }}
            .synthesis-section ul {{
                margin: 14px 0;
                padding-left: 24px;
                list-style-type: disc;
            }}
            .synthesis-section ul li {{
                margin-bottom: 8px;
                line-height: 1.6;
                list-style-type: disc;
                display: list-item;
            }}
            p {{ margin-bottom: 14px; }}
            /* General list styling for other sections (not conclusion) */
            ul:not(.conclusion-content ul) {{ 
                margin-bottom: 18px; 
                padding-left: 24px; 
                list-style-type: disc;
            }}
            ol:not(.conclusion-content ol) {{ 
                margin-bottom: 18px; 
                padding-left: 24px; 
                list-style-type: decimal;
            }}
            li:not(.conclusion-content li) {{ 
                margin-bottom: 8px; 
                line-height: 1.6;
                display: list-item;
            }}
            /* Syntax highlighting overrides - matching app's theme */
            .hljs {{
                background: #1f2937 !important;
                color: #e5e7eb !important;
                padding: 20px !important;
                border-radius: 0 !important;
            }}
            .hljs-keyword {{ color: #f59e0b !important; }}
            .hljs-string {{ color: #10b981 !important; }}
            .hljs-number {{ color: #3b82f6 !important; }}
            .hljs-comment {{ color: #6b7280 !important; }}
            .hljs-function {{ color: #8b5cf6 !important; }}
            .hljs-built_in {{ color: #FF7F7F !important; }}
            
            /* PDF/Print Specific Styles */
            @media print {{
                body {{
                    background-color: white !important;
                    padding: 8mm;
                    font-size: 14pt;
                    line-height: 1.5;
                    color: #000 !important;
                }}
                .container {{
                    max-width: none;
                    margin: 0;
                }}
                .section {{
                    background: white !important;
                    box-shadow: none !important;
                    border-radius: 0 !important;
                    border-left: 2pt solid #FF7F7F !important;
                    padding: 18pt;
                    margin-bottom: 15pt;
                    page-break-inside: avoid;
                    margin-top: 0 !important;
                    padding-top: 20pt !important;
                }}
                /* Don't add page break before the first section */
                .section:first-child {{
                    page-break-before: avoid;
                    margin-top: 0 !important;
                    padding-top: 18pt !important;
                }}
                
                /* Larger fonts for first page section */
                .section:first-child h1 {{
                    font-size: 27pt !important;
                    margin-bottom: 18pt;
                }}
                .section:first-child h2 {{
                    font-size: 23pt !important;
                    margin-bottom: 15pt;
                }}
                .section:first-child .question-content {{
                    font-size: 16pt !important;
                    line-height: 1.6;
                    padding: 18pt;
                }}
                .section:first-child .question-content p {{
                    font-size: 16pt !important;
                    margin-bottom: 12pt;
                }}
                
                /* Hide code section completely in PDF */
                .section:has(.code-section),
                .section .code-section,
                .code-section {{
                    display: none !important;
                }}
                h1 {{
                    font-size: 24pt;
                    color: #FF7F7F !important;
                    page-break-after: avoid;
                    margin-top: 0;
                    margin-bottom: 15pt;
                }}
                h2 {{
                    font-size: 20pt;
                    color: #FF7F7F !important;
                    page-break-after: avoid;
                    border-bottom: 1pt solid #FF7F7F !important;
                    margin-bottom: 12pt;
                }}
                h3 {{
                    font-size: 16pt;
                    color: #333 !important;
                    page-break-after: avoid;
                    margin-bottom: 10pt;
                }}
                h4 {{
                    font-size: 14pt;
                    color: #333 !important;
                    page-break-after: avoid;
                    margin-bottom: 10pt;
                }}
                p {{
                    font-size: 13pt;
                    margin-bottom: 10pt;
                    line-height: 1.5;
                }}
                .question-content {{
                    background: #f9f9f9 !important;
                    border-left: 2pt solid #FF7F7F !important;
                    border-radius: 0 !important;
                    padding: 15pt;
                    page-break-inside: avoid;
                    font-size: 13pt;
                }}
                .synthesis-content {{
                    background: #f9f9f9 !important;
                    border: 1pt solid #ddd !important;
                    border-radius: 0 !important;
                    padding: 15pt;
                    page-break-inside: avoid;
                    font-size: 13pt;
                }}
                .conclusion-content {{
                    background: #f9f9f9 !important;
                    border: 1pt solid #FF7F7F !important;
                    border-radius: 0 !important;
                    padding: 18pt;
                    page-break-inside: avoid;
                    font-size: 16pt !important;
                    line-height: 1.6;
                }}
                
                /* Larger fonts for conclusion section */
                .conclusion-content h1 {{
                    font-size: 25pt !important;
                    margin-bottom: 15pt;
                }}
                .conclusion-content h2 {{
                    font-size: 21pt !important;
                    margin-bottom: 12pt;
                }}
                .conclusion-content h3 {{
                    font-size: 19pt !important;
                    margin-bottom: 10pt;
                }}
                .conclusion-content h4 {{
                    font-size: 17pt !important;
                    margin-bottom: 10pt;
                }}
                .conclusion-content p {{
                    font-size: 16pt !important;
                    margin-bottom: 12pt;
                    line-height: 1.6;
                }}
                .conclusion-content ul li {{
                    font-size: 16pt !important;
                    margin-bottom: 10pt;
                    line-height: 1.6;
                }}
                .conclusion-content ol li {{
                    font-size: 16pt !important;
                    margin-bottom: 10pt;
                    line-height: 1.6;
                }}
                
                /* Chart/Visualization specific rules */
                .visualization-container {{
                    background: white !important;
                    border: 1pt solid #ddd !important;
                    border-radius: 0 !important;
                    padding: 12pt;
                    page-break-before: auto;
                    page-break-after: auto;
                    page-break-inside: avoid !important;
                    margin: 12pt 0;
                    max-height: none !important;
                    height: auto !important;
                    overflow: visible !important;
                }}
                /* Plotly charts - ensure they don't break and fit properly */
                .plotly-graph-div {{
                    page-break-inside: avoid !important;
                    page-break-before: auto !important;
                    page-break-after: auto !important;
                    max-height: 60vh !important;
                    max-width: 100% !important;
                    height: auto !important;
                    overflow: visible !important;
                    margin: 6pt 0 !important;
                }}
                /* If chart is too tall, allow it to take a full page */
                .visualization-container:has(.plotly-graph-div) {{
                    page-break-before: auto;
                    page-break-after: auto;
                    page-break-inside: avoid;
                    max-height: 85vh;
                    overflow: visible;
                }}
                /* Hide all code-related elements */
                .code-section,
                .code-header,
                .code-content,
                .code-controls,
                .copy-button,
                pre code,
                .hljs {{
                    display: none !important;
                }}
                /* Page breaks */
                .section {{
                    page-break-before: always;
                    page-break-after: auto;
                    page-break-inside: avoid;
                }}
                /* Ensure section headings don't get orphaned */
                .section h2 {{
                    page-break-after: avoid;
                    orphans: 2;
                    widows: 2;
                }}
                /* Better control for large content blocks */
                .synthesis-content {{
                    orphans: 2;
                    widows: 2;
                }}
                /* Ensure tables don't break poorly */
                .section table {{
                    page-break-inside: avoid;
                    margin: 10pt 0;
                    font-size: 12pt;
                }}
                .section table th,
                .section table td {{
                    padding: 6pt 10pt;
                    font-size: 12pt;
                }}
                /* List styling for PDF */
                ul, ol {{
                    margin: 10pt 0;
                    padding-left: 20pt;
                }}
                li {{
                    margin-bottom: 6pt;
                    font-size: 13pt;
                    line-height: 1.5;
                }}
                /* Conclusion specific styling */
                .conclusion-content ul li:before {{
                    color: #FF7F7F !important;
                }}
                .conclusion-content ol li:before {{
                    color: #FF7F7F !important;
                }}
                .conclusion-content strong {{
                    color: #FF7F7F !important;
                }}
            }}
            
            /* Additional PDF optimization */
            @page {{
                size: A4;
                margin: 15mm 12mm 20mm 12mm;
            }}
            
            
        </style>
        <script>
            document.addEventListener('DOMContentLoaded', function() {{
                hljs.highlightAll();
                
                // Add print-specific functionality
                window.addEventListener('beforeprint', function() {{
                    // Ensure all Plotly graphs are visible and properly sized for printing
                    const plotlyDivs = document.querySelectorAll('.plotly-graph-div');
                    plotlyDivs.forEach(function(div) {{
                        if (window.Plotly && window.Plotly.Plots) {{
                            try {{
                                // Resize plot for print
                                window.Plotly.Plots.resize(div);
                            }} catch (e) {{
                                console.log('Note: Could not resize plot for print:', e);
                            }}
                        }}
                    }});
                    
                    // Expand any collapsed code sections for PDF
                    const codeContents = document.querySelectorAll('.code-content');
                    codeContents.forEach(function(content) {{
                        content.classList.add('expanded');
                    }});
                }});
                
                // Add a small delay for plots to render when window loads
                setTimeout(function() {{
                    const plotlyDivs = document.querySelectorAll('.plotly-graph-div');
                    if (plotlyDivs.length > 0 && window.Plotly) {{
                        plotlyDivs.forEach(function(div) {{
                            try {{
                                window.Plotly.Plots.resize(div);
                            }} catch (e) {{
                                // Silent fail - plot may not be fully initialized yet
                            }}
                        }});
                    }}
                }}, 2000);
            }});

            function toggleCode() {{
                const content = document.getElementById('codeContent');
                const header = document.getElementById('codeToggle');
                if (content.classList.contains('expanded')) {{
                    content.classList.remove('expanded');
                    header.textContent = 'View Generated Code (Click to expand)';
                }} else {{
                    content.classList.add('expanded');
                    header.textContent = 'Generated Code (Click to collapse)';
                }}
            }}

            function copyCode() {{
                const codeElement = document.getElementById('rawCode');
                const copyButton = document.getElementById('copyButton');
                
                if (codeElement) {{
                    const textToCopy = codeElement.textContent || codeElement.innerText;
                    
                    if (navigator.clipboard && window.isSecureContext) {{
                        navigator.clipboard.writeText(textToCopy).then(function() {{
                            copyButton.textContent = 'Copied!';
                            copyButton.classList.add('copied');
                            setTimeout(function() {{
                                copyButton.textContent = 'Copy';
                                copyButton.classList.remove('copied');
                            }}, 2000);
                        }}).catch(function(err) {{
                            console.error('Failed to copy: ', err);
                            fallbackCopyTextToClipboard(textToCopy, copyButton);
                        }});
                    }} else {{
                        fallbackCopyTextToClipboard(textToCopy, copyButton);
                    }}
                }}
            }}

            function fallbackCopyTextToClipboard(text, button) {{
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.top = '0';
                textArea.style.left = '0';
                textArea.style.position = 'fixed';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {{
                    const successful = document.execCommand('copy');
                    if (successful) {{
                        button.textContent = 'Copied!';
                        button.classList.add('copied');
                        setTimeout(function() {{
                            button.textContent = 'Copy';
                            button.classList.remove('copied');
                        }}, 2000);
                    }} else {{
                        button.textContent = 'Failed';
                        setTimeout(function() {{
                            button.textContent = 'Copy';
                        }}, 2000);
                    }}
                }} catch (err) {{
                    button.textContent = 'Failed';
                    setTimeout(function() {{
                        button.textContent = 'Copy';
                    }}, 2000);
                }}
                document.body.removeChild(textArea);
            }}
        </script>
    </head>
    <body>
        <div class="container">
        <div class="section">
                <h1>Deep Analysis Report</h1>
                <h2>Original Question</h2>
                <div class="question-content">
                    {goal}
                </div>
                
                <h2>Detailed Research Questions</h2>
                <div class="question-content">
                    {questions}
                </div>
        </div>


        <div class="section">
                <h2>Analysis & Insights</h2>
                <div class="synthesis-content">
                    {synthesis_content}
        </div>

                {''.join(f'<div class="visualization-container">{viz}</div>' for viz in all_visualizations) if all_visualizations else '<p><em>No visualizations generated</em></p>'}
            </div>

            {f'''
        <div class="section">
                <h2>Generated Code</h2>
                <div class="code-section">
                    <div class="code-header">
                        <span id="codeToggle" onclick="toggleCode()" style="cursor: pointer;">
                            View Generated Code (Click to expand)
                        </span>
                        <div class="code-controls">
                            <button id="copyButton" class="copy-button" onclick="copyCode()">Copy</button>
        </div>
                    </div>
                    <div class="code-content" id="codeContent">
                        <pre><code id="rawCode" class="language-python">{code_content}</code></pre>
                    </div>
                </div>
            </div>
            ''' if code_content else ''}

        <div class="section">
                <h2>Conclusion</h2>
            <div class="conclusion-content">
                {conclusion}
                </div>
            </div>
        </div>
        
        <!-- Page footer for PDF -->
        <div class="page-footer"></div>
    </body>
    </html>"""
    return html

