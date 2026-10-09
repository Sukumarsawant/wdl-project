#!/usr/bin/env python3
"""
Python Privacy Audit Report Generator
Generates a standalone, beautifully formatted, print-ready HTML/PDF-compatible Executive Privacy & Deanonymization Report.
"""

import sys
import json
import os
from datetime import datetime

def finding_confidence(item):
    value = item.get('confidence', item.get('confidenceScore'))
    try:
        return max(0, min(100, round(float(value))))
    except (TypeError, ValueError):
        severity = str(item.get('severity', item.get('riskLevel', ''))).lower()
        if severity in ('high', 'critical'):
            return 92
        if severity in ('moderate', 'medium'):
            return 78
        if severity == 'low':
            return 65
        return 70 if item.get('evidenceSnippet') or item.get('fullText') else 50

def generate_html_report(data_json_path, output_path):
    with open(data_json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    user = data.get('user', {})
    reddit_audit = data.get('redditAudit', {})
    github_audit = data.get('githubAudit', {})
    hackernews_audit = data.get('hackernewsAudit', {})
    stackoverflow_audit = data.get('stackoverflowAudit', {})
    conn = data.get('connectionStatus', {})

    username = user.get('reddit_username') or user.get('github_username') or user.get('name') or 'Anonymous User'
    date_str = datetime.now().strftime("%B %d, %Y - %H:%M UTC")

    # Overall score calculation
    r_score = reddit_audit.get('score', 0) if conn.get('reddit', {}).get('connected') else None
    g_score = github_audit.get('score', 0) if conn.get('github', {}).get('connected') else None
    h_score = hackernews_audit.get('score', 0) if conn.get('hackernews', {}).get('connected') else None
    so_score = stackoverflow_audit.get('score', 0) if conn.get('stackoverflow', {}).get('connected') else None
    
    scores = [s for s in [r_score, g_score, h_score, so_score] if s is not None]
    overall_score = round(sum(scores) / len(scores)) if scores else 50
    risk_level = "CRITICAL RISK" if overall_score >= 80 else "MODERATE RISK" if overall_score >= 50 else "LOW RISK"
    risk_color = "#e11d48" if overall_score >= 80 else "#f59e0b" if overall_score >= 50 else "#10b981"

    # Compile findings
    all_findings = []
    if conn.get('reddit', {}).get('connected'):
        for f in reddit_audit.get('findings', []):
            f['platform_tag'] = 'Reddit'
            all_findings.append(f)
    if conn.get('github', {}).get('connected'):
        for f in github_audit.get('findings', []):
            f['platform_tag'] = 'GitHub'
            all_findings.append(f)
    if conn.get('hackernews', {}).get('connected'):
        for f in hackernews_audit.get('findings', []):
            f['platform_tag'] = 'Hacker News'
            all_findings.append(f)
    if conn.get('stackoverflow', {}).get('connected'):
        for f in stackoverflow_audit.get('findings', []):
            f['platform_tag'] = 'Stack Overflow'
            all_findings.append(f)

    findings_html = ""
    for idx, item in enumerate(all_findings, start=1):
        sev = item.get('severity', 'Moderate')
        sev_badge_color = "#ffe4e6" if sev == 'High' else "#fef3c7" if sev == 'Moderate' else "#e0e7ff"
        sev_text_color = "#9f1239" if sev == 'High' else "#92400e" if sev == 'Moderate' else "#3730a3"

        evidence = item.get('evidenceSnippet', '')
        desc = item.get('description', '')
        category = item.get('category', item.get('type', 'Identity Finding'))
        source = item.get('source', '')
        remediation = item.get('remediation', '')
        conf = finding_confidence(item)

        findings_html += f"""
        <div class="finding-card">
            <div class="finding-header">
                <span class="finding-num">#{idx}</span>
                <span class="finding-cat">{category}</span>
                <span class="badge" style="background:{sev_badge_color}; color:{sev_text_color}; font-weight:700;">{sev} Severity</span>
                <span class="conf-badge">{conf}% Confidence</span>
                <span class="source-tag">{source}</span>
            </div>
            <p class="finding-desc">{desc}</p>
            {f'<div class="evidence-box"><strong>Evidence:</strong> {evidence}</div>' if evidence else ''}
            {f'<div class="remediation-box"><strong>Recommended Action:</strong> {remediation}</div>' if remediation else ''}
        </div>
        """

    if not findings_html:
        findings_html = "<div class='no-findings'>No public high-risk identity exposures discovered on scanned accounts.</div>"

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Privacy & Deanonymization Exposure Audit - {username}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap');
        
        @page {{
            size: A4;
            margin: 18mm 16mm;
        }}

        * {{
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }}

        body {{
            font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
            background: #f8fafc;
            color: #0f172a;
            margin: 0;
            padding: 24px;
            font-size: 13px;
            line-height: 1.5;
        }}

        .report-container {{
            max-width: 900px;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 20px;
            padding: 36px 40px;
            box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
        }}

        .header {{
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #f1f5f9;
            padding-bottom: 24px;
            margin-bottom: 28px;
        }}

        .logo-area {{
            display: flex;
            align-items: center;
            gap: 12px;
        }}

        .logo-box {{
            width: 42px;
            height: 42px;
            background: #ff5722;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-weight: 800;
            font-size: 20px;
            box-shadow: 0 4px 12px rgba(255, 87, 34, 0.3);
        }}

        .app-name {{
            font-size: 18px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: -0.5px;
        }}

        .doc-title {{
            font-size: 12px;
            color: #64748b;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}

        .meta-right {{
            text-align: right;
            font-family: 'JetBrains Mono', monospace;
            font-size: 11px;
            color: #64748b;
        }}

        .score-banner {{
            display: grid;
            grid-template-columns: 2fr 1fr 1fr;
            gap: 16px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 20px 24px;
            margin-bottom: 28px;
            align-items: center;
        }}

        .user-info h2 {{
            margin: 0 0 4px 0;
            font-size: 20px;
            font-weight: 800;
            color: #0f172a;
        }}

        .user-info p {{
            margin: 0;
            font-size: 12px;
            color: #64748b;
            font-family: 'JetBrains Mono', monospace;
        }}

        .stat-card {{
            text-align: center;
            padding: 10px 16px;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
        }}

        .stat-val {{
            font-size: 24px;
            font-weight: 800;
            font-family: 'JetBrains Mono', monospace;
        }}

        .stat-lbl {{
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
            margin-top: 2px;
        }}

        .section-title {{
            font-size: 14px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #0f172a;
            margin: 28px 0 16px 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }}

        .section-title::before {{
            content: '';
            display: inline-block;
            width: 4px;
            height: 16px;
            background: #ff5722;
            border-radius: 2px;
        }}

        .grid-2 {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 24px;
        }}

        .info-panel {{
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            padding: 16px 18px;
        }}

        .info-panel h4 {{
            margin: 0 0 12px 0;
            font-size: 12px;
            font-weight: 700;
            color: #334155;
            text-transform: uppercase;
            border-bottom: 1px solid #f1f5f9;
            padding-bottom: 6px;
        }}

        .info-row {{
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            margin-bottom: 6px;
        }}

        .info-lbl {{
            color: #64748b;
        }}

        .info-val {{
            font-weight: 600;
            font-family: 'JetBrains Mono', monospace;
            color: #0f172a;
        }}

        .finding-card {{
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            padding: 18px 20px;
            margin-bottom: 14px;
            break-inside: avoid;
        }}

        .finding-header {{
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 10px;
            flex-wrap: wrap;
        }}

        .finding-num {{
            font-family: 'JetBrains Mono', monospace;
            font-weight: 700;
            font-size: 11px;
            color: #ff5722;
            background: #fff3ed;
            padding: 2px 6px;
            border-radius: 6px;
        }}

        .finding-cat {{
            font-weight: 700;
            font-size: 13px;
            color: #0f172a;
        }}

        .badge {{
            font-size: 10px;
            padding: 2px 8px;
            border-radius: 6px;
            text-transform: uppercase;
        }}

        .conf-badge {{
            font-family: 'JetBrains Mono', monospace;
            font-size: 11px;
            color: #64748b;
            margin-left: auto;
        }}

        .source-tag {{
            font-size: 11px;
            color: #64748b;
            font-family: 'JetBrains Mono', monospace;
        }}

        .finding-desc {{
            margin: 0 0 10px 0;
            color: #334155;
            font-weight: 500;
            font-size: 12.5px;
        }}

        .evidence-box {{
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-left: 3px solid #ff5722;
            padding: 10px 14px;
            border-radius: 8px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 11px;
            color: #334155;
            word-break: break-all;
            margin-bottom: 8px;
        }}

        .remediation-box {{
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            padding: 10px 14px;
            border-radius: 8px;
            font-size: 11.5px;
            color: #166534;
        }}

        .no-findings {{
            text-align: center;
            padding: 32px;
            background: #f0fdf4;
            border: 1px dashed #bbf7d0;
            border-radius: 14px;
            color: #166534;
            font-weight: 600;
        }}

        .footer {{
            margin-top: 36px;
            padding-top: 18px;
            border-top: 1px solid #f1f5f9;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11px;
            color: #94a3b8;
        }}

        .actions-bar {{
            position: fixed;
            bottom: 24px;
            right: 24px;
            display: flex;
            gap: 12px;
            z-index: 9999;
        }}

        .print-btn {{
            background: #ff5722;
            color: #ffffff;
            border: none;
            padding: 12px 24px;
            font-size: 13px;
            font-weight: 700;
            border-radius: 9999px;
            cursor: pointer;
            box-shadow: 0 4px 14px rgba(255, 87, 34, 0.4);
            transition: all 0.2s;
            font-family: 'Plus Jakarta Sans', sans-serif;
        }}

        .print-btn:hover {{
            background: #f4511e;
            transform: translateY(-2px);
        }}

        @media print {{
            body {{
                background: #ffffff;
                padding: 0;
            }}
            .report-container {{
                border: none;
                box-shadow: none;
                padding: 0;
                max-width: 100%;
            }}
            .actions-bar {{
                display: none;
            }}
        }}
    </style>
</head>
<body>
    <div class="actions-bar">
        <button class="print-btn" onclick="window.print()">🖨️ Save as PDF / Print</button>
    </div>

    <div class="report-container">
        <div class="header">
            <div class="logo-area">
                <div class="logo-box">🛡️</div>
                <div>
                    <div class="app-name">WebLab Self-Auditor</div>
                    <div class="doc-title">Executive Deanonymization & OSINT Exposure Report</div>
                </div>
            </div>
            <div class="meta-right">
                <div><strong>Audit Date:</strong> {date_str}</div>
                <div><strong>Classification:</strong> Confidential Self-Audit</div>
            </div>
        </div>

        <div class="score-banner">
            <div class="user-info">
                <h2>{user.get('name', username)}</h2>
                <p>Reddit: {f"u/{user.get('reddit_username')}" if user.get('reddit_username') else 'None linked'} | GitHub: {f"@{user.get('github_username')}" if user.get('github_username') else 'None linked'} | Hacker News: {user.get('hackernews_username') or 'None linked'} | Stack Overflow: {user.get('stackoverflow_username') or 'None linked'}</p>
            </div>
            <div class="stat-card">
                <div class="stat-val" style="color: {risk_color};">{overall_score} / 100</div>
                <div class="stat-lbl">Exposure Index</div>
            </div>
            <div class="stat-card">
                <div class="stat-val" style="color: {risk_color};">{risk_level.split()[0]}</div>
                <div class="stat-lbl">Risk Tier</div>
            </div>
        </div>

        <div class="section-title">Synthesized Platform Fingerprints</div>
        <div class="grid-2">
            <div class="info-panel">
                <h4>Reddit OSINT Footprint</h4>
                <div class="info-row">
                    <span class="info-lbl">Connected Username:</span>
                    <span class="info-val">{f"u/{user.get('reddit_username')}" if user.get('reddit_username') else 'Unlinked'}</span>
                </div>
                <div class="info-row">
                    <span class="info-lbl">Predicted Region:</span>
                    <span class="info-val">{reddit_audit.get('predictedState', 'Undisclosed')}</span>
                </div>
                <div class="info-row">
                    <span class="info-lbl">Revealed Email:</span>
                    <span class="info-val">{reddit_audit.get('revealedEmail', 'None')}</span>
                </div>
                <div class="info-row">
                    <span class="info-lbl">Scanned Activity Items:</span>
                    <span class="info-val">{reddit_audit.get('itemCount', 0)} comments/posts</span>
                </div>
            </div>

            <div class="info-panel">
                <h4>GitHub Developer Footprint</h4>
                <div class="info-row">
                    <span class="info-lbl">Connected Username:</span>
                    <span class="info-val">{f"@{user.get('github_username')}" if user.get('github_username') else 'Unlinked'}</span>
                </div>
                <div class="info-row">
                    <span class="info-lbl">Identity Name:</span>
                    <span class="info-val">{github_audit.get('identityName', 'Undisclosed')}</span>
                </div>
                <div class="info-row">
                    <span class="info-lbl">Company / Org:</span>
                    <span class="info-val">{github_audit.get('company', 'None declared')}</span>
                </div>
                <div class="info-row">
                    <span class="info-lbl">Languages Discovered:</span>
                    <span class="info-val">{", ".join(github_audit.get('languages', ['None']))}</span>
                </div>
            </div>
            <div class="info-panel">
                <h4>Hacker News Discussion Footprint</h4>
                <div class="info-row"><span class="info-lbl">Connected Username:</span><span class="info-val">{hackernews_audit.get('username', 'Unlinked') if conn.get('hackernews', {}).get('connected') else 'Unlinked'}</span></div>
                <div class="info-row"><span class="info-lbl">Predicted Region:</span><span class="info-val">{hackernews_audit.get('predictedState', 'Undisclosed')}</span></div>
                <div class="info-row"><span class="info-lbl">Scanned Activity Items:</span><span class="info-val">{hackernews_audit.get('itemCount', 0)} stories/comments</span></div>
            </div>
        </div>

        <div class="section-title">Detailed Exposure Findings & Evidence ({len(all_findings)})</div>
        <div class="findings-list">
            {findings_html}
        </div>

        <div class="footer">
            <span>Generated by WebLab Privacy & Deanonymization Defense Engine</span>
            <span>https://localhost:3000/risk-report</span>
        </div>
    </div>
</body>
</html>
"""

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html_content)

def convert_to_pdf(html_path, pdf_path):
    import shutil
    import subprocess
    import platform

    html_abs = os.path.abspath(html_path)
    pdf_abs = os.path.abspath(pdf_path)

    candidate_paths = []
    if platform.system() == 'Windows':
        user_profile = os.environ.get('USERPROFILE', '')
        candidate_paths = [
            r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
            r'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
            r'C:\Program Files\Google\Chrome\Application\chrome.exe',
            r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
            os.path.join(user_profile, r'AppData\Local\Google\Chrome\Application\chrome.exe'),
            os.path.join(user_profile, r'AppData\Local\Microsoft\Edge\Application\msedge.exe'),
        ]
    else:
        for cmd in ['google-chrome', 'chromium', 'chromium-browser', 'msedge']:
            found = shutil.which(cmd)
            if found:
                candidate_paths.append(found)

    for browser in candidate_paths:
        if os.path.exists(browser):
            try:
                cmd = [
                    browser,
                    '--headless',
                    '--disable-gpu',
                    '--no-pdf-header-footer',
                    f'--print-to-pdf={pdf_abs}',
                    html_abs
                ]
                res = subprocess.run(cmd, capture_output=True, timeout=20)
                if os.path.exists(pdf_abs) and os.path.getsize(pdf_abs) > 0:
                    print(f"PDF successfully generated via browser: {pdf_abs}")
                    return True
            except Exception as e:
                print(f"Browser PDF generation error with {browser}: {e}", file=sys.stderr)

    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet
        doc = SimpleDocTemplate(pdf_abs, pagesize=letter)
        styles = getSampleStyleSheet()
        story = [Paragraph("Privacy & Deanonymization Exposure Report", styles['Heading1']), Spacer(1, 20)]
        doc.build(story)
        if os.path.exists(pdf_abs) and os.path.getsize(pdf_abs) > 0:
            print(f"PDF generated via reportlab fallback: {pdf_abs}")
            return True
    except Exception as e:
        print(f"Reportlab fallback error: {e}", file=sys.stderr)

    return False

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python generate_report.py <data_json_path> <output_html_path> [output_pdf_path]")
        sys.exit(1)
    html_out = sys.argv[2]
    generate_html_report(sys.argv[1], html_out)
    print(f"HTML Report successfully generated at {html_out}")

    if len(sys.argv) >= 4:
        pdf_out = sys.argv[3]
        convert_to_pdf(html_out, pdf_out)

