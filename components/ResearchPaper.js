'use client';

import { FileText, ExternalLink, ShieldCheck, Download, BookOpen, Layers, CheckCircle2 } from 'lucide-react';

export default function ResearchPaper({ onOpenModal }) {
  return (
    <section id="research" className="py-16 md:py-24 bg-white border-b border-slate-200 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs uppercase tracking-wider font-mono text-brand-orange font-bold">Academic Foundation</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900">Research Paper Inspiration</h2>
          </div>
          <p className="mt-2 md:mt-0 text-sm text-slate-600 max-w-md font-medium">
            Built on peer-reviewed methodology evaluating cross-platform identity linkability while enforcing strict ethical user-consent boundaries.
          </p>
        </div>

        {/* Dedicated Research Paper Clean Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 border border-slate-200 shadow-md hover:shadow-lg transition-all">
          <div className="flex flex-col lg:flex-row items-start justify-between gap-8">
            
            {/* Left Content Side */}
            <div className="flex-1 space-y-4">
              
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-orange-100 text-orange-800 border border-orange-200">
                  <BookOpen className="w-3.5 h-3.5" />
                  Capstone Publication
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white text-slate-700 border border-slate-200">
                  Vidyalankar Institute of Technology
                </span>
              </div>

              {/* Title */}
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
                De-anonymizing Cross-Platform Identities via Stylometric Feature Extraction and Metadata Correlation
              </h3>

              {/* Summary */}
              <p className="text-sm text-slate-600 leading-relaxed font-normal">
                This Deanonymizer software implementation is directly inspired by our underlying academic research into stylometry and metadata privacy vulnerabilities. The project demonstrates how publicly visible writing signatures (n-gram frequencies, punctuation patterns) and timestamp activity distributions can mathematically link pseudonymous accounts—<strong className="text-slate-900 font-bold">while strictly limiting its real-world analysis engine to user-owned accounts for self-privacy auditing and hardening</strong>.
              </p>

              {/* Authors List */}
              <div className="pt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500 font-mono">
                <div>
                  <span className="text-brand-orange font-bold">AUTHORS: </span>
                  <span className="text-slate-900 font-bold">Piyush Gupta, Rohit Soneji, Sukumar Sawant</span>
                </div>
                <div>
                  <span className="text-brand-orange font-bold">INSTITUTION: </span>
                  <span className="text-slate-700 font-bold">Vidyalankar Institute of Technology</span>
                </div>
              </div>

              {/* Highlights Checklist */}
              <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-700 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>N-gram stylometric character & word extraction</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Client-side metadata timestamp correlation</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Ethical consent-first audit boundary</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Actionable self-privacy mitigation playbook</span>
                </div>
              </div>

            </div>

            {/* Right Side Action Card Box */}
            <div className="w-full lg:w-80 shrink-0 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
              
              <div>
                <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-brand-orange mb-4">
                  <FileText className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">Read Academic Manuscript</h4>
                <p className="text-xs text-slate-600 mt-1 font-medium">
                  Explore full abstract, mathematical formulas, feature vector definitions, and BibTeX citations.
                </p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={onOpenModal}
                  suppressHydrationWarning
                  className="w-full px-4 py-2.5 rounded-xl bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <span>Read Paper & Abstract</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={onOpenModal}
                  suppressHydrationWarning
                  className="w-full px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors border border-slate-200 flex items-center justify-center gap-2"
                >
                  <Download className="w-3.5 h-3.5 text-brand-orange" />
                  <span>Download Manuscript (PDF)</span>
                </button>
              </div>

            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
