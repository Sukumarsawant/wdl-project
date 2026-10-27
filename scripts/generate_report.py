#!/usr/bin/env python3
"""
Executive Privacy & Deanonymization Report Generator
High-fidelity, print-ready, professional executive styling with clickable links.
Uses ReportLab with strict typography, proper colors, and segregated platform sections.
- Clean header with target identity and linked account handles
- No arbitrary / conflicting aggregate scores
- Every platform section displays its own dedicated findings, confidence, and verified links
"""

import sys
import json
import os
import html
from datetime import datetime

def extract_platform_metrics(audit):
    findings = audit.get('findings', [])
    if not findings:
        return 0, 0, "No Exposure", []

    explicit_conf = audit.get('confidenceScore')
    if explicit_conf is not None and float(explicit_conf) > 0:
        avg_confidence = round(float(explicit_conf))
    else:
        conf_list = [float(f.get('confidence', f.get('confidenceScore', 65))) for f in findings]
        avg_confidence = round(sum(conf_list) / len(conf_list)) if conf_list else 65

    explicit_score = audit.get('score')
    if explicit_score is not None and float(explicit_score) > 0:
        score = round(float(explicit_score))
    else:
        high_sev = sum(1 for f in findings if f.get('severity') in ('High', 'Critical'))
        mod_sev = sum(1 for f in findings if f.get('severity') in ('Moderate', 'Medium'))
        score = min(98, max(20, round((high_sev * 30) + (mod_sev * 15) + (avg_confidence * 0.4))))

    explicit_tier = audit.get('exposureLevel')
    if explicit_tier:
        tier = f"{explicit_tier} Exposure" if not explicit_tier.endswith('Exposure') else explicit_tier
    else:
        tier = "High Exposure" if score >= 80 else "Moderate Exposure" if score >= 50 else "Low Exposure"

    return score, avg_confidence, tier, findings

