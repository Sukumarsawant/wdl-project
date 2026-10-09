import {
  getCurrentUser,
  updateUserHandles,
  saveGithubData,
  saveRedditData,
  getGithubData
} from '@/lib/db.js';
import { fetchGithubProfile } from '@/lib/collectors/github.js';
import { fetchRedditActivity } from '@/lib/collectors/reddit.js';
import { fetchHackerNewsActivity } from '@/lib/collectors/hackernews.js';
import { fetchStackOverflowActivity } from '@/lib/collectors/stackoverflow.js';
import { extractGithubAudit, extractRedditAudit, extractHackerNewsAudit, extractStackOverflowAudit } from '@/lib/engine/extractor.js';
import { normalizeArtifacts } from '@/lib/engine/normalize.js';
import { buildIdentityExposureGraph } from '@/lib/engine/correlator.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  let queryHandle = searchParams.get('handle') || searchParams.get('username') || searchParams.get('github');
  let queryReddit = searchParams.get('reddit');
  let queryHackerNews = searchParams.get('hn') || searchParams.get('hackernews');
  let queryStackOverflow = searchParams.get('stackoverflow') || searchParams.get('so');

  let user = getCurrentUser();

  if (queryHandle) {
    user = updateUserHandles(user ? user.id : 'usr_current', queryHandle, queryReddit || queryHandle, queryHackerNews || user?.hackernews_username || '', user?.stackoverflow_username || '');
  } else if (queryHackerNews) {
    user = updateUserHandles(user ? user.id : 'usr_current', user?.github_username || '', user?.reddit_username || '', queryHackerNews, user?.stackoverflow_username || '');
  } else if (queryStackOverflow) {
    user = updateUserHandles(user ? user.id : 'usr_current', user?.github_username || '', user?.reddit_username || '', user?.hackernews_username || '', queryStackOverflow);
  }

  if (!user) {
    return Response.json({
      authenticated: false,
      user: null,
      message: 'Please link your account first to run an audit.'
    }, { status: 401 });
  }

  const ghUsername = user.github_oauth_connected ? user.github_username : '';
  const rdUsername = user.reddit_username;
  const hnUsername = user.hackernews_username;
  const soUsername = user.stackoverflow_username;

  // 1. Fetch LIVE GitHub Profile & Repositories
  let liveGh = ghUsername ? await fetchGithubProfile(ghUsername) : null;
  if (!liveGh) {
    liveGh = getGithubData(user.id) || {
      username: ghUsername || 'unknown',
      name: ghUsername || 'User',
      avatar_url: ghUsername ? `https://github.com/${ghUsername}.png` : '',
      repos: []
    };
  } else {
    saveGithubData(user.id, liveGh);
  }

  // 2. Fetch LIVE Reddit Activity
  // Never reuse user-level Reddit cache for a different handle. An empty live
  // result must remain empty instead of showing a previous account's history.
  let liveRd = rdUsername ? await fetchRedditActivity(rdUsername, 100) : [];
  if (rdUsername && liveRd.length > 0) saveRedditData(user.id, liveRd);

  // 3. SEPARATE INDEPENDENT PLATFORM AUDITS
  const githubAudit = extractGithubAudit(liveGh);
  const redditAudit = extractRedditAudit(rdUsername ? liveRd : [], rdUsername || 'unknown');
  const liveHn = hnUsername ? await fetchHackerNewsActivity(hnUsername, 100) : [];
  const hackernewsAudit = extractHackerNewsAudit(liveHn, hnUsername || 'unknown');
  const stackoverflowData = soUsername ? await fetchStackOverflowActivity(soUsername, 100) : { profile: null, items: [] };
  const stackoverflowAudit = extractStackOverflowAudit(stackoverflowData, soUsername || 'unknown');
  const normalized = normalizeArtifacts({ reddit: liveRd, github: liveGh, hackernews: liveHn, stackoverflow: stackoverflowData.items, user });
  const allFindings = [
    ...(githubAudit.findings || []),
    ...(redditAudit.findings || []),
    ...(hackernewsAudit.findings || []),
    ...(stackoverflowAudit.findings || [])
  ];
  const identityLinks = buildIdentityExposureGraph(
    user,
    liveGh,
    liveRd,
    allFindings,
    liveHn
  );

  return Response.json({
    user: {
      id: user.id,
      name: liveGh.name || (ghUsername ? `@${ghUsername}` : `u/${rdUsername}`),
      github_username: ghUsername || '',
      reddit_username: rdUsername || '',
      hackernews_username: hnUsername || '',
      stackoverflow_username: soUsername || '',
      avatar_url: liveGh.avatar_url || (ghUsername ? `https://github.com/${ghUsername}.png` : 'https://www.redditstatic.com/avatars/defaults/v2/avatar_default_1.png'),
      email: liveGh.email || user.email || ''
    },
    connectionStatus: {
      github: { connected: Boolean(ghUsername), username: ghUsername || '', url: ghUsername ? `https://github.com/${ghUsername}` : '' },
      reddit: { connected: Boolean(rdUsername), username: rdUsername || '', url: rdUsername ? `https://www.reddit.com/user/${rdUsername}` : '' }
      ,hackernews: { connected: Boolean(hnUsername), username: hnUsername || '', url: hnUsername ? `https://news.ycombinator.com/user?id=${hnUsername}` : '' }
      ,stackoverflow: { connected: Boolean(soUsername), username: soUsername || '', url: soUsername ? `https://stackoverflow.com/users/${soUsername}` : '' }
    },
    githubAudit,
    redditAudit,
    hackernewsAudit,
    stackoverflowAudit,
    identityLinks,
    normalizedArtifacts: normalized,
    githubData: {
      profile: {
        name: liveGh.name || '',
        bio: liveGh.bio || '',
        location: liveGh.location || '',
        company: liveGh.company || '',
        website: liveGh.website || '',
        email: liveGh.email || ''
      },
      repos: liveGh.repos || []
    },
    redditData: liveRd
  });
}
