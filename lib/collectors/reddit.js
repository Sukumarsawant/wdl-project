/**
 * Reddit OSINT Collector
 * Fetches public posts & comments via Arctic Shift API
 */

const BASE = 'https://arctic-shift.photon-reddit.com/api';
const PAGE = 100;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) WebLab-Privacy-Auditor/1.0';

export async function fetchRedditActivity(username, maxItems = 100) {
  let cleanUser = username
    .replace(/^https?:\/\//i, '')
    .replace(/^(?:www\.|old\.)?reddit\.com\/(?:u|user)\//i, '')
    .replace(/^(?:@|\/?u\/|user\/)/i, '')
    .split('/')[0]
    .trim();

  try {
    const commentsUrl = `${BASE}/comments/search?author=${encodeURIComponent(cleanUser)}&limit=${PAGE}&sort=desc`;
    const postsUrl = `${BASE}/posts/search?author=${encodeURIComponent(cleanUser)}&limit=25&sort=desc`;

    const [commentsRes, postsRes] = await Promise.all([
      fetch(commentsUrl, { headers: { 'User-Agent': USER_AGENT } }),
      fetch(postsUrl, { headers: { 'User-Agent': USER_AGENT } })
    ]);

    const items = [];

    if (commentsRes.ok) {
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
            permalink: `https://reddit.com${c.permalink}`
          });
        }
      });
    }

    if (postsRes.ok) {
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
            permalink: `https://reddit.com${p.permalink}`
          });
        }
      });
    }

    return Array.from(new Map(items.map((item) => [item.id, item])).values())
      .sort((a, b) => Number(b.createdUtc || 0) - Number(a.createdUtc || 0))
      .slice(0, Math.max(0, maxItems));
  } catch (err) {
    console.warn(`Reddit collector fetch warning for ${cleanUser}:`, err.message);
    return [];
  }
}
