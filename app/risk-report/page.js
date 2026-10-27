'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import GithubIcon from '@/components/GithubIcon';
import {
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
  MapPin,
  Code,
  UserCheck,
  RefreshCw,
  Globe,
  Layers,
  Activity,
  Copy,
  Check,
  X,
  Download,
  FileText,
  Trash2,
  Edit3,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

// Gemini AI Sparkle Icon
const GeminiSparkleIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
      fill="url(#gemini-gradient)"
    />
    <defs>
      <linearGradient id="gemini-gradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ff5722" />
        <stop offset="0.5" stopColor="#ff8a65" />
        <stop offset="1" stopColor="#ffab91" />
      </linearGradient>
    </defs>
  </svg>
);

function getFindingConfidence(finding = {}) {
  const explicit = Number(finding.confidence ?? finding.confidenceScore);
  if (Number.isFinite(explicit) && explicit > 0) return Math.max(20, Math.min(99, Math.round(explicit)));

  // Grounded formula approximation fallback for legacy cache records
  const type = String(finding.type || '').toLowerCase();
  const cat = String(finding.category || '').toLowerCase();
  const val = String(finding.value || '');
  let score = 40;
  if (type.includes('contact') || cat.includes('email') || /@/.test(val)) score = 75;
  else if (type.includes('handle') || cat.includes('username')) score = 65;
  else if (type.includes('identity')) score = 55;
  else if (type.includes('location')) score = 45;
  return Math.max(20, Math.min(99, score));
}