def build_pdf(data_json_path, pdf_path):
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
    )
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

    with open(data_json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    user = data.get('user', {})

    reddit_audit = data.get('redditAudit', {})
    github_audit = data.get('githubAudit', {})
    hackernews_audit = data.get('hackernewsAudit', {})
    stackoverflow_audit = data.get('stackoverflowAudit', {})

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle('DocTitle', parent=styles['Heading1'], fontSize=16, leading=20, textColor=colors.HexColor('#0f172a'), fontName='Helvetica-Bold')
    subtitle_style = ParagraphStyle('DocSubtitle', parent=styles['Normal'], fontSize=8.5, leading=12, textColor=colors.HexColor('#64748b'), fontName='Helvetica')
    h2_style = ParagraphStyle('SectionHeader', parent=styles['Heading2'], fontSize=11, leading=15, textColor=colors.HexColor('#0f172a'), fontName='Helvetica-Bold', spaceBefore=10, spaceAfter=4)
    body_style = ParagraphStyle('RepBody', parent=styles['Normal'], fontSize=8.5, leading=12, textColor=colors.HexColor('#334155'), fontName='Helvetica')
    finding_title = ParagraphStyle('FindingTitle', parent=styles['Normal'], fontSize=9.5, leading=13, textColor=colors.HexColor('#0f172a'), fontName='Helvetica-Bold')
    evidence_style = ParagraphStyle('EvidenceStyle', parent=styles['Normal'], fontSize=8, leading=11, textColor=colors.HexColor('#9a3412'), fontName='Courier')
    link_style = ParagraphStyle('LinkStyle', parent=styles['Normal'], fontSize=8.5, leading=12, textColor=colors.HexColor('#c2410c'), fontName='Helvetica-Bold')
    action_style = ParagraphStyle('ActionStyle', parent=styles['Normal'], fontSize=8, leading=11.5, textColor=colors.HexColor('#166534'), fontName='Helvetica')

    story = []

    # 1. Header Banner
    header_data = [
        [
            Paragraph("<b>WebLab Deanonymizer & Privacy Auditor</b><br/><font color='#64748b' size='8'>Executive Exposure & Identity Linkability Assessment</font>", title_style),
            Paragraph(f"<b>Audit Date:</b> {datetime.now().strftime('%b %d, %Y - %H:%M UTC')}<br/><b>Classification:</b> Confidential Self-Audit", subtitle_style)
        ]
    ]
    header_table = Table(header_data, colWidths=[360, 180])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (1,0), (1,0), 'RIGHT')
    ]))
    story.append(header_table)
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#ea580c'), spaceBefore=6, spaceAfter=10))

    # Clean Identity Banner (without confusing aggregate score box)
    user_disp = html.escape(user.get('name') or user.get('reddit_username') or user.get('github_username') or 'Anonymous User')
    rd_disp = f"u/{html.escape(user.get('reddit_username'))}" if user.get('reddit_username') else "Not Linked"
    gh_disp = f"@{html.escape(user.get('github_username'))}" if user.get('github_username') else "Not Linked"
    hn_disp = html.escape(user.get('hackernews_username') or "Not Linked")
    so_disp = html.escape(user.get('stackoverflow_username') or "Not Linked")

    identity_info = [
        [
            Paragraph(f"<b>Target Identity:</b> {user_disp} &nbsp;|&nbsp; <b>Status:</b> Verified Self-Audit<br/><font color='#64748b' size='7.5'>Connected Handles &mdash; Reddit: {rd_disp} &nbsp;|&nbsp; GitHub: {gh_disp} &nbsp;|&nbsp; Hacker News: {hn_disp} &nbsp;|&nbsp; Stack Overflow: {so_disp}</font>", body_style)
        ]
    ]
    identity_table = Table(identity_info, colWidths=[540])
    identity_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(identity_table)
    story.append(Spacer(1, 12))

    # Read metrics for each platform
    rd_score, rd_conf, rd_tier, rd_findings = extract_platform_metrics(reddit_audit)
    gh_score, gh_conf, gh_tier, gh_findings = extract_platform_metrics(github_audit)
    hn_score, hn_conf, hn_tier, hn_findings = extract_platform_metrics(hackernews_audit)
    so_score, so_conf, so_tier, so_findings = extract_platform_metrics(stackoverflow_audit)

    # 2. Segregated Platform Finding Sections
    platform_sections = [
        ("Reddit Audit Findings", rd_findings, rd_score, rd_conf, rd_tier),
        ("GitHub Developer Audit Findings", gh_findings, gh_score, gh_conf, gh_tier),
        ("Hacker News Audit Findings", hn_findings, hn_score, hn_conf, hn_tier),
        ("Stack Overflow Audit Findings", so_findings, so_score, so_conf, so_tier),
    ]

    total_findings = 0
    for title, findings, p_score, p_conf, p_tier in platform_sections:
        if not findings:
            continue
        total_findings += len(findings)
        p_color = '#e11d48' if p_score >= 80 else '#d97706' if p_score >= 50 else '#10b981'

        story.append(Paragraph(f"<b>{title}</b> &nbsp;<font size='7.5' color='{p_color}'><b>[{p_tier} &mdash; Score: {p_score}/100 | {p_conf}% Confidence | {len(findings)} Finding(s)]</b></font>", h2_style))
        story.append(HRFlowable(width="100%", thickness=0.8, color=colors.HexColor('#cbd5e1'), spaceBefore=2, spaceAfter=6))

        for idx, f in enumerate(findings, start=1):
            cat = html.escape(f.get('category', f.get('type', 'Exposure Finding')))
            sev = f.get('severity', 'Moderate')
            conf = round(float(f.get('confidence', f.get('confidenceScore', 65))))
            desc = html.escape(f.get('description', ''))
            evid = html.escape(f.get('evidenceSnippet', ''))
            remed = html.escape(f.get('remediation', ''))
            url = f.get('evidence_url') or f.get('url') or ''

            card_elements = []
            
            # Header line: #N Finding Name | Severity | Grounded Confidence
            sev_hex = '#991b1b' if sev == 'High' or sev == 'Critical' else '#92400e' if sev == 'Moderate' else '#1e40af'
            card_elements.append(Paragraph(
                f"<b>#{idx} {cat}</b> &nbsp;|&nbsp; <font color='{sev_hex}'><b>{sev} Severity</b></font> &nbsp;|&nbsp; <font color='#c2410c'><b>{conf}% Confidence</b></font>",
                finding_title
            ))
            card_elements.append(Spacer(1, 2))

            if desc:
                card_elements.append(Paragraph(desc, body_style))
                card_elements.append(Spacer(1, 2))

            if evid:
                card_elements.append(Paragraph(f"<b>Evidence:</b> {evid}", evidence_style))
                card_elements.append(Spacer(1, 2))

            # Clickable Redirection Link
            if url and (url.startswith('http://') or url.startswith('https://')):
                escaped_url = html.escape(url)
                card_elements.append(Paragraph(
                    f'<a href="{escaped_url}" color="#ea580c"><u><b>&gt;&gt; View Public Source Post / Thread Link &rarr;</b></u></a>',
                    link_style
                ))
                card_elements.append(Spacer(1, 2))

            if remed:
                card_elements.append(Paragraph(f"<b>Remediation:</b> {remed}", action_style))

            finding_table = Table([[card_elements]], colWidths=[540])
            finding_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#ffffff')),
                ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor('#e2e8f0')),
                ('LINELEFT', (0,0), (0,-1), 3.5, colors.HexColor('#ea580c')),
                ('TOPPADDING', (0,0), (-1,-1), 5),
                ('BOTTOMPADDING', (0,0), (-1,-1), 5),
                ('LEFTPADDING', (0,0), (-1,-1), 8),
                ('RIGHTPADDING', (0,0), (-1,-1), 8),
            ]))
            story.append(KeepTogether(finding_table))
            story.append(Spacer(1, 5))

        story.append(Spacer(1, 8))

    if total_findings == 0:
        story.append(Paragraph("<b>No public high-risk identity exposures discovered across scanned accounts.</b>", body_style))

    doc.build(story)
    return True

def generate_html_report(data_json_path, output_path):
    with open(data_json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    username = data.get('user', {}).get('name') or 'User'
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(f"<!DOCTYPE html><html><body><h1>Audit Report for {html.escape(username)}</h1></body></html>")

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python generate_report.py <data_json_path> <output_html_path> [output_pdf_path]")
        sys.exit(1)
    json_in = sys.argv[1]
    html_out = sys.argv[2]
    generate_html_report(json_in, html_out)

    if len(sys.argv) >= 4:
        pdf_out = sys.argv[3]
        build_pdf(json_in, pdf_out)
        print(f"PDF successfully built at {pdf_out}")
