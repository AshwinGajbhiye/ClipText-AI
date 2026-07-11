import React from 'react';
import { Play, Sparkles, Languages, Clock, Layers, Type, Film, Cpu } from 'lucide-react';

export default function LandingPage({ onStart }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-outfit overflow-hidden relative selection:bg-indigo-500/30">
      
      {/* Background Animated Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px] mix-blend-screen animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-600/20 blur-[120px] mix-blend-screen animate-blob" style={{animationDelay: "2s"}}></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-purple-600/20 blur-[120px] mix-blend-screen animate-blob" style={{animationDelay: "4s"}}></div>
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-slate-950/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Play className="w-5 h-5 text-white fill-white ml-1" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              ClipText AI
            </span>
          </div>
          <button 
            onClick={onStart}
            className="px-6 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-semibold transition-all duration-300 backdrop-blur-sm"
          >
            Launch Editor
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative pt-40 pb-20 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col items-center text-center space-y-8 mt-12 mb-32">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-4 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
            <Sparkles className="w-4 h-4" />
            <span>Next-Generation Video Captions</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] max-w-4xl bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-slate-500">
            Captions That <br className="hidden md:block" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">Captivate Audiences</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl font-light leading-relaxed">
            Harness the power of AI to generate hyper-accurate, word-by-word dynamic video captions in seconds. Built for creators who demand perfection.
          </p>
          
          <div className="flex items-center gap-4 pt-8">
            <button 
              onClick={onStart}
              className="group relative px-8 py-4 rounded-full bg-indigo-600 text-white font-semibold text-lg overflow-hidden transition-all hover:scale-105 shadow-[0_0_40px_rgba(99,102,241,0.4)]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <span className="relative flex items-center gap-2">
                Get Started for Free
                <Play className="w-4 h-4 fill-white" />
              </span>
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
          
          <div className="p-8 rounded-3xl bg-slate-900/50 backdrop-blur-sm border border-white/5 hover:bg-slate-900/80 transition-colors duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-6 text-indigo-400 group-hover:scale-110 transition-transform">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold text-slate-100 mb-3">AI-Powered Precision</h3>
            <p className="text-slate-400 leading-relaxed text-sm">
              Powered by Whisper AI. Every single word is meticulously mapped to millisecond-perfect timestamps, completely automatically.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-slate-900/50 backdrop-blur-sm border border-white/5 hover:bg-slate-900/80 transition-colors duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 flex items-center justify-center mb-6 text-cyan-400 group-hover:scale-110 transition-transform">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold text-slate-100 mb-3">Dynamic Presets</h3>
            <p className="text-slate-400 leading-relaxed text-sm">
              Instantly apply viral caption styles like Mr. Beast, Hormozi, or our signature ClipText Glow. Customize fonts, colors, and shadows instantly.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-slate-900/50 backdrop-blur-sm border border-white/5 hover:bg-slate-900/80 transition-colors duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-6 text-purple-400 group-hover:scale-110 transition-transform">
              <Film className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold text-slate-100 mb-3">Smart Timeline</h3>
            <p className="text-slate-400 leading-relaxed text-sm">
              An intuitive, waveform-synced timeline track. Drag, drop, and refine word boundaries directly on the visual audio track.
            </p>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 mt-20 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
              <Play className="w-3 h-3 text-white fill-white ml-0.5" />
            </div>
            <span className="font-bold text-slate-300">ClipText AI</span>
          </div>
          <p className="text-slate-500 text-sm">© 2026 ClipText AI. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
