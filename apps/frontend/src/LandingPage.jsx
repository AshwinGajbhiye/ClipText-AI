import React, { useState } from 'react';
import { Play, UploadCloud, CheckCircle2, ChevronDown, Check, Globe, Zap, Settings } from 'lucide-react';
import { SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/react';

export default function LandingPage({ onStart }) {
  const { isSignedIn } = useAuth();
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [openFaq, setOpenFaq] = useState(0);

  const faqs = [
    { q: "How accurate are the AI captions?", a: "Our AI model achieves up to 99% accuracy across 50+ languages, using advanced contextual speech recognition." },
    { q: "What video formats do you support?", a: "We support MP4, MOV, AVI, and WebM up to 2GB per file." },
    { q: "Can I cancel my subscription at any time?", a: "Yes, you can cancel your subscription from your billing dashboard with one click. No hidden fees." },
    { q: "Do you offer refunds?", a: "We offer a 14-day money-back guarantee if you are not satisfied with the quality of the captions." }
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      
      {/* Navbar (Sticky, Glassmorphism) */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-neutral-950/50 backdrop-blur-md border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Play className="w-4 h-4 text-white fill-white ml-0.5" />
            </div>
            <span className="font-bold text-lg tracking-tight">ClipText</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#workspace" className="hover:text-white transition-colors">Editor</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-4">
            {!isSignedIn ? (
              <>
                <SignInButton mode="modal">
                  <button className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">Login</button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-400 text-white text-sm font-semibold hover:shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5 transition-all duration-300">
                    Get Started
                  </button>
                </SignUpButton>
              </>
            ) : (
              <>
                <button 
                  onClick={onStart}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-400 text-white text-sm font-semibold hover:shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5 transition-all duration-300"
                >
                  Launch Editor
                </button>
                <div className="ml-4 flex items-center justify-center">
                  <UserButton />
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-20">
        {/* Hero Section */}
        <section className="px-6 max-w-5xl mx-auto text-center flex flex-col items-center mb-32">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs font-medium mb-8">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500"></span>
            Introducing ClipText 2.0
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
            Generate Perfect <br className="hidden md:block"/> Video Captions in <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Seconds.</span>
          </h1>
          <p className="text-lg text-neutral-400 max-w-2xl mb-10 leading-relaxed">
            Stop wasting hours manually transcribing videos. Our AI analyzes your audio and generates pixel-perfect, highly engaging captions instantly.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {!isSignedIn ? (
              <SignUpButton mode="modal">
                <button className="px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 text-white font-semibold text-lg hover:shadow-xl hover:shadow-indigo-500/25 hover:-translate-y-1 transition-all duration-300 flex items-center gap-2">
                  Start for Free <Play className="w-4 h-4 fill-white" />
                </button>
              </SignUpButton>
            ) : (
              <button onClick={onStart} className="px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 text-white font-semibold text-lg hover:shadow-xl hover:shadow-indigo-500/25 hover:-translate-y-1 transition-all duration-300 flex items-center gap-2">
                Go to Dashboard <Play className="w-4 h-4 fill-white" />
              </button>
            )}
          </div>
        </section>

        {/* The Workspace (Mockup) */}
        <section id="workspace" className="px-6 max-w-6xl mx-auto mb-32">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 overflow-hidden backdrop-blur-sm shadow-2xl">
            {/* Window controls mockup */}
            <div className="h-12 border-b border-neutral-800 bg-neutral-900 flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
            </div>
            
            <div className="p-8">
              {/* Upload Zone */}
              <div className="border-2 border-dashed border-neutral-700 hover:border-indigo-500/50 bg-neutral-950/50 rounded-xl p-12 text-center flex flex-col items-center justify-center transition-colors cursor-pointer mb-8 group">
                <UploadCloud className="w-10 h-10 text-neutral-500 mb-4 group-hover:text-indigo-400 transition-colors" />
                <h3 className="text-lg font-medium text-white mb-1">Drag & Drop your video here</h3>
                <p className="text-sm text-neutral-400">MP4, MOV, WebM up to 2GB</p>
              </div>

              {/* Editor Mockup */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Video Player */}
                <div className="aspect-video bg-neutral-950 rounded-xl border border-neutral-800 relative flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1626544827763-d516dce335e2?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-40"></div>
                  <Play className="w-16 h-16 text-white/50 relative z-10 transition-transform hover:scale-110 cursor-pointer" />
                  <div className="absolute bottom-6 left-0 right-0 text-center z-10">
                    <span className="text-3xl font-black uppercase text-white drop-shadow-lg tracking-tight" style={{ WebkitTextStroke: '1px black' }}>
                      Welcome to <span className="text-yellow-400">the</span> video
                    </span>
                  </div>
                </div>

                {/* Timeline Mockup */}
                <div className="bg-neutral-950 rounded-xl border border-neutral-800 p-4 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-neutral-800">
                    <span className="text-sm font-semibold text-neutral-300">Transcript Editor</span>
                    <Settings className="w-4 h-4 text-neutral-500 cursor-pointer hover:text-white transition-colors" />
                  </div>
                  <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                    {[
                      { time: "00:00.00", text: "Hey guys," },
                      { time: "00:01.20", text: "welcome to the video." },
                      { time: "00:02.50", text: "Today we're looking at" },
                      { time: "00:03.80", text: "something incredible." },
                      { time: "00:05.10", text: "You won't believe it." },
                    ].map((block, i) => (
                      <div key={i} className={`p-3 rounded-lg border ${i === 1 ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'} transition-colors cursor-pointer`}>
                        <div className="text-xs text-indigo-400 font-mono mb-1">{block.time}</div>
                        <div className="text-sm text-neutral-200">{block.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="px-6 max-w-7xl mx-auto mb-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Powerful Features</h2>
            <p className="text-neutral-400 max-w-2xl mx-auto">Everything you need to create viral, engaging videos without the editing headache.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Zap, title: "High Accuracy", desc: "Powered by OpenAI's Whisper, our speech recognition hits 99% accuracy." },
              { icon: Globe, title: "Multi-Language Support", desc: "Automatically transcribe and translate videos into over 50 different languages." },
              { icon: CheckCircle2, title: "Instant Export", desc: "Render your videos directly in the cloud or download the SRT files instantly." }
            ].map((feature, i) => (
              <div key={i} className="bg-neutral-900/80 p-8 rounded-2xl border border-neutral-800 hover:border-neutral-700 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/50 group">
                <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center mb-6 text-indigo-400 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-3 tracking-tight">{feature.title}</h3>
                <p className="text-neutral-400 leading-relaxed text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="px-6 max-w-7xl mx-auto mb-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">Simple Pricing</h2>
            
            <div className="inline-flex bg-neutral-900 p-1 rounded-xl border border-neutral-800">
              <button 
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${billingCycle === 'monthly' ? 'bg-neutral-800 text-white shadow' : 'text-neutral-400 hover:text-white'}`}
              >
                Monthly
              </button>
              <button 
                onClick={() => setBillingCycle('annual')}
                className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${billingCycle === 'annual' ? 'bg-neutral-800 text-white shadow' : 'text-neutral-400 hover:text-white'}`}
              >
                Annual <span className="text-green-400 ml-1 font-bold">-20%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center max-w-5xl mx-auto">
            {/* Starter */}
            <div className="bg-neutral-900/80 rounded-2xl p-8 border border-neutral-800 hover:border-neutral-700 transition-all duration-300">
              <h3 className="text-lg font-medium text-neutral-300 mb-2">Starter</h3>
              <div className="text-4xl font-bold mb-6">${billingCycle === 'monthly' ? '19' : '15'}<span className="text-lg text-neutral-500 font-normal">/mo</span></div>
              <ul className="space-y-4 mb-8">
                {['120 minutes of video/mo', '720p Exports', 'Standard Templates', 'Email Support'].map((feat, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-neutral-300">
                    <Check className="w-4 h-4 text-indigo-400 shrink-0" /> {feat}
                  </li>
                ))}
              </ul>
              <button className="w-full py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 font-semibold transition-colors">Choose Starter</button>
            </div>

            {/* Pro */}
            <div className="bg-neutral-900 rounded-2xl p-8 border-2 border-indigo-500 relative transform md:-translate-y-4 shadow-[0_0_40px_rgba(99,102,241,0.15)]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-indigo-500 to-cyan-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">Most Popular</div>
              <h3 className="text-lg font-medium text-neutral-300 mb-2 mt-2">Pro</h3>
              <div className="text-4xl font-bold mb-6">${billingCycle === 'monthly' ? '49' : '39'}<span className="text-lg text-neutral-500 font-normal">/mo</span></div>
              <ul className="space-y-4 mb-8">
                {['600 minutes of video/mo', '4K Exports', 'Custom Fonts & Brand Colors', 'Multi-Language Translation', 'Priority Support'].map((feat, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-neutral-100">
                    <Check className="w-4 h-4 text-indigo-400 shrink-0" /> {feat}
                  </li>
                ))}
              </ul>
              <button className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 font-semibold hover:shadow-lg hover:shadow-indigo-500/25 transition-all duration-300 hover:-translate-y-0.5">Get Pro</button>
            </div>

            {/* Agency */}
            <div className="bg-neutral-900/80 rounded-2xl p-8 border border-neutral-800 hover:border-neutral-700 transition-all duration-300">
              <h3 className="text-lg font-medium text-neutral-300 mb-2">Agency</h3>
              <div className="text-4xl font-bold mb-6">${billingCycle === 'monthly' ? '149' : '119'}<span className="text-lg text-neutral-500 font-normal">/mo</span></div>
              <ul className="space-y-4 mb-8">
                {['Unlimited minutes', 'API Access', 'White-labeling', 'Dedicated Account Manager'].map((feat, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-neutral-300">
                    <Check className="w-4 h-4 text-indigo-400 shrink-0" /> {feat}
                  </li>
                ))}
              </ul>
              <button className="w-full py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 font-semibold transition-colors">Contact Sales</button>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="px-6 max-w-3xl mx-auto mb-32">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-neutral-800 rounded-xl bg-neutral-900/50 overflow-hidden transition-all duration-300 hover:border-neutral-700">
                <button 
                  onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                  className="w-full px-6 py-5 flex items-center justify-between font-medium text-left transition-colors hover:bg-neutral-800/30"
                >
                  <span className="text-neutral-200">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-neutral-500 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                <div 
                  className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${openFaq === i ? 'max-h-40 pb-5 opacity-100' : 'max-h-0 opacity-0'}`}
                >
                  <p className="text-neutral-400 text-sm leading-relaxed">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800 bg-neutral-950 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center">
              <Play className="w-3 h-3 text-white fill-white ml-0.5" />
            </div>
            <span className="font-bold text-neutral-300 tracking-tight">ClipText</span>
          </div>
          
          <div className="flex gap-6 text-sm text-neutral-500 font-medium">
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>

          <div className="flex items-center gap-5 text-neutral-500">
            <a href="#" className="hover:text-white transition-colors hover:-translate-y-0.5">X (Twitter)</a>
            <a href="#" className="hover:text-white transition-colors hover:-translate-y-0.5">GitHub</a>
            <a href="#" className="hover:text-white transition-colors hover:-translate-y-0.5">LinkedIn</a>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-8 text-center text-sm text-neutral-600 font-medium">
          © {new Date().getFullYear()} ClipText. All rights reserved.
        </div>
      </footer>

    </div>
  );
}
