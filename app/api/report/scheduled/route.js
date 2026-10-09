import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { getCurrentUser, getGithubData, getRedditData } from '@/lib/db.js';
import { fetchGithubProfile } from '@/lib/collectors/github.js';
import { fetchRedditActivity } from '@/lib/collectors/reddit.js';
import { fetchHackerNewsActivity } from '@/lib/collectors/hackernews.js';
import { fetchStackOverflowActivity } from '@/lib/collectors/stackoverflow.js';
import { extractGithubAudit, extractRedditAudit, extractHackerNewsAudit, extractStackOverflowAudit } from '@/lib/engine/extractor.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  if (!process.env.SCHEDULED_REPORT_SECRET || request.headers.get('x-audit-secret') !== process.env.SCHEDULED_REPORT_SECRET) {
    return Response.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }
  const user = getCurrentUser();
  if (!user) return Response.json({ success: false, error: 'No active user session.' }, { status: 404 });

  const gh = user.github_username ? (await fetchGithubProfile(user.github_username)) || getGithubData(user.id) || {} : {};
  const rd = user.reddit_username ? await fetchRedditActivity(user.reddit_username, 100) : getRedditData(user.id) || [];
  const hn = user.hackernews_username ? await fetchHackerNewsActivity(user.hackernews_username, 100) : [];
  const so = user.stackoverflow_username ? await fetchStackOverflowActivity(user.stackoverflow_username, 100) : { profile: null, items: [] };
  const reportData = {
    user: { ...user },
    connectionStatus: {
      github: { connected: Boolean(user.github_username) },
      reddit: { connected: Boolean(user.reddit_username) },
      hackernews: { connected: Boolean(user.hackernews_username) },
      stackoverflow: { connected: Boolean(user.stackoverflow_username) }
    },
    githubAudit: extractGithubAudit(gh || {}),
    redditAudit: extractRedditAudit(rd, user.reddit_username || 'unknown'),
    hackernewsAudit: extractHackerNewsAudit(hn, user.hackernews_username || 'unknown'),
    stackoverflowAudit: extractStackOverflowAudit(so, user.stackoverflow_username || 'unknown')
  };

  const id = `scheduled_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const jsonPath = path.join(os.tmpdir(), `${id}.json`);
  const htmlPath = path.join(os.tmpdir(), `${id}.html`);
  const pdfPath = path.join(os.tmpdir(), `${id}.pdf`);
  try {
    fs.writeFileSync(jsonPath, JSON.stringify(reportData), 'utf8');
    await new Promise((resolve, reject) => exec(`python "${path.join(process.cwd(), 'scripts', 'generate_report.py')}" "${jsonPath}" "${htmlPath}" "${pdfPath}"`, (error, _, stderr) => error ? reject(new Error(stderr || error.message)) : resolve()));
    if (!fs.existsSync(pdfPath) || fs.statSync(pdfPath).size === 0) throw new Error('PDF generation failed.');
    const username = user.reddit_username || user.github_username || user.hackernews_username || user.stackoverflow_username || 'user';
    return new Response(fs.readFileSync(pdfPath), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="privacy_audit_report_${username}.pdf"`, 'X-Report-Email': user.email || '' } });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    [jsonPath, htmlPath, pdfPath].forEach((file) => { try { if (fs.existsSync(file)) fs.unlinkSync(file); } catch {} });
  }
}
