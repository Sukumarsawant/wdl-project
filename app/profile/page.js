'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hn, setHn] = useState('');
  const [reddit, setReddit] = useState('');
  const [so, setSo] = useState('');

  useEffect(() => {
    fetch('/api/auth').then((res) => res.json()).then((data) => setUser(data.user || null)).finally(() => setLoading(false));
  }, []);

  const refresh = () => fetch('/api/auth').then((res) => res.json()).then((data) => setUser(data.user || null));
  const disconnect = async (platform) => {
    await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'disconnect', platform }) });
    refresh();
  };
  const saveHackerNews = async () => {
    if (!hn.trim()) return;
    await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_platform', platform: 'hackernews', username: hn.trim() }) });
    setHn('');
    refresh();
  };
  const saveReddit = async () => {
    if (!reddit.trim()) return;
    await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_platform', platform: 'reddit', username: reddit.trim() }) });
    setReddit('');
    refresh();
  };
  const saveStackOverflow = async () => {
    if (!so.trim()) return;
    await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_platform', platform: 'stackoverflow', username: so.trim() }) });
    setSo('');
    refresh();
  };

  const signOut = async () => {
    await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) });
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pt-20">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand-orange">Account</p>
          <h1 className="text-3xl font-extrabold mt-2">Profile</h1>
          {loading ? <p className="text-slate-500 mt-4">Loading profile...</p> : !user ? (
            <div className="mt-6"><p className="text-slate-600">No account connected.</p><Link href="/login" className="inline-flex mt-4 px-5 py-3 rounded-full bg-brand-orange text-white font-extrabold text-sm">Connect an account</Link></div>
          ) : (
            <>
              <p className="text-slate-500 text-sm mt-2">Manage each platform independently. Signing out removes the local session.</p>
              <div className="grid gap-3 mt-6">
                <div className="rounded-2xl border border-slate-200 p-4 flex items-center justify-between gap-3"><div><span className="font-bold">Reddit</span><div className="font-mono text-sm text-slate-600">{user.reddit_username ? `u/${user.reddit_username}` : 'Not connected'}</div></div>{user.reddit_username ? <button onClick={() => disconnect('reddit')} className="text-xs font-bold text-rose-600">Disconnect</button> : <div className="flex gap-2"><input value={reddit} onChange={(e) => setReddit(e.target.value)} placeholder="username" className="w-28 rounded-lg border border-slate-300 px-2 py-1 text-xs" /><button onClick={saveReddit} className="text-xs font-bold text-brand-orange">Connect</button></div>}</div>
                <div className="rounded-2xl border border-slate-200 p-4 flex items-center justify-between gap-3"><div><span className="font-bold">GitHub</span><div className="font-mono text-sm text-slate-600">{user.github_username ? `@${user.github_username}` : 'Not connected'}</div></div>{user.github_username ? <button onClick={() => disconnect('github')} className="text-xs font-bold text-rose-600">Disconnect</button> : <a href="/api/auth/github?returnTo=%2Fprofile" className="text-xs font-bold text-brand-orange">Connect GitHub</a>}</div>
                <div className="rounded-2xl border border-slate-200 p-4 flex items-center justify-between gap-3"><div><span className="font-bold">Hacker News</span><div className="font-mono text-sm text-slate-600">{user.hackernews_username || 'Not connected'}</div></div>{user.hackernews_username ? <button onClick={() => disconnect('hackernews')} className="text-xs font-bold text-rose-600">Disconnect</button> : <div className="flex gap-2"><input value={hn} onChange={(e) => setHn(e.target.value)} placeholder="username" className="w-28 rounded-lg border border-slate-300 px-2 py-1 text-xs" /><button onClick={saveHackerNews} className="text-xs font-bold text-brand-orange">Connect</button></div>}</div>
                <div className="rounded-2xl border border-slate-200 p-4 flex items-center justify-between gap-3"><div><span className="font-bold">Stack Overflow</span><div className="font-mono text-sm text-slate-600">{user.stackoverflow_username || 'Not connected'}</div></div>{user.stackoverflow_username ? <button onClick={() => disconnect('stackoverflow')} className="text-xs font-bold text-rose-600">Disconnect</button> : <div className="flex gap-2"><input value={so} onChange={(e) => setSo(e.target.value)} placeholder="user ID or URL" className="w-28 rounded-lg border border-slate-300 px-2 py-1 text-xs" /><button onClick={saveStackOverflow} className="text-xs font-bold text-brand-orange">Connect</button></div>}</div>
              </div>
              <div className="flex flex-wrap gap-3 mt-6"><Link href="/risk-report" className="px-5 py-3 rounded-full bg-brand-orange text-white font-extrabold text-sm">Open Risk Report</Link><Link href="/login" className="px-5 py-3 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold text-sm">Manage Connections</Link><button onClick={signOut} className="px-5 py-3 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-bold text-sm">Sign Out</button></div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
