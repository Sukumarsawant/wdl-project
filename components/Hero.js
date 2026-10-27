'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Search, ArrowRight, ShieldCheck, Activity, Terminal, ChevronRight, CheckCircle2, Lock, Cpu, Sparkles } from 'lucide-react';

// Dynamically import Beams with SSR disabled for React Three Fiber Canvas compatibility
const Beams = dynamic(() => import('@/components/Beams'), { ssr: false });

// Custom Crisp Platform Icons
const GithubLogo = () => (
  <svg className="w-4 h-4 fill-current text-slate-800" viewBox="0 0 24 24">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);

const RedditLogo = () => (
  <svg className="w-4 h-4 fill-current text-orange-600" viewBox="0 0 24 24">
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.562-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.688-.562-1.249-1.25-1.249zm-4.566 3.868a.333.333 0 0 0-.04.468c.558.647 1.416 1.053 2.356 1.053.94 0 1.798-.406 2.356-1.053a.333.333 0 1 0-.505-.434c-.443.513-1.127.837-1.851.837-.724 0-1.408-.324-1.851-.837a.333.333 0 0 0-.465-.034z"/>
  </svg>
);

const HackerNewsLogo = () => (
  <div className="w-4 h-4 rounded bg-[#ff6600] text-white flex items-center justify-center font-bold text-[10px] leading-none shrink-0">
    Y
  </div>
);

const XLogo = () => (
  <svg className="w-3.5 h-3.5 fill-current text-slate-800" viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

export default function Hero({ onOpenPaperModal }) {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const platforms = [
    {
      id: 'github',
      name: 'GitHub',
      sampleHandle: 'github.com/SwiftByte6',
      desc: 'Audit public commit syntax, n-grams, and repository metadata',
      logo: GithubLogo,
      badge: 'Commit Logs',
    },
    {
      id: 'reddit',
      name: 'Reddit',
      sampleHandle: 'reddit.com/user/tech_wanderer',
      desc: 'Inspect comment frequency & subreddit vocabulary signatures',
      logo: RedditLogo,
      badge: 'Subreddit Stylometry',
    },
    {
      id: 'hn',
      name: 'Hacker News',
      sampleHandle: 'news.ycombinator.com/user?id=dev_anon',
      desc: 'Analyze tech jargon density & active UTC posting windows',
      logo: HackerNewsLogo,
      badge: 'Comment Activity',
    },
    {
      id: 'x',
      name: 'X (Twitter)',
      sampleHandle: 'x.com/@alicedev_24',
      desc: 'Correlate short-form syntax entropy and timezone spikes',
      logo: XLogo,
      badge: 'Post Syntax',
    },
  ];

  // Marquee Phrases Relevant to Deanonymizer
  const marqueeItems = [
    "DEANONYMIZER PRIVACY ENGINE",
    "STYLOMETRIC NLP FINGERPRINTING",
    "CROSS-PLATFORM METADATA CORRELATION",
    "ZERO UNCONSENTED DATA COLLECTION",
    "SELF-PRIVACY AUDIT FOR USER-OWNED ACCOUNTS",
    "VIDYALANKAR INSTITUTE OF TECHNOLOGY",
    "ANONYMITY RISK ASSESSMENT",
    "SYNTAX & TEMPORAL PATTERN ANALYSIS",
  ];

  const handleSelectPlatform = (sampleHandle) => {
    setSearchQuery(sampleHandle);
    setIsDropdownOpen(false);
    window.location.href = `/risk-report?handle=${encodeURIComponent(sampleHandle)}`;
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setIsDropdownOpen(false);
    if (searchQuery.trim()) {
      window.location.href = `/risk-report?handle=${encodeURIComponent(searchQuery.trim())}`;
    } else {
      window.location.href = '/risk-report';
    }
  };

  return (
    <section id="hero" className="pt-28 min-h-screen pb-12 md:pt-36 md:pb-16 relative overflow-hidden border-b border-orange-900/60 hero-pure-dark-orange">
      
      {/* 3D Animated Beams Background - Deep Glowing Orange */}
      {mounted && (
        <div className="absolute inset-0 z-0 opacity-55 pointer-events-none overflow-hidden">
          <Beams
            beamWidth={2.5}
            beamHeight={20}
            beamNumber={15}
            lightColor="#ff5722"
            speed={2}
            noiseIntensity={1.5}
            scale={0.2}
            rotation={12}
          />
        </div>
      )}

      {/* Main Content Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Badges - Dark Orange Theme */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-mono font-bold bg-orange-950/80 text-orange-300 border border-orange-700/60 shadow-lg backdrop-blur-md">
            <Cpu className="w-3.5 h-3.5 text-orange-400" />
           Computer Engineering 
          </span>
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold bg-orange-950/80 text-slate-100 border border-orange-700/60 shadow-lg backdrop-blur-md">
            Vidyalankar Institute of Technology
          </span>
        </div>

        {/* Crisp White Title over Rich Dark Orange Background */}
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15] drop-shadow-md">
            Cross-Platform Analysis & Anonymity Audit
          </h1>
          <p className="mt-4 text-base sm:text-lg text-orange-100/90 leading-relaxed max-w-2xl mx-auto font-medium">
            Search any username or handle to inspect cross-platform linkability risks across <strong className="text-white font-bold">GitHub, Reddit, Hacker News, and X</strong>.
          </p>
        </div>

        {/* PROMINENT PURE WHITE SEARCH BAR WITH DROPDOWN */}
        <div className="mt-8 max-w-2xl mx-auto relative" ref={searchRef}>
          <form onSubmit={handleSearchSubmit} className="relative">
            <div className="relative flex items-center rounded-full bg-white border-2 border-orange-300 focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-500/30 shadow-2xl transition-all overflow-hidden p-1.5">
              <div className="pl-4 text-slate-400">
                <Search className="w-5 h-5 text-orange-600" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                placeholder="Search username or handle (e.g., github.com/alice-dev, @alicedev)..."
                suppressHydrationWarning
                className="w-full py-3.5 pl-3 pr-32 text-sm bg-transparent text-slate-900 placeholder-slate-400 focus:outline-none font-mono"
              />
              <button
                type="submit"
                suppressHydrationWarning
                className="absolute right-2 px-6 py-3 rounded-full bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                <span>Audit</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* SEARCH DROPDOWN MENU */}
          {isDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-fadeIn">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-[11px] font-mono text-orange-700 font-bold uppercase tracking-wider">
                  Supported Platforms for Anonymity Audit
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Select target sample</span>
              </div>

              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {platforms.map((platform) => {
                  const Logo = platform.logo;
                  return (
                    <div
                      key={platform.id}
                      onClick={() => handleSelectPlatform(platform.sampleHandle)}
                      className="p-3.5 hover:bg-orange-50/70 cursor-pointer transition-colors flex items-center justify-between group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 group-hover:border-orange-400 transition-colors">
                          <Logo />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                              {platform.name}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {platform.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-tight font-normal">
                            {platform.desc}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-xs font-mono text-slate-400 group-hover:text-slate-900">
                        <span className="hidden sm:inline text-[11px] text-slate-500">{platform.sampleHandle}</span>
                        <ChevronRight className="w-4 h-4 text-orange-600" />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-500 font-medium">
                100% Client-side parsing • Inspired by VIT Computer Engineering Research
              </div>
            </div>
          )}
        </div>

      </div>

    </section>
  );
}
