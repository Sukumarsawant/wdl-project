/**
 * Privacy & Deanonymization Executive Report Generator
 * Generates a clean, self-contained, print-ready HTML & PDF report.
 */

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function findingConfidence(finding = {}) {
  const explicit = Number(finding.confidence ?? finding.confidenceScore);
  if (Number.isFinite(explicit)) return Math.max(0, Math.min(100, Math.round(explicit)));
  const severity = String(finding.severity || finding.riskLevel || '').toLowerCase();
  if (severity === 'high' || severity === 'critical') return 92;
  if (severity === 'moderate' || severity === 'medium') return 78;
  if (severity === 'low') return 65;
  return finding.evidenceSnippet || finding.fullText ? 70 : 50;
}

export function generateHtmlReport(data = {}) {
  const user = data.user || {};
  const redditAudit = data.redditAudit || {};
  const githubAudit = data.githubAudit || {};
  const hackernewsAudit = data.hackernewsAudit || {};
  const stackoverflowAudit = data.stackoverflowAudit || {};
  const conn = data.connectionStatus || {};

  const username = user.reddit_username ? `u/${user.reddit_username}` : (user.github_username ? `@${user.github_username}` : (user.name || 'Anonymous User'));
  const reportDate = new Date().toUTCString();

  // Calculate scores
  const rScore = conn.reddit?.connected && typeof redditAudit.score === 'number' ? redditAudit.score : null;
  const gScore = conn.github?.connected && typeof githubAudit.score === 'number' ? githubAudit.score : null;
  const hScore = conn.hackernews?.connected && typeof hackernewsAudit.score === 'number' ? hackernewsAudit.score : null;
  const soScore = conn.stackoverflow?.connected && typeof stackoverflowAudit.score === 'number' ? stackoverflowAudit.score : null;

  const validScores = [rScore, gScore, hScore, soScore].filter(s => s !== null);
  const overallScore = validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : (redditAudit.score || githubAudit.score || 50);

  let riskLevel = 'LOW RISK';
  let riskColor = '#10b981';
  let riskBg = '#ecfdf5';

  if (overallScore >= 80) {
    riskLevel = 'CRITICAL RISK';
    riskColor = '#e11d48';
    riskBg = '#fff1f2';
  } else if (overallScore >= 50) {
    riskLevel = 'MODERATE RISK';
    riskColor = '#f59e0b';
    riskBg = '#fffbeb';
  }

  // Compile Findings
  const allFindings = [];
  if (conn.reddit?.connected || redditAudit.findings) {
    (redditAudit.findings || []).forEach(f => allFindings.push({ ...f, platform: 'Reddit' }));
  }
  if (conn.github?.connected || githubAudit.findings) {
    (githubAudit.findings || []).forEach(f => allFindings.push({ ...f, platform: 'GitHub' }));
  }
  if (conn.hackernews?.connected || hackernewsAudit.findings) {
    (hackernewsAudit.findings || []).forEach(f => allFindings.push({ ...f, platform: 'Hacker News' }));
  }
  if (conn.stackoverflow?.connected || stackoverflowAudit.findings) {
    (stackoverflowAudit.findings || []).forEach(f => allFindings.push({ ...f, platform: 'Stack Overflow' }));
  }

  // Compile Profiles
  const redditPred = redditAudit.predictions || {};
  const githubPred = githubAudit.predictions || {};

  const findingsRows = allFindings.map((f, idx) => {
    const sev = f.severity || 'Moderate';
    const sevBg = sev === 'High' ? '#ffe4e6' : sev === 'Moderate' ? '#fef3c7' : '#e0e7ff';
    const sevColor = sev === 'High' ? '#9f1239' : sev === 'Moderate' ? '#92400e' : '#3730a3';
    const conf = `${findingConfidence(f)}%`;

    return `
      <div class="finding-card">
        <div class="finding-header">
          <div class="badge-group">
            <span class="idx-badge">#${idx + 1}</span>
            <span class="platform-badge platform-${f.platform.toLowerCase()}">${escapeHtml(f.platform)}</span>
            <span class="sev-badge" style="background: ${sevBg}; color: ${sevColor};">${escapeHtml(sev)}</span>
            <span class="conf-badge">${escapeHtml(conf)} Confidence</span>
          </div>
          <span class="source-tag">${escapeHtml(f.source || 'Audit Scanner')}</span>
        </div>
        <h4 class="finding-title">${escapeHtml(f.category || f.type || 'Identity Finding')}</h4>
        <p class="finding-desc">${escapeHtml(f.description || '')}</p>
        ${f.evidenceSnippet ? `<div class="evidence-box"><strong>Evidence Snippet:</strong> <code>${escapeHtml(f.evidenceSnippet)}</code></div>` : ''}
        ${f.remediation ? `<div class="remediation-box"><strong>Remediation Recommendation:</strong> ${escapeHtml(f.remediation)}</div>` : ''}
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy & Deanonymization Exposure Audit - ${escapeHtml(username)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');

    @page {
      size: A4;
      margin: 15mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      margin: 0;
      padding: 30px;
      font-size: 13px;
      line-height: 1.5;
    }

    .report-container {
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }

    .no-print-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #1e293b;
      color: #ffffff;
      padding: 12px 20px;
      border-radius: 10px;
      margin-bottom: 24px;
    }

    .btn-print {
      background: #f97316;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-print:hover {
      background: #ea580c;
    }

    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #f1f5f9;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }

    .brand-title {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .brand-pill {
      background: #fff7ed;
      color: #ea580c;
      border: 1px solid #fed7aa;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 9999px;
      font-weight: 700;
    }

    .meta-text {
      font-size: 11px;
      color: #64748b;
      margin-top: 4px;
      font-family: 'JetBrains Mono', monospace;
    }

    .user-info {
      text-align: right;
    }

    .user-name {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
    }

    .score-summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
      margin-bottom: 28px;
    }

    .score-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      text-align: center;
    }

    .score-card.main-score {
      background: ${riskBg};
      border-color: ${riskColor}40;
    }

    .score-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      margin-bottom: 8px;
    }

    .score-val {
      font-size: 32px;
      font-weight: 800;
      line-height: 1;
      margin-bottom: 4px;
    }

    .score-sub {
      font-size: 11px;
      font-weight: 700;
    }

    .section-title {
      font-size: 14px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #334155;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 8px;
      margin: 28px 0 16px 0;
    }

    .profile-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }

    .profile-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px;
    }

    .profile-card h4 {
      margin: 0 0 10px 0;
      font-size: 12px;
      font-weight: 700;
      color: #1e293b;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .profile-row {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      padding: 4px 0;
      border-bottom: 1px dashed #f1f5f9;
    }

    .profile-row:last-child {
      border-bottom: none;
    }

    .profile-lbl {
      color: #64748b;
      font-weight: 500;
    }

    .profile-val {
      color: #0f172a;
      font-weight: 600;
      font-family: 'JetBrains Mono', monospace;
    }

    .finding-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px;
      margin-bottom: 12px;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .finding-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .badge-group {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .idx-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      font-weight: 700;
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      color: #475569;
    }

    .platform-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .platform-reddit {
      background: #ffedd5;
      color: #c2410c;
    }

    .platform-github {
      background: #f1f5f9;
      color: #0f172a;
    }

    .sev-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .conf-badge {
      font-size: 10px;
      font-weight: 600;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 2px 6px;
      border-radius: 4px;
      color: #64748b;
    }

    .source-tag {
      font-size: 10px;
      font-family: 'JetBrains Mono', monospace;
      color: #94a3b8;
    }

    .finding-title {
      margin: 0 0 4px 0;
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }

    .finding-desc {
      margin: 0 0 8px 0;
      color: #475569;
      font-size: 12px;
    }

    .evidence-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 3px solid #f97316;
      border-radius: 4px;
      padding: 6px 10px;
      font-size: 11px;
      margin-bottom: 6px;
      color: #334155;
    }

    .evidence-box code {
      font-family: 'JetBrains Mono', monospace;
      color: #c2410c;
    }

    .remediation-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-left: 3px solid #16a34a;
      border-radius: 4px;
      padding: 6px 10px;
      font-size: 11px;
      color: #166534;
    }

    .footer {
      margin-top: 36px;
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #94a3b8;
      font-family: 'JetBrains Mono', monospace;
    }

    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .report-container {
        border: none;
        box-shadow: none;
        padding: 0;
      }
      .no-print-bar {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="no-print-bar">
      <div>
        <strong>Privacy Exposure Executive Report</strong> &bull; Print-ready format
      </div>
      <button class="btn-print" onclick="window.print()">Print / Save as PDF</button>
    </div>

    <div class="header-bar">
      <div>
        <div class="brand-title">
          <span>WDL Privacy Exposure Auditor</span>
          <span class="brand-pill">Executive Report</span>
        </div>
        <div class="meta-text">Generated: ${escapeHtml(reportDate)}</div>
      </div>
      <div class="user-info">
        <div class="user-name">${escapeHtml(username)}</div>
        <div class="meta-text">Independent OSINT Audit</div>
      </div>
    </div>

    <div class="score-summary-grid">
      <div class="score-card main-score">
        <div class="score-title">Aggregate Exposure</div>
        <div class="score-val" style="color: ${riskColor};">${overallScore}/100</div>
        <div class="score-sub" style="color: ${riskColor};">${riskLevel}</div>
      </div>
      <div class="score-card">
        <div class="score-title">Reddit Risk Score</div>
        <div class="score-val" style="color: #ea580c;">${rScore !== null ? `${rScore}/100` : 'N/A'}</div>
        <div class="score-sub" style="color: #64748b;">${conn.reddit?.connected ? 'Live Sync' : 'Not Linked'}</div>
      </div>
      <div class="score-card">
        <div class="score-title">GitHub Risk Score</div>
        <div class="score-val" style="color: #0f172a;">${gScore !== null ? `${gScore}/100` : 'N/A'}</div>
        <div class="score-sub" style="color: #64748b;">${conn.github?.connected ? 'Live Sync' : 'Not Linked'}</div>
      </div>
      <div class="score-card">
        <div class="score-title">Hacker News Risk Score</div>
        <div class="score-val" style="color: #f97316;">${hScore !== null ? `${hScore}/100` : 'N/A'}</div>
        <div class="score-sub" style="color: #64748b;">${conn.hackernews?.connected ? 'Live Sync' : 'Not Linked'}</div>
      </div>
    </div>

    <div class="section-title">Reconstructed Digital Profile</div>
    <div class="profile-grid">
      <div class="profile-card">
        <h4>Reddit Fingerprint</h4>
        <div class="profile-row">
          <span class="profile-lbl">Predicted Age:</span>
          <span class="profile-val">${escapeHtml(redditPred.age || 'Uncertain')}</span>
        </div>
        <div class="profile-row">
          <span class="profile-lbl">Predicted Gender:</span>
          <span class="profile-val">${escapeHtml(redditPred.gender || 'Uncertain')}</span>
        </div>
        <div class="profile-row">
          <span class="profile-lbl">Inferred Location:</span>
          <span class="profile-val">${escapeHtml(redditPred.location || 'Undetected')}</span>
        </div>
        <div class="profile-row">
          <span class="profile-lbl">Activity Subreddits:</span>
          <span class="profile-val">${(redditAudit.subreddits || []).slice(0, 3).join(', ') || 'N/A'}</span>
        </div>
      </div>

      <div class="profile-card">
        <h4>GitHub Fingerprint</h4>
        <div class="profile-row">
          <span class="profile-lbl">Harvested Email:</span>
          <span class="profile-val">${escapeHtml(githubPred.email || githubPred.inferredEmail || 'Private')}</span>
        </div>
        <div class="profile-row">
          <span class="profile-lbl">Commit Author Names:</span>
          <span class="profile-val">${(githubPred.authorNames || []).slice(0, 2).join(', ') || 'Private'}</span>
        </div>
        <div class="profile-row">
          <span class="profile-lbl">Academic Affiliation:</span>
          <span class="profile-val">${escapeHtml(githubPred.institution || 'None')}</span>
        </div>
        <div class="profile-row">
          <span class="profile-lbl">Observed Timezone:</span>
          <span class="profile-val">${escapeHtml(githubPred.timezone || 'UTC')}</span>
        </div>
      </div>
    </div>

    <div class="section-title">Deanonymization Findings (${allFindings.length})</div>
    ${findingsRows || '<p style="color:#64748b; font-style:italic;">No critical vulnerabilities detected across linked profiles.</p>'}

    <div class="footer">
      <span>WDL Privacy Exposure Auditor &bull; OSINT Intelligence</span>
      <span>Confidential Client Assessment</span>
    </div>
  </div>
</body>
</html>`;
}

