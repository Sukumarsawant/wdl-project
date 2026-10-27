import "./globals.css";

export const metadata = {
  title: "Deanonymizer | Cross-Platform Privacy Risk Audit",
  description: "Academic privacy assessment tool inspecting stylometric fingerprints and metadata correlations across user-owned pseudonymous accounts. Developed by Piyush Gupta, Rohit Soneji, and Sukumar Sawant at Vidyalankar Institute of Technology.",
  keywords: ["Deanonymizer", "Stylometry", "Privacy Audit", "Metadata Correlation", "NLP Security", "Vidyalankar Institute of Technology"],
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  authors: [
    { name: "Piyush Gupta" },
    { name: "Rohit Soneji" },
    { name: "Sukumar Sawant" }
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body suppressHydrationWarning className="min-h-screen bg-darkorange-950 text-slate-100 font-sans selection:bg-brand-orange/30 selection:text-orange-200">
        {children}
      </body>
    </html>
  );
}
