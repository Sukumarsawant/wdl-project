import { NextResponse } from 'next/server';
import { getCurrentUser, updateUserHandles, setGithubOAuthConnected } from '@/lib/db.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  let returnTo = '/risk-report';
  try {
    const state = JSON.parse(Buffer.from(url.searchParams.get('state') || '', 'base64url').toString('utf8'));
    returnTo = state.returnTo || returnTo;
  } catch {}

  if (error || !code) return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error || 'github_access_denied')}`, request.url));

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET, code, redirect_uri: process.env.GITHUB_REDIRECT_URI || `${url.origin}/api/auth/github/callback` })
    });
    const token = await tokenRes.json();
    if (!token.access_token) throw new Error(token.error_description || 'GitHub token exchange failed');
    const profileRes = await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${token.access_token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'WebLab-Privacy-Auditor' } });
    if (!profileRes.ok) throw new Error('Failed to fetch GitHub profile');
    const profile = await profileRes.json();
    const current = getCurrentUser();
    const linkedUser = updateUserHandles(current?.id || 'usr_current', profile.login, current?.reddit_username || '', current?.hackernews_username || '', current?.stackoverflow_username || '');
    setGithubOAuthConnected(linkedUser.id, true);
    return NextResponse.redirect(new URL(returnTo, request.url));
  } catch (err) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(err.message)}`, request.url));
  }
}
