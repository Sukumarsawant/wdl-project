import { getCurrentUser, updateUserHandles, clearSession } from '@/lib/db.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const user = getCurrentUser();
  const visibleUser = user ? { ...user, github_username: user.github_oauth_connected ? user.github_username : '' } : null;
  return Response.json({
    authenticated: Boolean(visibleUser),
    user: visibleUser
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const action = body.action || 'login';

    if (action === 'logout') {
      clearSession();
      return Response.json({
        success: true,
        authenticated: false,
        user: null
      });
    }

    if (action === 'disconnect' || action === 'update_platform') {
      const current = getCurrentUser();
      if (!current) return Response.json({ success: false, error: 'No active session.' }, { status: 401 });
      const platform = body.platform;
      if (!['github', 'reddit', 'hackernews', 'stackoverflow'].includes(platform)) return Response.json({ success: false, error: 'Unsupported platform.' }, { status: 400 });
      const value = action === 'disconnect' ? '' : String(body.username || '').trim();
      const handles = {
        github: current.github_username || '',
        reddit: current.reddit_username || '',
        hackernews: current.hackernews_username || '',
        stackoverflow: current.stackoverflow_username || ''
      };
      handles[platform] = value;
      const user = updateUserHandles(current.id, handles.github, handles.reddit, handles.hackernews, handles.stackoverflow);
      if (platform === 'github' && action === 'disconnect') {
        const { setGithubOAuthConnected } = await import('@/lib/db.js');
        setGithubOAuthConnected(user.id, false);
      }
      return Response.json({ success: true, authenticated: true, user });
    }

    const githubUsername = (body.github_username || '').trim();
    const redditUsername = (body.reddit_username || '').trim();
    const hackernewsUsername = (body.hackernews_username || '').trim();
    const stackoverflowUsername = (body.stackoverflow_username || '').trim();

    if (!githubUsername && !redditUsername && !hackernewsUsername && !stackoverflowUsername) {
      return Response.json({
        success: false,
        error: 'Please enter a GitHub or Reddit handle.'
      }, { status: 400 });
    }

    const user = updateUserHandles('usr_current', githubUsername, redditUsername, hackernewsUsername, stackoverflowUsername);

    return Response.json({
      success: true,
      authenticated: true,
      user
    });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
