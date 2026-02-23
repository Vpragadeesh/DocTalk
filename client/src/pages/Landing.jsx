import { Link } from 'react-router-dom';
import { FileText, Upload, Shield, Sparkles, ArrowRight, Bot } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-surface-950 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="bg-orb w-64 sm:w-[500px] h-64 sm:h-[500px] bg-primary-600 top-[-15%] left-[-8%]" />
      <div className="bg-orb w-48 sm:w-[400px] h-48 sm:h-[400px] bg-accent-600 bottom-[-12%] right-[-5%]" style={{ animationDelay: '-8s' }} />

      {/* Nav */}
      <header className="relative z-10">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shadow-glow"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)' }}>
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-bold gradient-text">DocTalk</span>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Link to="/login" className="btn-secondary text-xs sm:text-sm px-3 sm:px-5 py-2 sm:py-2.5">Sign In</Link>
            <Link to="/register" className="btn-primary text-xs sm:text-sm px-3 sm:px-5 py-2 sm:py-2.5">Get Started</Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-16 sm:pt-16 md:pt-24 sm:pb-24 md:pb-32">
        <div className="max-w-3xl mx-auto text-center animate-fade-in">
          <div className="inline-flex items-center space-x-2 px-3 sm:px-4 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 mb-6 sm:mb-8">
            <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary-400" />
            <span className="text-[10px] sm:text-xs font-medium text-primary-300">Powered by Google Gemini AI</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-4 sm:mb-6">
            <span className="text-surface-100">Chat with Your</span>
            <br />
            <span className="gradient-text">Documents</span>
          </h1>

          <p className="text-sm sm:text-lg md:text-xl text-surface-400 mb-8 sm:mb-10 max-w-xl mx-auto leading-relaxed px-4 sm:px-0">
            Upload your documents and get instant, accurate answers powered by AI. No more manual searching.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4 sm:px-0">
            <Link to="/register" className="btn-primary px-6 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base flex items-center space-x-2 group w-full sm:w-auto justify-center">
              <span>Start Free</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/login" className="btn-secondary px-6 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base w-full sm:w-auto text-center">
              Sign In
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-16 sm:mt-24 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 px-2 sm:px-0">
          {[
            { icon: Upload, title: "Upload Anything", desc: "Drag and drop PDFs, Word docs, and text files in seconds.", color: "primary" },
            { icon: Bot, title: "Smart Answers", desc: "AI reads every document and gives precise, sourced answers.", color: "accent", delay: 100 },
            { icon: Shield, title: "Secure & Private", desc: "Enterprise-grade encryption. Your data stays yours.", color: "primary", delay: 200 },
          ].map((feat, i) => (
            <div key={i} className="card text-center group animate-slide-up" style={{ animationDelay: `${feat.delay || 0}ms` }}>
              <div className={`mx-auto h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center mb-4 sm:mb-5 transition-all duration-300 group-hover:scale-110 ${
                feat.color === 'primary' ? 'bg-primary-500/10 text-primary-400' : 'bg-accent-500/10 text-accent-400'
              }`}>
                <feat.icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-surface-100 mb-1.5 sm:mb-2">{feat.title}</h3>
              <p className="text-xs sm:text-sm text-surface-500 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-6 sm:py-8">
        <p className="text-center text-[10px] sm:text-xs text-surface-600">&copy; 2026 DocTalk. All rights reserved.</p>
      </footer>
    </div>
  );
}
