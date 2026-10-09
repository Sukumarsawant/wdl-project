'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, FileText, ArrowRight, Activity, LogOut, UserCheck, ExternalLink } from 'lucide-react';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const pathname = usePathname();
  const router = useRouter();

  const isSubPage = pathname !== '/';

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth');
      const data = await res.json();
      if (data.authenticated && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    }
  };

  useEffect(() => {
    checkAuth();
  }, [pathname]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20 || isSubPage) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    handleScroll(); // Initial check
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isSubPage]);

  const handleNavClick = (id) => {
    if (pathname === '/') {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      router.push(`/#${id}`);
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' })
      });
      setUser(null);
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const isScrolledStyle = scrolled || isSubPage;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        isScrolledStyle
          ? 'bg-white/95 backdrop-blur-md border-b border-slate-200/90 py-3 shadow-md text-slate-900'
          : 'bg-darkorange-950/40 backdrop-blur-sm py-4 border-b border-transparent text-white'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleNavClick('hero')}>
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-extrabold text-lg tracking-tight ${isScrolledStyle ? 'text-slate-900' : 'text-white'}`}>
                  Deanonymizer
                </span>
                <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-badge font-semibold ${
                  isScrolledStyle 
                    ? 'bg-orange-50 text-orange-700 border border-orange-200' 
                    : 'bg-darkorange-900 text-orange-300 border border-orange-800'
                }`}>
                  Academic v1.0
                </span>
              </div>
              <p className={`text-[11px] hidden sm:block font-medium ${isScrolledStyle ? 'text-slate-500' : 'text-orange-200/70'}`}>
                Vidyalankar Institute of Technology
              </p>
            </div>
          </div>

          {/* Nav Links */}
          <nav className={`hidden md:flex items-center gap-6 text-xs font-semibold ${isScrolledStyle ? 'text-slate-700' : 'text-orange-100/90'}`}>
            <button
              onClick={() => handleNavClick('workflow')}
              className="hover:text-brand-orange transition-colors py-1 cursor-pointer"
            >
              Workflow
            </button>
            <Link
              href="/risk-report"
              className={`hover:text-brand-orange transition-colors py-1 flex items-center gap-1.5 ${
                pathname === '/risk-report' ? 'text-brand-orange font-bold' : ''
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-brand-orange" />
              Risk Analyzer
            </Link>
            <button
              onClick={() => handleNavClick('research')}
              className="hover:text-brand-orange transition-colors py-1 flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className={`w-3.5 h-3.5 ${isScrolledStyle ? 'text-slate-400' : 'text-orange-300/70'}`} />
              Research Paper
            </button>
          </nav>

          {/* Action Buttons & Session State */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2">
                <a
                  href="/profile"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-xs font-mono font-bold px-3 py-1.5 rounded-full border hidden sm:inline-flex items-center gap-1.5 hover:underline ${
                    isScrolledStyle ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-darkorange-900 text-orange-300 border-orange-800'
                  }`}
                >
                  Profile
                </a>

                <button
                  onClick={handleSignOut}
                  className={`text-xs font-semibold px-3.5 py-2 rounded-full border transition-all flex items-center gap-1.5 cursor-pointer ${
                    isScrolledStyle 
                      ? 'border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900' 
                      : 'border-orange-500/40 text-orange-100 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-400" />
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className={`text-xs font-semibold px-3.5 py-2 rounded-full border transition-all ${
                  isScrolledStyle 
                    ? 'border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900' 
                    : 'border-orange-500/40 text-orange-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                Sign In
              </Link>
            )}

            <Link
              href="/risk-report"
              className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full bg-brand-orange hover:bg-brand-orange-hover text-white transition-all shadow-glow hover:shadow-glow-lg border border-brand-orange/60"
            >
              <span>Start Analysis</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>
      </div>
    </header>
  );
}