export default function RiskReportPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('reddit'); // 'github' | 'reddit' | 'hackernews' | 'stackoverflow'
  const [hackerNewsHandle, setHackerNewsHandle] = useState('');
  const [stackoverflowHandle, setStackoverflowHandle] = useState('');

  // AI Remediation Modal State
  const [activeSanitizeModal, setActiveSanitizeModal] = useState(false);
  const [originalSnippet, setOriginalSnippet] = useState('');
  const [sanitizedSnippet, setSanitizedSnippet] = useState('');
  const [sanitizeResult, setSanitizeResult] = useState(null);
  const [sanitizing, setSanitizing] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchAuditData = async (forceRefresh = false, handleOverride = '') => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const params = new URLSearchParams();
      if (forceRefresh) params.set('refresh', 'true');
      if (handleOverride.trim()) params.set(selectedPlatform === 'stackoverflow' ? 'stackoverflow' : 'hn', handleOverride.trim());
      const url = `/api/audit${params.toString() ? `?${params}` : ''}`;
      const res = await fetch(url);
      if (res.status === 401) {
        setData({ unauthenticated: true });
        return;
      }
      const json = await res.json();
      if (!json.user) {
        setData({ unauthenticated: true });
      } else {
        setData(json);
        if (json.connectionStatus?.reddit?.connected && !json.connectionStatus?.github?.connected) {
          setSelectedPlatform('reddit');
        } else if (json.connectionStatus?.github?.connected && !json.connectionStatus?.reddit?.connected) {
          setSelectedPlatform('github');
        } else if (json.connectionStatus?.hackernews?.connected && !json.connectionStatus?.github?.connected && !json.connectionStatus?.reddit?.connected && !json.connectionStatus?.stackoverflow?.connected) {
          setSelectedPlatform('hackernews');
        } else if (json.connectionStatus?.stackoverflow?.connected && !json.connectionStatus?.github?.connected && !json.connectionStatus?.reddit?.connected && !json.connectionStatus?.hackernews?.connected) {
          setSelectedPlatform('stackoverflow');
        }
      }
    } catch (err) {
      console.error('Failed to load audit data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAuditData(false);
  }, []);

  const handleOpenSanitizer = async (finding) => {
    const textToSanitize = typeof finding === 'string' ? finding : (finding.evidenceSnippet || finding.fullText || finding.description || '');
    const findingType = typeof finding === 'string' ? 'entity' : (finding.category || finding.type || 'entity');

    setOriginalSnippet(textToSanitize);
    setSanitizeResult(null);
    setActiveSanitizeModal(true);
    setSanitizing(true);
    setCopied(false);
    try {
      const res = await fetch('/api/sanitize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSanitize,
          type: findingType
        })
      });
      const resJson = await res.json();
      if (resJson.success) {
        setSanitizedSnippet(resJson.sanitized);
        setSanitizeResult(resJson);
      } else {
        setSanitizedSnippet(textToSanitize);
      }
    } catch (err) {
      setSanitizedSnippet(textToSanitize);
    } finally {
      setSanitizing(false);
    }
  };

  const handleCopySanitized = () => {
    navigator.clipboard.writeText(sanitizedSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePlatformAccount = async (action) => {
    const platform = selectedPlatform;
    const label = platform === 'github' ? 'GitHub' : platform === 'reddit' ? 'Reddit' : platform === 'hackernews' ? 'Hacker News' : 'Stack Overflow';
    const username = action === 'disconnect' ? '' : window.prompt(`Enter new ${label} username`, connectionStatus?.[platform]?.username || '');
    if (action === 'update_platform' && !username?.trim()) return;
    const res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, platform, username: username?.trim() || '' }) });
    if (res.ok) fetchAuditData(false);
  };

  const handleDownloadReport = async () => {
    if (!data) return;
    setDownloading(true);
    try {
      const res = await fetch('/api/report/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, selectedPlatform })
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const username = data.user?.reddit_username || data.user?.github_username || 'user';
        const disposition = res.headers.get('content-disposition') || '';
        const serverFilename = disposition.match(/filename="?([^";]+)"?/i)?.[1];
        a.download = serverFilename || `privacy_audit_report_${username}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to generate report download. Please try again.');
      }
    } catch (e) {
      console.error('Download report error:', e);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between pt-20">
        <Navbar />
        <main className="flex-grow flex flex-col items-center justify-center p-8 text-center">
          <div className="relative flex items-center justify-center mb-6">
            <div className="w-16 h-16 border-4 border-orange-200 border-t-brand-orange rounded-full animate-spin"></div>
            <ShieldAlert className="w-8 h-8 text-brand-orange absolute" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Analyzing Independent Platform Footprints...</h2>
          <p className="text-slate-600 max-w-md text-sm font-medium">
            Fetching independent findings separately for GitHub and Reddit without cross-engine fusion...
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!data || data.unauthenticated || !data.user) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between pt-20">
        <Navbar />
        <main className="flex-grow flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-6 text-brand-orange">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">No Linked Account Found</h2>
          <p className="text-slate-600 max-w-md text-sm font-medium mb-6">
            Please link your verified GitHub or Reddit account to inspect your privacy exposure report.
          </p>
          <a
            href="/login"
            className="bg-brand-orange hover:bg-brand-orange-hover text-white font-extrabold px-8 py-3.5 rounded-full transition-all shadow-glow text-sm cursor-pointer"
          >
            Go to Account Linking
          </a>
        </main>
        <Footer />
      </div>
    );
  }

  const { user, connectionStatus, githubAudit, redditAudit, hackernewsAudit, stackoverflowAudit, identityLinks = [] } = data;
  const currentAudit = selectedPlatform === 'github' ? (githubAudit || {}) : selectedPlatform === 'hackernews' ? (hackernewsAudit || {}) : selectedPlatform === 'stackoverflow' ? (stackoverflowAudit || {}) : (redditAudit || {});
  const isPlatformConnected = Boolean(connectionStatus?.[selectedPlatform]?.connected);
  const confidenceScore = Number.isFinite(Number(currentAudit.confidenceScore)) && Number(currentAudit.confidenceScore) > 0
    ? Math.round(Number(currentAudit.confidenceScore))
    : (currentAudit.findings?.length
      ? Math.round(currentAudit.findings.reduce((sum, finding) => sum + getFindingConfidence(finding), 0) / currentAudit.findings.length)
      : 0);

  // Exact 100% 1-to-1 alignment between score/confidence and exposure level badge:
  // >= 80: High Exposure
  // 50-79: Moderate Exposure
  // < 50: Low Exposure
  const metricForTier = Number(currentAudit.score || confidenceScore);
  const exposureLevel = !isPlatformConnected || currentAudit.findings?.length === 0
    ? null 
    : (metricForTier >= 80 ? 'High' : metricForTier >= 50 ? 'Moderate' : 'Low');
  const activeAvatar = user.avatar_url || (user.reddit_username ? 'https://www.redditstatic.com/avatars/defaults/v2/avatar_default_1.png' : user.github_username ? `https://github.com/${user.github_username}.png` : 'https://www.redditstatic.com/avatars/defaults/v2/avatar_default_1.png');

  if (!isPlatformConnected && !connectionStatus?.github?.connected && !connectionStatus?.reddit?.connected && !connectionStatus?.hackernews?.connected && !connectionStatus?.stackoverflow?.connected) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 pt-20"><Navbar /><main className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="bg-white border border-slate-200 rounded-3xl p-10 shadow-sm"><UserCheck className="w-12 h-12 text-brand-orange mx-auto mb-4" /><h1 className="text-2xl font-extrabold">No platform connected</h1><p className="text-sm text-slate-500 mt-2">Connect Reddit or GitHub, or add a Hacker News username to start an audit.</p><a href="/login" className="inline-flex mt-6 px-6 py-3 rounded-full bg-brand-orange text-white font-extrabold text-sm">Open Profile</a></div>
      </main><Footer /></div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pt-20 selection:bg-brand-orange/20 selection:text-brand-orange">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Header Bar */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src={activeAvatar}
              alt={user.name || 'User Avatar'}
              className="w-16 h-16 rounded-2xl border-2 border-brand-orange object-cover shadow-md bg-orange-50"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {user.reddit_username ? `u/${user.reddit_username}` : (user.github_username ? `@${user.github_username}` : (user.name || 'Anonymous User'))}
                </h1>
                <span className="bg-orange-50 text-orange-700 text-xs font-bold px-3 py-1 rounded-full border border-orange-200 flex items-center gap-1 font-mono">
                  <UserCheck className="w-3.5 h-3.5 text-brand-orange" />
                  Authenticated User
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-600 mt-1 font-medium font-mono">
                {user.reddit_username && (
                  <a
                    href={`https://www.reddit.com/user/${user.reddit_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-600 hover:text-orange-800 font-bold hover:underline flex items-center gap-1"
                  >
                    u/{user.reddit_username}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {user.github_username && (
                  <a
                    href={`https://github.com/${user.github_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-700 hover:text-slate-900 font-bold hover:underline flex items-center gap-1"
                  >
                    @{user.github_username}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons: Download Report & Re-run Audit */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              id="btn-download-report-top"
              onClick={handleDownloadReport}
              disabled={downloading}
              className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-5 py-3 rounded-full transition-all flex items-center gap-2 shadow-sm text-xs tracking-wide cursor-pointer disabled:opacity-50"
            >
              {downloading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Download className="w-4 h-4 text-orange-400" />
              )}
              <span>{downloading ? 'Generating Report...' : 'Download Report'}</span>
            </button>
            <button
              onClick={() => fetchAuditData(true)}
              disabled={refreshing}
              className="bg-brand-orange hover:bg-brand-orange-hover text-white font-extrabold px-6 py-3 rounded-full transition-all flex items-center gap-2 shadow-glow hover:shadow-glow-lg text-xs tracking-wide cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Re-Run Live Audit'}</span>
            </button>
          </div>
        </div>

        {/* --- INDEPENDENT PLATFORM SELECTOR TABS --- */}
        <div className="flex justify-center max-w-full overflow-x-auto pb-1">
          <div className="bg-slate-200/80 p-1.5 rounded-full border border-slate-300 inline-flex flex-nowrap items-center gap-2 shadow-inner min-w-max">
            <button
              onClick={() => setSelectedPlatform('github')}
              className={`shrink-0 px-4 sm:px-8 py-3.5 rounded-full text-sm font-extrabold transition-all flex items-center gap-2.5 cursor-pointer ${
                selectedPlatform === 'github'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <GithubIcon className="w-5 h-5 fill-current" />
              <span>GitHub Audit</span>
              {connectionStatus?.github?.connected && (
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-orange-300">
                  @{connectionStatus.github.username}
                </span>
              )}
            </button>

            <button
              onClick={() => setSelectedPlatform('reddit')}
              className={`shrink-0 px-4 sm:px-8 py-3.5 rounded-full text-sm font-extrabold transition-all flex items-center gap-2.5 cursor-pointer ${
                selectedPlatform === 'reddit'
                  ? 'bg-brand-orange text-white shadow-glow font-black'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24">
                <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701z" />
              </svg>
              <span>Reddit Audit</span>
              {connectionStatus?.reddit?.connected && (
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-orange-700 text-white">
                  u/{connectionStatus.reddit.username}
                </span>
              )}
            </button>
            <button
              onClick={() => setSelectedPlatform('hackernews')}
              className={`shrink-0 px-4 sm:px-8 py-3.5 rounded-full text-sm font-extrabold transition-all flex items-center gap-2.5 cursor-pointer ${selectedPlatform === 'hackernews' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-700 hover:text-slate-900'}`}
            >
              <span className="w-5 h-5 rounded bg-orange-500 text-white text-[10px] font-black flex items-center justify-center">Y</span>
              <span>Hacker News</span>
              {connectionStatus?.hackernews?.connected && <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-orange-700 text-white">{connectionStatus.hackernews.username}</span>}
            </button>
            <button
              onClick={() => setSelectedPlatform('stackoverflow')}
              className={`shrink-0 px-4 sm:px-8 py-3.5 rounded-full text-sm font-extrabold transition-all flex items-center gap-2.5 cursor-pointer ${selectedPlatform === 'stackoverflow' ? 'bg-amber-700 text-white shadow-md' : 'text-slate-700 hover:text-slate-900'}`}
            >
              <span className="w-5 h-5 rounded bg-amber-600 text-white text-[10px] font-black flex items-center justify-center">SO</span>
              <span>Stack Overflow</span>
              {connectionStatus?.stackoverflow?.connected && <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-800 text-white">{connectionStatus.stackoverflow.username}</span>}
            </button>
          </div>
        </div>

        {selectedPlatform === 'github' && !connectionStatus?.github?.connected && (
          <div className="bg-slate-900 rounded-3xl p-8 text-center shadow-lg">
            <GithubIcon className="w-10 h-10 fill-current text-white mx-auto mb-3" />
            <h3 className="text-xl font-extrabold text-white">Connect GitHub to run this audit</h3>
            <p className="text-sm text-slate-300 mt-2 max-w-xl mx-auto">
              GitHub is independent from Reddit. You can connect it now without signing out or replacing your Reddit connection.
            </p>
            <a
              href="/api/auth/github?returnTo=%2Frisk-report"
              className="inline-flex items-center gap-2 mt-5 px-6 py-3 rounded-full bg-white text-slate-900 font-extrabold text-sm hover:bg-orange-50 transition-colors"
            >
              <GithubIcon className="w-5 h-5 fill-current" />
              Connect GitHub
            </a>
          </div>
        )}

        {selectedPlatform === 'hackernews' && !connectionStatus?.hackernews?.connected && (
          <div className="bg-slate-900 rounded-3xl p-8 text-center shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white text-xl font-black flex items-center justify-center mx-auto mb-3">Y</div>
            <h3 className="text-xl font-extrabold text-white">Add your Hacker News username</h3>
            <p className="text-sm text-slate-300 mt-2">Hacker News uses public profile data, so no password or OAuth is required.</p>
            <form onSubmit={(event) => { event.preventDefault(); if (hackerNewsHandle.trim()) fetchAuditData(false, hackerNewsHandle); }} className="flex max-w-md mx-auto mt-5 gap-2">
              <input value={hackerNewsHandle} onChange={(event) => setHackerNewsHandle(event.target.value)} placeholder="e.g. dang" className="flex-1 rounded-full px-4 py-3 text-sm text-slate-900 bg-white border-2 border-orange-200 placeholder-slate-400 focus:outline-none focus:border-orange-500" />
              <button className="px-5 py-3 rounded-full bg-orange-500 text-white font-extrabold text-sm">Analyze</button>
            </form>
          </div>
        )}

        {selectedPlatform === 'stackoverflow' && !connectionStatus?.stackoverflow?.connected && (
          <div className="bg-slate-900 rounded-3xl p-8 text-center shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white text-xs font-black flex items-center justify-center mx-auto mb-3">SO</div>
            <h3 className="text-xl font-extrabold text-white">Add your Stack Overflow user ID</h3>
            <p className="text-sm text-slate-300 mt-2">Use the numeric ID from your Stack Overflow profile URL. No password or OAuth is required.</p>
            <form onSubmit={(event) => { event.preventDefault(); if (stackoverflowHandle.trim()) fetchAuditData(false, stackoverflowHandle); }} className="flex max-w-md mx-auto mt-5 gap-2">
              <input value={stackoverflowHandle} onChange={(event) => setStackoverflowHandle(event.target.value)} placeholder="e.g. 1234567 or profile URL" className="flex-1 rounded-full px-4 py-3 text-sm text-slate-900 bg-white border-2 border-amber-200 placeholder-slate-400 focus:outline-none focus:border-amber-500" />
              <button className="px-5 py-3 rounded-full bg-amber-600 text-white font-extrabold text-sm">Analyze</button>
            </form>
          </div>
        )}

        {connectionStatus?.[selectedPlatform]?.connected && (
          <div className="flex justify-center gap-2 -mt-4">
            <button onClick={() => handlePlatformAccount('update_platform')} className="text-xs font-bold text-slate-600 hover:text-brand-orange underline">Edit {selectedPlatform === 'hackernews' ? 'Hacker News' : selectedPlatform} username</button>
            <span className="text-slate-300">|</span>
            <button onClick={() => handlePlatformAccount('disconnect')} className="text-xs font-bold text-rose-600 hover:text-rose-800 underline">Disconnect only {selectedPlatform === 'hackernews' ? 'Hacker News' : selectedPlatform}</button>
          </div>
        )}

        {/* --- PLATFORM SPECIFIC AUDIT SCORE & PREDICTIONS --- */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <span className="text-xs font-mono font-bold uppercase text-brand-orange tracking-wider block">
                Independent Platform Scope
              </span>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1 flex items-center gap-3">
                {selectedPlatform === 'github' ? (
                  <>
                    <GithubIcon className="w-8 h-8 fill-current text-slate-900" />
                    GitHub Platform Audit
                  </>
                ) : (
                  <>
                    <svg className="w-8 h-8 fill-current text-orange-600" viewBox="0 0 24 24">
                      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701z" />
                    </svg>
                    {selectedPlatform === 'hackernews' ? 'Hacker News Platform Audit' : 'Reddit Platform Audit'}
                  </>
                )}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs font-mono font-bold text-slate-500 uppercase">Information Exposure</div>
                <div className="mt-1">
                  {exposureLevel === 'High' ? (
                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black uppercase font-mono bg-rose-100 text-rose-800 border border-rose-300 shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
                      High Exposure
                    </span>
                  ) : exposureLevel === 'Moderate' ? (
                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black uppercase font-mono bg-amber-100 text-amber-800 border border-amber-300 shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                      Moderate Exposure
                    </span>
                  ) : exposureLevel === 'Low' ? (
                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black uppercase font-mono bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                      Low Exposure
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold uppercase font-mono bg-slate-100 text-slate-600 border border-slate-300">
                      {isPlatformConnected ? 'No Exposure Detected' : 'Not Linked'}
                    </span>
                  )}
                </div>
                <div className="mt-2 text-[11px] font-mono font-bold text-slate-500">
                  {confidenceScore}% Confidence
                </div>
              </div>
            </div>
          </div>

          {/* Predictions Cards for Selected Platform */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            {/* Predicted State / Location */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 text-brand-orange font-mono font-bold text-xs uppercase tracking-wider mb-2">
                <MapPin className="w-4 h-4" />
                Predicted State / Location
              </div>
              <div className="text-lg font-extrabold text-slate-900 mt-1">
                {currentAudit.predictedState || 'None Disclosed'}
              </div>
              <p className="text-xs text-slate-500 mt-2 font-medium">
                Derived strictly from {selectedPlatform === 'github' ? 'GitHub profile location metadata' : selectedPlatform === 'hackernews' ? 'Hacker News public stories and comments' : 'Reddit comment text mentions & subreddits'}.
              </p>
            </div>

            {/* Language Stack / Community */}
            {selectedPlatform === 'github' ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 text-brand-orange font-mono font-bold text-xs uppercase tracking-wider mb-2">
                  <Code className="w-4 h-4" />
                  Primary Repository Languages
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {currentAudit.languages && currentAudit.languages.length > 0 ? (
                    currentAudit.languages.map((lang, idx) => (
                      <span key={idx} className="bg-white border border-slate-200 text-slate-900 px-3.5 py-1 rounded-full text-xs font-extrabold font-mono shadow-xs">
                        {lang}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 italic">No public repositories</span>
                  )}
                </div>
              </div>
            ) : selectedPlatform === 'stackoverflow' ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 text-brand-orange font-mono font-bold text-xs uppercase tracking-wider mb-2">
                  <Activity className="w-4 h-4" />
                  Stack Overflow Topics
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(currentAudit.tags || []).length > 0 ? currentAudit.tags.map((tag, idx) => <span key={idx} className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1 rounded-full text-xs font-bold font-mono">{tag}</span>) : <span className="text-xs text-slate-500 italic">No public tags found</span>}
                </div>
              </div>
            ) : selectedPlatform === 'hackernews' && currentAudit.itemCount === 0 ? (
              <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center">
                <h4 className="text-lg font-extrabold text-slate-900">No public Hacker News activity found</h4>
                <p className="text-sm text-slate-500 mt-2">Check the username spelling. Hacker News usernames are case-sensitive and only public submissions can be analyzed.</p>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 text-brand-orange font-mono font-bold text-xs uppercase tracking-wider mb-2">
                  <Activity className="w-4 h-4" />
                  Active Subreddits & Communities
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {currentAudit.subreddits && currentAudit.subreddits.length > 0 ? (
                    currentAudit.subreddits.map((sub, idx) => (
                      <span key={idx} className="bg-orange-50 border border-orange-200 text-brand-orange px-3.5 py-1 rounded-full text-xs font-bold font-mono shadow-xs">
                        {sub}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 italic">No active subreddits found</span>
                  )}
                </div>
              </div>
            )}

            {/* Revealed Identity / Email */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 text-brand-orange font-mono font-bold text-xs uppercase tracking-wider mb-2">
                <Globe className="w-4 h-4" />
                Revealed Identity / Email
              </div>
              <div className="text-base font-extrabold text-slate-900 mt-1 font-mono">
                {(selectedPlatform === 'github' ? currentAudit.email : selectedPlatform === 'stackoverflow' ? (currentAudit.profile?.about_me || '') : currentAudit.revealedEmail) || 'None Disclosed'}
              </div>
              <p className="text-xs text-slate-500 mt-2 font-medium">
                {selectedPlatform === 'github' ? 'Public email listed in profile or commit log' : 'Obfuscated or plain-text email extracted from comments'}.
              </p>
            </div>
          </div>
        </div>

        {/* --- PLATFORM SPECIFIC EXPOSURE FINDINGS --- */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="pb-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <ShieldAlert className="w-6 h-6 text-rose-600" />
                {selectedPlatform === 'github' ? 'GitHub Specific Leaks' : selectedPlatform === 'hackernews' ? 'Hacker News Specific Leaks' : 'Reddit Specific Leaks'}
              </h3>
              <p className="text-slate-600 text-sm mt-1 font-medium">
                Deterministic findings extracted strictly from {selectedPlatform === 'github' ? 'GitHub profile metadata and repos' : selectedPlatform === 'hackernews' ? 'Hacker News public stories and comments' : 'Reddit comment text and subreddits'}.
              </p>
              {selectedPlatform === 'hackernews' && currentAudit.activitySummary && (
                <p className="text-slate-500 text-xs mt-2 font-mono">{currentAudit.activitySummary}</p>
              )}
              {selectedPlatform === 'reddit' && currentAudit.activitySummary && (
                <p className="text-slate-500 text-xs mt-2 font-mono">{currentAudit.activitySummary}</p>
              )}
            </div>
            
            <button
              id="btn-download-report-findings"
              onClick={handleDownloadReport}
              disabled={downloading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-xs font-bold text-brand-orange transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              <span>{downloading ? 'Preparing Download...' : 'Download Executive Report'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {currentAudit.findings && currentAudit.findings.length > 0 ? (
              currentAudit.findings.map((finding, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 hover:border-brand-orange/60 rounded-2xl p-6 flex flex-col justify-between transition-all hover:shadow-md">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        {finding.category || finding.type}
                      </span>
                      <span className="text-xs font-mono font-semibold text-slate-500">
                        {getFindingConfidence(finding)}% Confidence
                      </span>
                    </div>

                    <p className="text-slate-800 text-sm mt-3 font-semibold">
                      {finding.description}
                    </p>

                    {(finding.evidenceSnippet || finding.fullText) && (
                      <div className="relative group bg-white border border-slate-200 rounded-xl p-3.5 mt-3 text-xs font-mono text-slate-600 break-all pr-12">
                        <span>{finding.evidenceSnippet || finding.fullText}</span>
                        
                        {/* Gemini AI Sanitizer Button */}
                        <button
                          onClick={() => handleOpenSanitizer(finding)}
                          title="Sanitize with AI (Anonymize identity markers)"
                          className="absolute right-2 top-2 p-2 rounded-lg bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-all text-brand-orange flex items-center justify-center shadow-xs hover:scale-105 cursor-pointer"
                        >
                          <GeminiSparkleIcon className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {finding.evidenceItems?.length > 0 && (
                      <details className="mt-3 rounded-xl border border-orange-200 bg-orange-50/50">
                        <summary className="cursor-pointer px-3.5 py-2.5 text-xs font-bold text-orange-800">
                          View all proofs ({finding.evidenceItems.length}{finding.evidenceCount > finding.evidenceItems.length ? ` of ${finding.evidenceCount}` : ''})
                        </summary>
                        <div className="px-3.5 pb-3 space-y-2">
                          {finding.evidenceItems.map((proof, proofIndex) => (
                            <div key={`${proof.url || 'proof'}-${proofIndex}`} className="rounded-lg bg-white border border-orange-100 p-3 text-xs">
                              <p className="text-slate-700 font-mono break-words">{proof.snippet}</p>
                              <div className="flex items-center justify-between gap-2 mt-2">
                                <span className="text-slate-500">{proof.source}</span>
                                {proof.url && <a href={proof.url} target="_blank" rel="noopener noreferrer" className="text-orange-700 font-bold hover:underline">Open proof</a>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-mono">Source: {finding.source}</span>
                    {finding.evidence_url && (
                      <a
                        href={finding.evidence_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-brand-orange hover:underline flex items-center gap-1"
                      >
                        <span>View Evidence</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full bg-emerald-50/50 border border-emerald-200 rounded-2xl p-8 text-center">
                <ShieldCheck className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                <h4 className="text-lg font-extrabold text-emerald-900">Zero Critical Leaks Discovered</h4>
                <p className="text-xs text-emerald-700 mt-1 font-medium max-w-md mx-auto">
                  {selectedPlatform === 'github' 
                    ? 'No high-risk secrets, locations, or personal emails were detected in your public GitHub profile.'
                    : 'No direct location mentions, university tags, or exposed contact details were found in your public Reddit activity.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {identityLinks.length > 0 && (
          <div className="bg-white border border-orange-200 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-extrabold text-slate-900">Cross-platform OSINT signals</h3>
                <p className="text-sm text-slate-600 mt-1">Only evidence-backed links found across the connected public profiles.</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-xs font-black">{identityLinks.length} signal{identityLinks.length === 1 ? '' : 's'}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
              {identityLinks.map((link, index) => (
                <div key={`${link.signal}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-mono font-black uppercase text-orange-700">{link.confidence} confidence</span>
                    <span className="text-xs text-slate-500">{link.source_a} → {link.source_b}</span>
                  </div>
                  <h4 className="font-extrabold text-slate-900 mt-2">{link.signal}</h4>
                  <p className="text-sm text-slate-700 mt-2">{link.evidence}</p>
                  {link.supporting_signals?.length > 0 && <p className="text-xs text-slate-500 mt-3">Signals: {link.supporting_signals.join(' · ')}</p>}
                  {link.evidence_url && <a href={link.evidence_url} target="_blank" rel="noopener noreferrer" className="inline-flex mt-3 text-xs font-bold text-orange-700 hover:underline">View evidence <ExternalLink className="w-3 h-3 ml-1" /></a>}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* --- AI SANITIZER POPUP MODAL --- */}
      {activeSanitizeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl relative animate-fadeIn max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setActiveSanitizeModal(false)}
              className="absolute right-5 top-5 text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center">
                <GeminiSparkleIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">AI Privacy Sanitizer & Action Recommendation</h3>
                <p className="text-xs text-slate-500 font-medium">
                  AI opinion on whether to delete post or what exact changes should be made
                </p>
              </div>
            </div>

            {/* AI Action Banner & Opinion */}
            {sanitizeResult && !sanitizing && (
              <div className="mb-5 space-y-3">
                <div className={`p-4 rounded-2xl border ${sanitizeResult.recommendation === 'DELETE' ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 font-mono font-black text-xs uppercase tracking-wider">
                      {sanitizeResult.recommendation === 'DELETE' ? (
                        <>
                          <Trash2 className="w-4 h-4 text-rose-600" />
                          <span className="text-rose-700 font-extrabold">AI Recommendation: DELETE THIS POST</span>
                        </>
                      ) : (
                        <>
                          <Edit3 className="w-4 h-4 text-amber-600" />
                          <span className="text-amber-800 font-extrabold">AI Recommendation: EDIT & SANITIZE POST</span>
                        </>
                      )}
                    </div>
                    {sanitizeResult.snippetRiskScore && (
                      <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${sanitizeResult.recommendation === 'DELETE' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                        Risk Index: {sanitizeResult.snippetRiskScore}/100
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium leading-relaxed mt-2">
                    {sanitizeResult.aiOpinion}
                  </p>
                </div>

                {/* Suggested Changes Checklist */}
                {sanitizeResult.suggestedChanges && sanitizeResult.suggestedChanges.length > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                    <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-brand-orange" />
                      What Changes Should Be Done:
                    </label>
                    <ul className="space-y-1.5 text-xs text-slate-700 font-medium">
                      {sanitizeResult.suggestedChanges.map((change, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-brand-orange font-bold font-mono text-xs">•</span>
                          <span>{change}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Original Exposing Snippet
                </label>
                <div className="bg-rose-50/50 border border-rose-200 text-slate-800 p-3.5 rounded-xl font-mono text-xs break-all">
                  {originalSnippet}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-700 mb-1.5 flex items-center justify-between">
                  <span>Sanitized & Obfuscated Output</span>
                  {sanitizedSnippet && (
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Safe to publish if edited
                    </span>
                  )}
                </label>
                <div className="relative bg-slate-50 border border-emerald-300 text-slate-900 p-4 rounded-xl font-mono text-xs break-all min-h-[70px] flex items-center">
                  {sanitizing ? (
                    <div className="flex items-center gap-2 text-slate-500 text-xs">
                      <div className="w-4 h-4 border-2 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
                      <span>Analyzing snippet & generating AI recommendations...</span>
                    </div>
                  ) : (
                    <span>{sanitizedSnippet}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setActiveSanitizeModal(false)}
                className="px-5 py-2.5 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handleCopySanitized}
                disabled={sanitizing}
                className="bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-extrabold px-6 py-2.5 rounded-full transition-all flex items-center gap-2 shadow-md hover:shadow-lg cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copied Sanitized Text!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Anonymized Text</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

