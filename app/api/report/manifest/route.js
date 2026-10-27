import { getCurrentUser, getGithubData, getRedditData } from '@/lib/db.js';
import { fetchGithubProfile } from '@/lib/collectors/github.js';
import { fetchRedditActivity } from '@/lib/collectors/reddit.js';
import { fetchHackerNewsActivity } from '@/lib/collectors/hackernews.js';
import { fetchStackOverflowActivity } from '@/lib/collectors/stackoverflow.js';
import { extractGithubAudit, extractRedditAudit, extractHackerNewsAudit, extractStackOverflowAudit } from '@/lib/engine/extractor.js';
import { calculateFindingConfidence } from '@/lib/engine/confidence.js';

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

  const rawFindings = [
    ...(extractGithubAudit(gh || {}).findings || []),
    ...(extractRedditAudit(rd, user.reddit_username || 'unknown').findings || []),
    ...(extractHackerNewsAudit(hn, user.hackernews_username || 'unknown').findings || []),
    ...(extractStackOverflowAudit(so, user.stackoverflow_username || 'unknown').findings || [])
  ];

  const actionItems = rawFindings.map((f, idx) => {
    const conf = calculateFindingConfidence(f, f.evidenceCount || 1);
    const platform = f.source ? f.source.split(' ')[0] : 'Web';
    let agentInstructions = {
      task: `Remediate ${f.category || 'Disclosed identity marker'}`,
      action: f.remediation || 'Remove public identifier'
    };

    if (f.category?.toLowerCase().includes('commit')) {
      agentInstructions = {
        task: 'Rewrite git commit history to scrub email/name exposure',
        command: `git filter-repo --email-callback 'return email.replace(b"${f.value}", b"noreply@users.github.com")' --force`
      };
    } else if (f.category?.toLowerCase().includes('email')) {
      agentInstructions = {
        task: 'Scrub plain-text or mangled email from public comment',
        url: f.evidence_url || '',
        action: 'Delete or edit comment containing contact info'
      };
    }

    return {
      finding_id: `FINDING-${String(idx + 1).padStart(3, '0')}`,
      platform,
      category: f.category || f.type || 'Identity Finding',
      severity: f.severity || 'Moderate',
      confidence: conf.confidence,
      confidence_breakdown: conf.breakdown,
      exposed_value: f.value || '',
      evidence: f.evidenceSnippet || '',
      evidence_url: f.evidence_url || '',
      agent_instructions: agentInstructions
    };
  });

  const manifest = {
    schema_version: '1.0.0',
    target_identity: user.name || user.reddit_username || user.github_username || 'user',
    generated_at: new Date().toISOString(),
    total_findings: actionItems.length,
    action_items: actionItems
  };

  const username = user.reddit_username || user.github_username || 'user';
  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="remediation_manifest_${username}.json"`
    }
  });
}

