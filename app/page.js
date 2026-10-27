'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Workflow from '@/components/Workflow';
import ResearchPaper from '@/components/ResearchPaper';
import ResearchModal from '@/components/ResearchModal';
import Footer from '@/components/Footer';

export default function Home() {
  const [isPaperModalOpen, setIsPaperModalOpen] = useState(false);

  const handleOpenPaperModal = () => {
    if (typeof window !== 'undefined') {
      window.open('https://drive.google.com/file/d/1hdj4JTB9VNnOqVmFJcjBwEeTPkNYgf9c/view?usp=sharing', '_blank');
    }
  };

  const handleClosePaperModal = () => {
    setIsPaperModalOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 selection:bg-brand-orange/20 selection:text-brand-orange">
      {/* Top Header Navigation */}
      <Navbar />

      {/* Main One-Page Content */}
      <main className="flex-grow">
        {/* Hero Section with Pure Dark Orange Glow Background & Beams */}
        <Hero onOpenPaperModal={handleOpenPaperModal} />

        {/* Workflow Section (Connect Account -> Analyze -> View Report) */}
        <Workflow />

        {/* Dedicated Research Paper Section */}
        <ResearchPaper onOpenModal={handleOpenPaperModal} />
      </main>

      {/* Institutional & Team Footer */}
      <Footer />

      {/* Research Paper Abstract Modal */}
      <ResearchModal isOpen={isPaperModalOpen} onClose={handleClosePaperModal} />
    </div>
  );
}
