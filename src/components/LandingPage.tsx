import React, { useState, useEffect } from "react";
import { 
  Terminal, 
  Send, 
  Globe, 
  Cpu, 
  Layers, 
  Activity, 
  Sparkles, 
  Shield, 
  Zap, 
  Download, 
  ArrowRight, 
  Lock, 
  CheckCircle2, 
  Laptop, 
  Smartphone,
  ChevronRight,
  Info,
  ExternalLink
} from "lucide-react";
import { motion } from "motion/react";

import { useNavigate } from "react-router-dom";

const LANDING_PLATFORMS = ["Twitter", "Facebook", "Instagram", "Bluesky", "Pinterest", "TikTok"];

export default function LandingPage() {
  const navigate = useNavigate();
  const [demoText, setDemoText] = useState("Unveiling our next-gen system update. Full-scale telemetry logs coming soon!");
  const [selectedDemoPlatforms, setSelectedDemoPlatforms] = useState<string[]>(["Twitter", "TikTok"]);
  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStep, setSimStep] = useState(0);

  // Auto-typing feature for interactive mockup
  const simulateLogs = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setSimulationLogs([]);
    setSimStep(0);
  };

  useEffect(() => {
    if (!isSimulating) return;

    const logSequence = [
      `[INIT] Gateway node active. Ingesting dispatch packet (sk_sandbox)...`,
      `[SCHEDULER] Ready to coordinate targets: [${selectedDemoPlatforms.join(", ")}]...`,
      `[CONTAINER] Initializing secure headless container environment...`,
      ...selectedDemoPlatforms.flatMap(platform => [
        `[HANDSHAKE] Connecting securely to ${platform} companion agent...`,
        `[AUTOMATION] Injecting page viewport & bypassing anti-bot on ${platform}...`,
        `[AUTOMATION] Injecting text: "${demoText.substring(0, 30)}..."`,
        `[SUCCESS] Node-${platform} responded with HTTP 200. Dispatch verified.`
      ]),
      `[COMPLETE] All targeted companion agents executed successfully. Gateway sleeping.`
    ];

    if (simStep < logSequence.length) {
      const delay = simStep === 0 ? 300 : 700;
      const timer = setTimeout(() => {
        setSimulationLogs(prev => [...prev, logSequence[simStep]]);
        setSimStep(prev => prev + 1);
      }, delay);
      return () => clearTimeout(timer);
    } else {
      setIsSimulating(false);
    }
  }, [isSimulating, simStep, selectedDemoPlatforms, demoText]);

  const toggleDemoPlatform = (p: string) => {
    if (isSimulating) return;
    setSelectedDemoPlatforms(prev => 
      prev.includes(p) ? prev.filter(item => item !== p) : [...prev, p]
    );
  };

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      // Calculate offset for the sticky header (height: 64px = 16rem/4)
      const headerOffset = 80; 
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#040405] text-zinc-300 font-sans selection:bg-emerald-500/30 relative overflow-clip">
      {/* Background cyber grid and subtle top green gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/60 via-[#040405] to-[#040405] opacity-90 pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808003_1px,transparent_1px),linear-gradient(to_bottom,#80808003_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0" />

      {/* Subtle lighting accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none z-0" />

      {/* Dynamic header */}
      <header className="sticky top-0 z-50 border-b border-zinc-900 bg-[#040405]/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center shadow-lg relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent" />
              <Terminal className="w-4.5 h-4.5 text-emerald-400" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-white uppercase font-mono flex items-center gap-1.5">
                OmniPost <span className="text-[9px] text-zinc-500 font-normal px-1.5 py-0.5 rounded border border-zinc-850">v1.0.4</span>
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-mono uppercase tracking-widest text-zinc-400">
            <a 
              href="#features" 
              onClick={(e) => handleScrollTo(e, "features")}
              className="hover:text-emerald-400 transition-colors"
            >
              Capabilities
            </a>
            <a 
              href="#playground" 
              onClick={(e) => handleScrollTo(e, "playground")}
              className="hover:text-emerald-400 transition-colors"
            >
              Sandbox Demo
            </a>
            <a 
              href="#how-it-works" 
              onClick={(e) => handleScrollTo(e, "how-it-works")}
              className="hover:text-emerald-400 transition-colors"
            >
              Protocol Map
            </a>
            <a 
              href="#downloads" 
              onClick={(e) => handleScrollTo(e, "downloads")}
              className="hover:text-emerald-400 transition-colors"
            >
              Companions
            </a>
          </nav>

          <button 
            onClick={() => navigate('/login')}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-zinc-750 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm flex items-center gap-2"
          >
            Launch Console
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
          </button>
        </div>
      </header>

      {/* Main hero section */}
      <main className="relative z-10">
        
        {/* Hero visual grid layout */}
        <section className="max-w-7xl mx-auto px-6 pt-16 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-7 space-y-8 text-left">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/5 border border-emerald-500/10 rounded-full"
            >
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-widest">Headless Distribution Core</span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl md:text-5xl font-black font-mono tracking-tight text-white leading-[1.1] uppercase"
            >
              Omnipresent <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-300">Social Dispatch</span> <br />
              Engine.
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-sm text-zinc-400 leading-relaxed max-w-xl font-mono"
            >
              Locally hosted containerized social publishing gateway. Link your profiles securely, publish posts, schedules, and assets directly via programmatic API routes or the elegant central GUI.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap gap-4 pt-2"
            >
              <button 
                onClick={() => navigate('/login')}
                className="px-6 py-3.5 rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 text-xs font-bold uppercase tracking-widest transition-all shadow-lg cursor-pointer transform hover:translate-y-[-1px] active:translate-y-[1px] flex items-center gap-2.5"
              >
                Authenticate Google Account
                <ArrowRight className="w-4 h-4" />
              </button>
              
              <a 
                href="#playground"
                onClick={(e) => handleScrollTo(e, "playground")}
                className="px-6 py-3.5 rounded-xl bg-zinc-950/60 text-zinc-300 hover:text-white hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-750 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2"
              >
                Launch Sandbox Playground
              </a>
            </motion.div>

            {/* Platform indicator ribbon */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.4 }}
              className="pt-6 border-t border-zinc-900 max-w-lg"
            >
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-3 font-mono">SUPPORTED ENDPOINTS</span>
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                {LANDING_PLATFORMS.map(p => (
                  <div key={p} className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors cursor-default">
                    <span className="w-1 h-1 bg-emerald-500 rounded-full" />
                    <span className="text-[10px] font-mono tracking-wide uppercase">{p}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Interactive Core Mockup Terminal */}
          <div className="lg:col-span-5 w-full relative">
            <motion.div 
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="w-full bg-zinc-950 border border-zinc-850 rounded-2xl shadow-2xl relative overflow-hidden"
            >
              {/* Terminal Title Bar */}
              <div className="h-10 border-b border-zinc-900 px-4 flex items-center justify-between bg-zinc-900/40">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-red-500/40 rounded-full" />
                  <span className="w-2.5 h-2.5 bg-yellow-500/40 rounded-full" />
                  <span className="w-2.5 h-2.5 bg-green-500/40 rounded-full" />
                </div>
                <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  Telemetry Tracer - Sandbox
                </span>
                <span className="w-3" />
              </div>

              {/* Terminal Body */}
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-850 p-2.5 rounded-xl">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <Cpu className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-left font-mono">
                    <span className="text-[8px] text-zinc-500 block leading-none">CONTAINER STATE</span>
                    <span className="text-[10px] font-bold text-emerald-400 block mt-0.5 uppercase tracking-wide">Ready for Dispatch</span>
                  </div>
                </div>

                <div className="space-y-2 text-left font-mono">
                  <div className="flex justify-between text-[9px] text-zinc-500 border-b border-zinc-900 pb-1 uppercase tracking-widest font-bold">
                    <span>Logs Monitor</span>
                    <span className="text-emerald-500">Active telemetry</span>
                  </div>
                  
                  <div className="h-56 overflow-y-auto font-mono text-[9px] space-y-1.5 pr-1 text-emerald-400 bg-zinc-950 border border-zinc-900 p-3 rounded-xl max-h-56 select-none scrollbar-thin">
                    {simulationLogs.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-600 uppercase text-center text-[8px] tracking-wider">
                        <Terminal className="w-6 h-6 mb-2 opacity-30" />
                        Awaiting dispatch command<br/>
                        <span className="text-[7px] text-zinc-700 font-bold">Trigger mockup terminal to trace execution logs</span>
                      </div>
                    ) : (
                      simulationLogs.map((log, i) => (
                        <div key={i} className="leading-relaxed border-l-2 border-emerald-500/20 pl-2 animate-fade-in break-words">
                          {log}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={simulateLogs}
                  disabled={isSimulating}
                  className="w-full py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 font-bold text-[9px] uppercase tracking-widest font-mono transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Zap className={`w-3.5 h-3.5 ${isSimulating ? 'animate-bounce' : ''}`} />
                  {isSimulating ? "Automating Node..." : "Trigger Simulation"}
                </button>
              </div>
            </motion.div>
          </div>

        </section>

        {/* Dynamic features section */}
        <section id="features" className="border-t border-zinc-900 bg-zinc-950/50 py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-950 via-[#040405] to-[#040405] opacity-90 pointer-events-none z-0" />
          
          <div className="max-w-7xl mx-auto px-6 relative z-10 text-center space-y-16">
            <div className="max-w-2xl mx-auto space-y-4">
              <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-widest px-2.5 py-1 bg-emerald-500/5 border border-emerald-500/10 rounded-full inline-block">Core Capabilities</span>
              <h2 className="text-2xl md:text-3xl font-black font-mono tracking-tight text-white uppercase">Engineered for absolute control.</h2>
              <p className="text-xs text-zinc-500 font-mono leading-relaxed max-w-lg mx-auto">
                No third-party developer API limits or platform subscription walls. Publish posts programmatically using direct local automation pipelines.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
              
              {/* Feature 1 */}
              <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-2xl flex flex-col justify-between hover:border-zinc-800 transition-colors">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/5 border border-emerald-500/15 flex items-center justify-center text-emerald-400">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-100 uppercase font-mono tracking-wider">Automated Headless Browser</h3>
                    <p className="text-[11px] text-zinc-500 font-mono leading-relaxed mt-2">
                      Launches containerized Puppeteer browser routines. Bypasses typical posting limits and API payload paywalls completely.
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-2xl flex flex-col justify-between hover:border-zinc-800 transition-colors">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/5 border border-emerald-500/15 flex items-center justify-center text-emerald-400">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-100 uppercase font-mono tracking-wider">Zero Trust Cookie Handshake</h3>
                    <p className="text-[11px] text-zinc-500 font-mono leading-relaxed mt-2">
                      Encrypts account credentials and session cookies locally. Credentials are passed securely to companions without traversal over unsecure clouds.
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-2xl flex flex-col justify-between hover:border-zinc-800 transition-colors">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/5 border border-emerald-500/15 flex items-center justify-center text-emerald-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-100 uppercase font-mono tracking-wider">Double-Fallback Media</h3>
                    <p className="text-[11px] text-zinc-500 font-mono leading-relaxed mt-2">
                      Save photos and videos inside cloud storage buckets, or utilize local temporary Base64 encoding schemas for fast execution flows.
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-2xl flex flex-col justify-between hover:border-zinc-800 transition-colors">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/5 border border-emerald-500/15 flex items-center justify-center text-emerald-400">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-100 uppercase font-mono tracking-wider">Programmatic REST API</h3>
                    <p className="text-[11px] text-zinc-500 font-mono leading-relaxed mt-2">
                      Trigger deployments programmatically via standard curl requests. Simple Bearer key validation secures all ingestion streams.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Interactive sandbox playground section */}
        <section id="playground" className="py-24 max-w-7xl mx-auto px-6 text-center space-y-16">
          <div className="max-w-2xl mx-auto space-y-4">
            <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-widest px-2.5 py-1 bg-emerald-500/5 border border-emerald-500/10 rounded-full inline-block">Interactive Sandbox</span>
            <h2 className="text-2xl md:text-3xl font-black font-mono tracking-tight text-white uppercase">Experience the distribution pipeline.</h2>
            <p className="text-xs text-zinc-500 font-mono leading-relaxed max-w-lg mx-auto">
              Simulate social publishing using our interactive console widget. Configure target endpoints, enter content, and start tracing.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left max-w-5xl mx-auto">
            {/* Input Config panel */}
            <div className="lg:col-span-6 bg-zinc-900/20 border border-zinc-900 rounded-2xl p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                <h3 className="text-xs font-bold text-zinc-300 uppercase font-mono tracking-wider">Payload Configuration</h3>
                <span className="text-[8px] font-mono text-zinc-500">SANDBOX STATE</span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-mono mb-1.5 block">Endpoint Targets</label>
                  <div className="grid grid-cols-3 gap-2">
                    {LANDING_PLATFORMS.map(p => {
                      const isSelected = selectedDemoPlatforms.includes(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => toggleDemoPlatform(p)}
                          className={`px-3 py-2 rounded-xl text-[10px] font-mono transition-all border text-center cursor-pointer ${
                            isSelected
                              ? "bg-zinc-800 border-zinc-700 text-white"
                              : "bg-zinc-950/40 border-zinc-900 text-zinc-500 hover:text-zinc-400"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-mono mb-1.5 block">Message Content</label>
                  <textarea
                    value={demoText}
                    onChange={(e) => setDemoText(e.target.value)}
                    disabled={isSimulating}
                    maxLength={160}
                    rows={4}
                    className="w-full bg-zinc-950/60 border border-zinc-900 rounded-xl p-3.5 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-emerald-500/50 transition-all font-mono resize-none leading-relaxed"
                  />
                  <div className="flex justify-between text-[8px] font-mono text-zinc-600 mt-1 uppercase">
                    <span>MAX WIDTH: 160 CHARS</span>
                    <span>{demoText.length}/160</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={simulateLogs}
                  disabled={isSimulating || selectedDemoPlatforms.length === 0}
                  className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl py-3 text-[10px] font-bold font-mono uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
                >
                  {isSimulating ? (
                    <>
                      <Activity className="w-4 h-4 animate-spin" />
                      Trace Stream Busy...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Initiate Dispatch Ingestion
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Simulated Live View output */}
            <div className="lg:col-span-6 bg-zinc-950 border border-zinc-900 rounded-2xl p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                  <h3 className="text-xs font-bold text-zinc-300 uppercase font-mono tracking-wider">Tracer Diagnostics Output</h3>
                  <div className="flex items-center gap-1.5 font-mono text-[8px] text-zinc-500 bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded">
                    <span className="w-1 h-1 bg-emerald-400 rounded-full animate-ping" />
                    SIMULATOR ACTIVE
                  </div>
                </div>

                <div className="font-mono text-[9px] text-emerald-400 bg-zinc-950/60 border border-zinc-900 p-4 rounded-xl min-h-[180px] space-y-1.5 max-h-[220px] overflow-y-auto scrollbar-thin">
                  {simulationLogs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-600 uppercase text-center text-[8px] tracking-wider py-10">
                      <Terminal className="w-8 h-8 mb-2 opacity-30" />
                      Diagnostics Pipeline Empty<br/>
                      <span className="text-[7px] text-zinc-700 font-bold">Configure payload left & click "Initiate Dispatch"</span>
                    </div>
                  ) : (
                    simulationLogs.map((log, i) => (
                      <div key={i} className="leading-relaxed border-l-2 border-emerald-500/20 pl-2">
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {isSimulating && (
                <div className="mt-4 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping shrink-0" />
                  <span className="text-[8px] font-mono text-emerald-400 uppercase tracking-widest leading-none">EXECUTING LIVE PUPPETEER HANDSHAKE ROUTINE...</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Visual Architectural Map section */}
        <section id="how-it-works" className="py-24 border-t border-zinc-900 bg-zinc-950/50 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none z-0" />

          <div className="max-w-7xl mx-auto px-6 relative z-10 text-center space-y-16">
            <div className="max-w-2xl mx-auto space-y-4">
              <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-widest px-2.5 py-1 bg-emerald-500/5 border border-emerald-500/10 rounded-full inline-block">Architecture Map</span>
              <h2 className="text-2xl md:text-3xl font-black font-mono tracking-tight text-white uppercase">The Decoupled Execution Protocol</h2>
              <p className="text-xs text-zinc-500 font-mono leading-relaxed max-w-lg mx-auto">
                Discover how OmniPost coordinates payload ingestion through decentralized secure desktop/mobile companion agents.
              </p>
            </div>

            {/* Block Diagram steps */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left max-w-5xl mx-auto relative">
              
              {/* Card Step 1 */}
              <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-2xl relative">
                <div className="absolute top-4 right-4 text-[18px] font-bold font-mono text-zinc-700">01</div>
                <div className="space-y-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/5 border border-emerald-500/15 flex items-center justify-center text-emerald-400">
                    <Terminal className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-100 uppercase font-mono tracking-wider">Ingestion Gate</h3>
                    <p className="text-[11px] text-zinc-500 font-mono leading-relaxed mt-2">
                      Dispatch payload (text + assets) is submitted via our cloud dashboard GUI or REST API webhook. Secured via your proprietary Bearer API Token.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Step 2 */}
              <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-2xl relative">
                <div className="absolute top-4 right-4 text-[18px] font-bold font-mono text-zinc-700">02</div>
                <div className="space-y-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/5 border border-emerald-500/15 flex items-center justify-center text-emerald-400">
                    <Activity className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-100 uppercase font-mono tracking-wider">Companion Handshake</h3>
                    <p className="text-[11px] text-zinc-500 font-mono leading-relaxed mt-2">
                      The active database syncs the post record. Secure desktop or mobile companions continuously poll the database for newly queued nodes.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Step 3 */}
              <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-2xl relative">
                <div className="absolute top-4 right-4 text-[18px] font-bold font-mono text-zinc-700">03</div>
                <div className="space-y-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/5 border border-emerald-500/15 flex items-center justify-center text-emerald-400">
                    <Cpu className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-100 uppercase font-mono tracking-wider">Headless Execution</h3>
                    <p className="text-[11px] text-zinc-500 font-mono leading-relaxed mt-2">
                      Your local companion executes headless chromium scripts with your stored local cookies. Bypasses 2FA challenge screens seamlessly.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Companion downloads section */}
        <section id="downloads" className="py-24 max-w-7xl mx-auto px-6 text-center space-y-16">
          <div className="max-w-2xl mx-auto space-y-4">
            <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-widest px-2.5 py-1 bg-emerald-500/5 border border-emerald-500/10 rounded-full inline-block">Secure Agents</span>
            <h2 className="text-2xl md:text-3xl font-black font-mono tracking-tight text-white uppercase">Download Companion Agents</h2>
            <p className="text-xs text-zinc-500 font-mono leading-relaxed max-w-lg mx-auto">
              Run local Puppeteer routines seamlessly on your physical hardware. Choose the agent that matches your operating system setup.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left max-w-3xl mx-auto">
            {/* Desktop agent */}
            <div className="p-6 bg-zinc-900/20 border border-zinc-900 rounded-2xl flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/5 border border-emerald-500/15 flex items-center justify-center text-emerald-400">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <span className="text-[8px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-bold uppercase">v1.0.1 Stable</span>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-zinc-100 uppercase font-mono tracking-wider">Desktop Companion</h3>
                  <p className="text-[11px] text-zinc-500 font-mono leading-relaxed mt-2">
                    Automate browser sessions securely on Windows, macOS, or Linux. Ideal for running background Puppeteer nodes with complete cookie and asset support.
                  </p>
                </div>
              </div>
              <div className="mt-8">
                <a 
                  href="https://github.com/ekoputrapratama/OmniPost/releases/tag/v1.0.1" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-950 text-zinc-300 hover:text-white hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-750 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  Grab Electron Agent
                  <ExternalLink className="w-3 h-3 text-zinc-600" />
                </a>
              </div>
            </div>

            {/* Mobile agent */}
            <div className="p-6 bg-zinc-900/20 border border-zinc-900 rounded-2xl flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/5 border border-emerald-500/15 flex items-center justify-center text-emerald-400">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <span className="text-[8px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-bold uppercase">v1.0.1 Stable</span>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-zinc-100 uppercase font-mono tracking-wider">Mobile Companion</h3>
                  <p className="text-[11px] text-zinc-500 font-mono leading-relaxed mt-2">
                    Orchestrate posts directly from your smartphone. Deep link integration handles incoming auth requests and triggers secure native operations.
                  </p>
                </div>
              </div>
              <div className="mt-8">
                <a 
                  href="https://github.com/ekoputrapratama/OmniPost/releases/tag/v1.0.1" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-950 text-zinc-300 hover:text-white hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-750 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  Grab Mobile APK
                  <ExternalLink className="w-3 h-3 text-zinc-600" />
                </a>
              </div>
            </div>

          </div>
        </section>

        {/* Absolute CTA Section */}
        <section className="py-24 border-t border-zinc-900 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-[#040405] to-[#09090b] pointer-events-none" />
          
          <div className="max-w-4xl mx-auto px-6 relative z-10 text-center space-y-8">
            <h2 className="text-3xl md:text-4xl font-black font-mono tracking-tight text-white uppercase leading-tight">Ready to synchronize your nodes?</h2>
            <p className="text-xs text-zinc-500 font-mono leading-relaxed max-w-md mx-auto">
              Initiate your central control gateway instantly. Launch secure Puppeteer posting runs right on your hardware.
            </p>
            <div className="pt-2">
              <button 
                onClick={() => navigate('/login')}
                className="px-8 py-4 rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 text-xs font-bold uppercase tracking-widest transition-all shadow-xl cursor-pointer transform hover:translate-y-[-1px] active:translate-y-[1px] inline-flex items-center gap-2.5"
              >
                Launch Distribution Console
                <ArrowRight className="w-4 h-4 animate-pulse" />
              </button>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-12 relative z-10 text-xs font-mono text-zinc-600">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-zinc-900 border border-zinc-850 rounded flex items-center justify-center">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">OMNIPOST DISTRIBUTED CORE</span>
          </div>

          <p className="text-center md:text-right text-[10px]">
            &copy; {new Date().getFullYear()} OmniPost • SSL Encryption Handshake Protocols • All Rights Secured
          </p>
        </div>
      </footer>
    </div>
  );
}
