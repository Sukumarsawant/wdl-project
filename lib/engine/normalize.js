/**
 * Non-breaking common artifact schema used by the cross-platform analyzer.
 * Collectors can keep their native response shapes; correlation consumes this.
 */
export function normalizeArtifacts({ reddit = [], github = {}, hackernews = [], stackoverflow = [], user = {} } = {}) {
  const artifacts = [];
  const add = (platform, item) => {
    const body = String(item.body || item.content || item.text || item.comment || item.title || '').trim();
    if (!body) return;
    const timestamp = item.createdUtc ?? item.createdAt ?? item.created_at ?? item.timestamp;
    const createdUtc = typeof timestamp === 'number' ? timestamp : timestamp ? Math.floor(new Date(timestamp).getTime() / 1000) : undefined;
    artifacts.push({
      platform,
      id: String(item.id || item.objectID || `${platform}-${artifacts.length + 1}`),
      kind: item.type === 'story' || item.type === 'post' ? 'post' : 'comment',
      context: item.context || item.subreddit || item.repo || item.title || '',
      title: item.title || '',
      body,
      createdUtc,
      permalink: item.permalink || item.url || item.html_url || ''
    });
  };

  reddit.forEach((item) => add('reddit', item));
  hackernews.forEach((item) => add('hackernews', item));
  stackoverflow.forEach((item) => add('stackoverflow', item));
  (github.events || []).forEach((item) => add('github', { ...item, body: item.comment || item.message || item.repo || '' }));

  return {
    artifacts,
    profiles: [
      user.reddit_username && { platform: 'reddit', username: user.reddit_username, profileUrl: `https://www.reddit.com/user/${user.reddit_username}` },
      user.github_username && { platform: 'github', username: user.github_username, profileUrl: `https://github.com/${user.github_username}` },
      user.hackernews_username && { platform: 'hackernews', username: user.hackernews_username, profileUrl: `https://news.ycombinator.com/user?id=${user.hackernews_username}` }
      ,user.stackoverflow_username && { platform: 'stackoverflow', username: user.stackoverflow_username, profileUrl: `https://stackoverflow.com/users/${user.stackoverflow_username}` }
    ].filter(Boolean)
  };
}
