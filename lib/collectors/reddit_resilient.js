/**
 * Resilient Multi-Provider Reddit OSINT Collector
 * Tries PullPush API first, with automatic fallback to Arctic Shift
 */

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) WebLab-Privacy-Auditor/1.0';

export async function fetchRedditActivity(username, maxItems = 100) {
  let cleanUser = username
    .replace(/^https?:\/\//i, '')
    .replace(/^(?:www\.|old\.)?reddit\.com\/(?:u|user)\//i, '')
    .replace(/^(?:@|\/?u\/|user\/)/i, '')
    .split('/')[0]
    .trim();

  if (!cleanUser) return [];

  // Provider 1: PullPush API (High availability public archive)
  try {
    const commentsUrl = `https://api.pullpush.io/reddit/search/comment/?author=${encodeURIComponent(cleanUser)}&size=${Math.min(100, maxItems)}`;
    const postsUrl = `https://api.pullpush.io/reddit/search/submission/?author=${encodeURIComponent(cleanUser)}&size=25`;

    const [commentsRes, postsRes] = await Promise.all([
      fetch(commentsUrl, { headers: { 'User-Agent': USER_AGENT } }).catch(() => null),
      fetch(postsUrl, { headers: { 'User-Agent': USER_AGENT } }).catch(() => null)
    ]);

    const items = [];

    if (commentsRes && commentsRes.ok) {
      const cJson = await commentsRes.json();
      const comments = cJson.data || [];
      comments.forEach((c) => {
        if (c.body && c.body !== '[deleted]' && c.body !== '[removed]') {
          items.push({
            id: c.id,
            subreddit: c.subreddit || '',
            context: `r/${c.subreddit}`,
            title: c.link_title || '',
            body: c.body,
            createdUtc: c.created_utc,
            score: c.score || 0,
            author: c.author || cleanUser,
            permalink: c.permalink ? (c.permalink.startsWith('http') ? c.permalink : `https://reddit.com${c.permalink}`) : `https://reddit.com/r/${c.subreddit}`
          });
        }
      });
    }

    if (postsRes && postsRes.ok) {
      const pJson = await postsRes.json();
      const posts = pJson.data || [];
      posts.forEach((p) => {
        const body = [p.title, p.selftext, p.url].filter(Boolean).join('\n');
        if (body.trim()) {
          items.push({
            id: p.id,
            subreddit: p.subreddit || '',
            context: `r/${p.subreddit}`,
            title: p.title || '',
            body,
            createdUtc: p.created_utc,
            score: p.score || 0,
            author: p.author || cleanUser,
            permalink: p.permalink ? (p.permalink.startsWith('http') ? p.permalink : `https://reddit.com${p.permalink}`) : `https://reddit.com/r/${p.subreddit}`
          });
        }
      });
    }

    if (items.length > 0) {
      return Array.from(new Map(items.map((item) => [item.id, item])).values())
        .sort((a, b) => Number(b.createdUtc || 0) - Number(a.createdUtc || 0))
        .slice(0, Math.max(0, maxItems));
    }
  } catch (err) {
    console.warn(`PullPush fetch error for ${cleanUser}:`, err.message);
  }

  // Provider 2: Arctic Shift Fallback
  try {
    const commentsUrl = `https://arctic-shift.photon-reddit.com/api/comments/search?author=${encodeURIComponent(cleanUser)}&limit=100&sort=desc`;
    const postsUrl = `https://arctic-shift.photon-reddit.com/api/posts/search?author=${encodeURIComponent(cleanUser)}&limit=25&sort=desc`;

    const [commentsRes, postsRes] = await Promise.all([
      fetch(commentsUrl, { headers: { 'User-Agent': USER_AGENT } }).catch(() => null),
      fetch(postsUrl, { headers: { 'User-Agent': USER_AGENT } }).catch(() => null)
    ]);

    const items = [];
    if (commentsRes && commentsRes.ok) {
      const cJson = await commentsRes.json();
      (cJson.data || []).forEach((c) => {
        if (c.body && c.body !== '[deleted]' && c.body !== '[removed]') {
          items.push({
            id: c.id,
            subreddit: c.subreddit || '',
            context: `r/${c.subreddit}`,
            title: c.link_title || '',
            body: c.body,
            createdUtc: c.created_utc,
            score: c.score || 0,
            author: c.author || cleanUser,
            permalink: `https://reddit.com${c.permalink}`
          });
        }
      });
    }

    return Array.from(new Map(items.map((item) => [item.id, item])).values())
      .sort((a, b) => Number(b.createdUtc || 0) - Number(a.createdUtc || 0))
      .slice(0, Math.max(0, maxItems));
  } catch (err) {
    console.warn(`Arctic Shift fallback error for ${cleanUser}:`, err.message);
    return [];
  }
}

