'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import GithubIcon from '@/components/GithubIcon';
import { Shield, ArrowRight, CheckCircle2, LogOut, UserCheck, RefreshCw, AlertCircle } from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');

  const [githubUsername, setGithubUsername] = useState('');
  const [redditUsername, setRedditUsername] = useState('');
  const [hackernewsUsername, setHackernewsUsername] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(errorParam || '');

  const checkAuthStatus = async () => {
    try {
      const res = await fetch('/api/auth');
      const data = await res.json();
      setAuthenticated(Boolean(data.authenticated && data.user));
      if (data.authenticated && data.user) {
        setUser(data.user);
        setGithubUsername(data.user.github_username || '');
        setRedditUsername(data.user.reddit_username || '');
        setHackernewsUsername(data.user.hackernews_username || '');
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Auth check error:', err);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!githubUsername.trim() && !redditUsername.trim() && !hackernewsUsername.trim()) {
      setError('Please enter a Reddit or GitHub handle.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          github_username: githubUsername.trim(),
          reddit_username: redditUsername.trim()
          ,hackernews_username: hackernewsUsername.trim()
        })
      });
      const data = await res.json();
      if (data.success && data.user) {
        setAuthenticated(true);
        setUser(data.user);
        router.push('/risk-report');
      } else {
        setError(data.error || 'Failed to authenticate');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' })
      });
      const data = await res.json();
      if (data.success) {
        setAuthenticated(false);
        setUser(null);
        setGithubUsername('');
        setRedditUsername('');
        setHackernewsUsername('');
        window.location.href = '/login';
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-brand-orange/20 selection:text-brand-orange pt-20">
      <Navbar />

      <main className="flex-grow flex items-center justify-center p-6 py-16">
        <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-xl relative overflow-hidden">
          <div className="text-center">
            <div className="w-16 h-16 bg-orange-50 border border-orange-200 rounded-2xl flex items-center justify-center mx-auto mb-4 text-brand-orange shadow-md">
              <Shield className="w-8 h-8 text-brand-orange" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {authenticated && user ? 'Linked Account Settings' : 'Sign In with Reddit'}
            </h1>
            <p className="text-slate-600 text-sm mt-2 font-medium">
              Authenticate via Reddit to prove ownership before self-auditing your exposure.
            </p>
          </div>

          {error && (
            <div className="mt-4 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-xs text-red-700 font-medium">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {authenticated && user ? (
            /* Signed In Active Session View */
            <div className="mt-8 space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-center gap-4">
                <img
                  src={user.avatar_url || 'https://www.redditstatic.com/avatars/defaults/v2/avatar_default_1.png'}
                  alt={user.name}
                  className="w-14 h-14 rounded-2xl border-2 border-brand-orange object-cover shadow-md"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-base text-slate-900">{user.name}</span>
                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 font-mono">
                      <UserCheck className="w-3 h-3" /> Signed In
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    {user.reddit_username && <span>Reddit: <strong className="text-slate-900">u/{user.reddit_username}</strong></span>}
                    {user.github_username && <span className="ml-2">GitHub: <strong className="text-slate-900">@{user.github_username}</strong></span>}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => router.push('/risk-report')}
                  className="w-full bg-brand-orange hover:bg-brand-orange-hover text-white font-extrabold py-4 px-6 rounded-full transition-all flex items-center justify-center gap-3 shadow-glow hover:shadow-glow-lg text-sm tracking-wide cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 animate-spin-slow" />
                  <span>Run Privacy Audit for Linked Accounts</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={handleSignOut}
                  disabled={loading}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 px-6 rounded-full transition-all flex items-center justify-center gap-2 text-sm border border-slate-200 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-slate-500" />
                  <span>Sign Out of Account</span>
                </button>
              </div>
            </div>
          ) : (
            /* Sign In Flow */
            <div className="mt-8 space-y-6">
              {/* Official Reddit Sign-In Button */}
              <a
                href="/api/auth/reddit"
                className="w-full bg-[#FF4500] hover:bg-[#E03D00] text-white font-extrabold py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-md hover:shadow-lg text-sm tracking-wide cursor-pointer"
              >
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.562-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.688-.562-1.249-1.25-1.249zm-4.566 3.868a.333.333 0 0 0-.04.468c.558.647 1.416 1.053 2.356 1.053.94 0 1.798-.406 2.356-1.053a.333.333 0 1 0-.505-.434c-.443.513-1.127.837-1.851.837-.724 0-1.408-.324-1.851-.837a.333.333 0 0 0-.465-.034z"/>
                </svg>
                <span className="font-extrabold text-base">Sign in with Reddit</span>
              </a>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 w-full"></div>
                <span className="bg-white px-3 text-xs font-mono font-bold text-slate-400 uppercase">or enter handle</span>
                <div className="border-t border-slate-200 w-full"></div>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Reddit Handle
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-slate-400 font-mono text-sm">u/</span>
                    <input
                      type="text"
                      value={redditUsername}
                      onChange={(e) => setRedditUsername(e.target.value)}
                      placeholder="e.g. your_reddit_username"
                      className="w-full py-3.5 pl-9 pr-4 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 font-mono font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-slate-700 uppercase tracking-wider mb-2">
                    GitHub Handle (Optional)
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-slate-400 font-mono text-sm">@</span>
                    <input
                      type="text"
                      value={githubUsername}
                      onChange={(e) => setGithubUsername(e.target.value)}
                      placeholder="e.g. octocat or your GitHub handle"
                      className="w-full py-3.5 pl-9 pr-4 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 font-mono font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Hacker News Handle (Optional)
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-slate-400 font-mono text-sm">@</span>
                    <input
                      type="text"
                      value={hackernewsUsername}
                      onChange={(e) => setHackernewsUsername(e.target.value)}
                      placeholder="e.g. dang"
                      className="w-full py-3.5 pl-9 pr-4 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 font-mono font-semibold"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs text-slate-600 font-medium">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Audits strictly check accounts linked by the authenticated owner.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Public comments & posts are fetched via Arctic Shift API.</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-orange hover:bg-brand-orange-hover text-white font-extrabold py-4 px-6 rounded-full transition-all flex items-center justify-center gap-3 shadow-glow hover:shadow-glow-lg text-sm tracking-wide cursor-pointer"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Start Self-Audit</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          <p className="text-[11px] text-slate-500 text-center mt-6 font-medium">
            Deanonymizer privacy audit complies with user consent requirements.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

