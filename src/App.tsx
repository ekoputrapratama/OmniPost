/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { Post } from "./types";
import { 
  Terminal, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Bot, 
  RefreshCw,
  Copy,
  Check,
  LogOut,
  Plus
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { auth, GoogleAuthProvider, signInWithPopup, signOut, handleFirestoreError, OperationType } from "./firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { db } from "./firebase";
import { collection, query, where, getDocs, setDoc, doc, getDocFromServer } from "firebase/firestore";

const PLATFORMS = ["Twitter", "LinkedIn", "Facebook", "Instagram"];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaFiles, setMediaFiles] = useState<{name: string, type: string, data: string}[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["Twitter"]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  // Connect Account Modal State
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectPlatform, setConnectPlatform] = useState(PLATFORMS[0]);
  const [connectMethod, setConnectMethod] = useState<"credentials" | "session_cookie" | "desktop_app">("desktop_app");
  const [connectUsername, setConnectUsername] = useState("");
  const [connectPassword, setConnectPassword] = useState("");
  const [connectTwoFactor, setConnectTwoFactor] = useState("");
  const [connectSessionCookie, setConnectSessionCookie] = useState("");
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const t = await u.getIdToken();
        setToken(t);
      } else {
        setToken(null);
        setPosts([]);
        setConnectedAccounts([]);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error("Login failed", e);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const fetchPosts = async () => {
    if (!user) return;
    const collectionPath = 'posts';
    try {
      const q = query(collection(db, collectionPath), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => doc.data() as Post);
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPosts(data);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, collectionPath);
    }
  };

  const fetchAccounts = async () => {
    if (!user) return;
    const collectionPath = 'connectedAccounts';
    try {
      const q = query(collection(db, collectionPath), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => doc.data());
      setConnectedAccounts(data);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, collectionPath);
    }
  };

  useEffect(() => {
    if (token) {
      fetchPosts();
      fetchAccounts();
      const interval = setInterval(() => {
        fetchPosts();
        fetchAccounts();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const handleManualPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || selectedPlatforms.length === 0 || !user || !token) return;

    setLoading(true);
    try {
      // 1. If scheduling, validate inputs
      let scheduledForIso: string | undefined = undefined;
      if (isScheduled) {
        if (!scheduledDate || !scheduledTime) {
          alert("Please specify both a target date and time.");
          setLoading(false);
          return;
        }
        const schedDate = new Date(`${scheduledDate}T${scheduledTime}`);
        if (schedDate.getTime() <= Date.now()) {
          alert("Scheduled dispatch time must be in the future.");
          setLoading(false);
          return;
        }
        scheduledForIso = schedDate.toISOString();
      }

      // 2. Fetch connected accounts for this user from Firestore
      let credentialsList;
      try {
        const q = query(collection(db, 'connectedAccounts'), where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        credentialsList = querySnapshot.docs.map(doc => doc.data());
      } catch (e) {
        handleFirestoreError(e, OperationType.LIST, 'connectedAccounts');
        setLoading(false);
        return;
      }

      // 3. Prepare post object
      const newPost: Post = {
        id: crypto.randomUUID(),
        userId: user.uid,
        content,
        platforms: selectedPlatforms,
        status: isScheduled ? 'scheduled' : 'pending',
        scheduledFor: scheduledForIso,
        createdAt: new Date().toISOString(),
        mediaUrls: mediaFiles.map(f => f.name) // Dummy, actual will be set by server
      };

      // 4. Save to Firestore immediately
      try {
        await setDoc(doc(db, 'posts', newPost.id), newPost);
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, `posts/${newPost.id}`);
        setLoading(false);
        return;
      }

      // 5. Send to backend for publishing/scheduling
      const res = await fetch('/api/publish-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          post: newPost,
          credentialsList,
          mediaFiles
        })
      });

      if (res.ok) {
        setContent('');
        setSelectedPlatforms([]);
        setMediaFiles([]);
        setMediaUrl('');
        setIsScheduled(false);
        setScheduledDate('');
        setScheduledTime('');
        fetchPosts();
      } else {
        const err = await res.json();
        console.error('Publish failed:', err);
      }
    } catch (error) {
      console.error('Publishing error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFiles = (files: File[]) => {
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setMediaFiles(prev => [...prev, {
          name: file.name,
          type: file.type,
          data: ev.target?.result as string
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleConnectAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !token) return;

    setConnectLoading(true);
    try {
      let credentialsObj: any = { method: connectMethod };
      if (connectMethod === 'session_cookie') {
        credentialsObj.sessionCookie = connectSessionCookie;
      } else {
        credentialsObj.username = connectUsername;
        credentialsObj.password = connectPassword;
        if (connectTwoFactor) credentialsObj.twoFactorSecret = connectTwoFactor;
      }

      const encryptRes = await fetch('/api/encrypt-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ credentialsObj })
      });
      
      if (!encryptRes.ok) throw new Error('Encryption failed');
      const { encryptedData } = await encryptRes.json();

      const accountId = `${user.uid}_${connectPlatform.toLowerCase()}`;
      const accountData = {
        userId: user.uid,
        platform: connectPlatform,
        method: connectMethod,
        encryptedData,
        createdAt: new Date().toISOString()
      };

      try {
        await setDoc(doc(db, 'connectedAccounts', accountId), accountData);
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, `connectedAccounts/${accountId}`);
        setConnectLoading(false);
        return;
      }

      setConnectPlatform('');
      setConnectUsername('');
      setConnectPassword('');
      setConnectTwoFactor('');
      setConnectSessionCookie('');
      fetchAccounts();
    } catch (e) {
      console.error('Failed to connect account:', e);
    } finally {
      setConnectLoading(false);
    }
  };

  const togglePlatform = (p: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(`sk_${user?.uid}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading) {
    return (
      <div className="h-screen bg-[#050608] flex items-center justify-center">
        <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen bg-[#050608] flex flex-col items-center justify-center text-slate-300 font-sans selection:bg-cyan-500/30">
        <div className="w-16 h-16 bg-cyan-500 rounded-lg shadow-[0_0_30px_rgba(6,182,212,0.3)] flex items-center justify-center text-black font-bold mb-8">
          <Bot className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white uppercase mb-2">OmniPost</h1>
        <p className="text-sm text-slate-500 mb-8 max-w-sm text-center">AI Browser Automation Hub for seamless cross-platform publishing.</p>
        <button
          onClick={handleLogin}
          className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-6 py-3 text-sm font-bold uppercase tracking-widest text-white transition-all flex items-center gap-3"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Authenticate to System
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#050608] text-slate-300 font-sans selection:bg-cyan-500/30 flex flex-col overflow-hidden">
      {/* Header */}
      <nav className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-[#0a0c10]/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-cyan-500 rounded-sm shadow-[0_0_15px_rgba(6,182,212,0.5)] flex items-center justify-center text-black font-bold">
            <Bot className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white uppercase">
            OmniPost <span className="text-cyan-500">v1.0</span>
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-mono text-green-500 uppercase tracking-widest">Engine: Active</span>
          </div>
          <div className="text-[10px] font-mono text-slate-500 hidden sm:block">USER: {user.uid.substring(0, 8).toUpperCase()}</div>
          <button 
            onClick={handleLogout}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-red-500/20 border border-white/10 flex items-center justify-center text-slate-400 hover:text-red-400 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 gap-6 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto relative">
        {/* Left Column: API Docs & Manual Trigger */}
        <div className="lg:col-span-5 space-y-6 flex flex-col">
          
          {/* API Integration Card */}
          <div className="bg-[#0d1117] border border-white/5 rounded-xl p-5 relative overflow-hidden shrink-0">
            <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              Agent Integration
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">API Endpoint (POST)</label>
                <code className="block w-full bg-black/40 border border-white/5 rounded p-3 text-[10px] text-cyan-400 font-mono">
                  {window.location.origin}/api/agent/{user.uid}/publish
                </code>
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Auth Key</label>
                <div className="relative">
                  <code className="block w-full bg-black/40 border border-white/5 rounded p-3 pr-12 text-[10px] text-slate-300 font-mono">
                    Bearer sk_{user.uid}
                  </code>
                  <button 
                    type="button"
                    onClick={copyApiKey}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-white transition-colors rounded hover:bg-white/10"
                  >
                    {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Payload Schema</label>
                <pre className="block w-full bg-black/40 border border-white/5 rounded p-3 text-[10px] text-cyan-400 font-mono overflow-x-auto">
{`{
  "content": "Hello world!",
  "platforms": ["Twitter"],
  "mediaUrls": ["https://example.com/img.jpg"]
}`}
                </pre>
              </div>
            </div>
          </div>

          {/* Connected Accounts */}
          <div className="bg-[#0d1117] border border-white/5 rounded-xl p-5 shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Connected Social Media</h2>
              <button 
                onClick={() => setShowConnectModal(true)}
                className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-cyan-400 hover:text-cyan-300 bg-cyan-400/10 px-2 py-1 rounded border border-cyan-400/20 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
              >
                <Plus className="w-3 h-3" /> Connect Social Media
              </button>
            </div>
            {connectedAccounts.length === 0 ? (
              <div className="text-[10px] font-mono text-slate-600 uppercase border border-dashed border-white/10 rounded p-4 text-center">
                No social media connected.<br/>Connect an account to enable automation.
              </div>
            ) : (
              <div className="space-y-2">
                {connectedAccounts.map((acc, i) => (
                  <div key={i} className="flex items-center justify-between bg-black/40 border border-white/5 p-2 rounded">
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{acc.platform}</span>
                    <span className="text-[9px] font-mono text-green-500 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      SECURE
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Manual Post Card */}
          <div className="bg-[#0d1117] border border-white/5 rounded-xl p-5 flex-1 flex flex-col shrink-0 min-h-[350px]">
            <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Manual Post Creation</h2>
            <form onSubmit={handleManualPost} className="flex flex-col h-full flex-1">
              <div 
                className="relative flex-1 flex flex-col min-h-[120px] mb-4"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
              >
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Initialize payload content..."
                  className="flex-1 w-full bg-black/40 border border-white/5 rounded p-4 pb-8 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all resize-none font-mono"
                />
                <div className="absolute bottom-3 right-4 pointer-events-none text-[9px] text-slate-600 font-mono flex items-center gap-1 uppercase tracking-widest">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                  Drag & Drop Media
                </div>
              </div>
              
              {mediaFiles.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {mediaFiles.map((file, i) => (
                    <div key={i} className="relative w-16 h-16 rounded border border-white/10 overflow-hidden bg-black/50 shrink-0">
                      {file.type.startsWith('image') ? (
                        <img src={file.data} alt="preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[8px] font-mono text-slate-500 p-1 text-center break-all">
                          {file.name}
                        </div>
                      )}
                      <button 
                        type="button"
                        onClick={() => setMediaFiles(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-0.5 right-0.5 bg-red-500/80 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mb-4">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Media URL (Optional)</label>
                <input 
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full bg-black/40 border border-white/5 rounded p-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 font-mono placeholder-slate-600"
                />
              </div>

              <div className="mb-6">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block">Target Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePlatform(p)}
                      className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all duration-200 border ${
                        selectedPlatforms.includes(p)
                          ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
                          : "bg-black/40 border-white/5 text-slate-500 hover:border-white/10 hover:text-slate-300"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Schedule Dispatch</label>
                  <label className="inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isScheduled} 
                      onChange={(e) => setIsScheduled(e.target.checked)} 
                      className="sr-only peer" 
                    />
                    <div className="relative w-8 h-4 bg-black/50 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-slate-400 peer-checked:after:bg-cyan-400 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-cyan-500/10 border border-white/5 peer-checked:border-cyan-500/30"></div>
                  </label>
                </div>

                {isScheduled && (
                  <div className="grid grid-cols-2 gap-2 animate-fade-in">
                    <div>
                      <label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1 block">Date</label>
                      <input 
                        type="date" 
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="w-full bg-black/40 border border-white/5 rounded p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 font-mono"
                        required={isScheduled}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1 block">Time</label>
                      <input 
                        type="time" 
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="w-full bg-black/40 border border-white/5 rounded p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 font-mono"
                        required={isScheduled}
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !content.trim() || selectedPlatforms.length === 0}
                className="mt-auto w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded py-3 text-[10px] font-bold uppercase tracking-widest text-slate-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                ) : isScheduled ? (
                  <Clock className="w-4 h-4 text-cyan-400" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {loading ? "Allocating Instance..." : isScheduled ? "Schedule Payload" : "Dispatch Payload"}
              </button>
            </form>
          </div>

        </div>

        {/* Right Column: Execution Log / Feed */}
        <div className="lg:col-span-7 flex flex-col min-h-[500px]">
          <div className="bg-[#0d1117] border border-white/5 rounded-2xl flex flex-col flex-1 overflow-hidden">
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Execution Queue</h3>
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-slate-700 rounded-full"></div>
                <div className="w-2 h-2 bg-slate-700 rounded-full"></div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-black/20">
              {posts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-600 space-y-4 py-20 font-mono text-[10px] uppercase tracking-widest">
                  <div className="w-12 h-12 rounded border border-white/5 flex items-center justify-center bg-white/5">
                    <Terminal className="w-5 h-5 text-slate-500" />
                  </div>
                  <p>Awaiting incoming payloads<br/>from automated nodes...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <div key={post.id} className="relative bg-[#0d1117] border border-white/5 rounded-xl p-5 shadow-lg">
                      <div className="absolute top-0 right-0 p-4">
                        <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${
                          post.status === "published" ? "text-green-500" :
                          post.status === "publishing" ? "text-cyan-400" :
                          post.status === "scheduled" ? "text-cyan-400" :
                          post.status === "pending" ? "text-slate-400" :
                          "text-red-400"
                        }`}>
                          {post.status === "published" && <><CheckCircle2 className="w-3 h-3" /> Published</>}
                          {post.status === "publishing" && <><RefreshCw className="w-3 h-3 animate-spin" /> Processing</>}
                          {post.status === "scheduled" && <><Clock className="w-3 h-3 text-cyan-400" /> Scheduled</>}
                          {post.status === "pending" && <><Clock className="w-3 h-3" /> Queued</>}
                          {post.status === "failed" && <><AlertCircle className="w-3 h-3" /> Failed</>}
                        </div>
                      </div>
                      
                      <h2 className="text-[10px] font-mono text-cyan-500 mb-3 uppercase tracking-widest">
                        Incoming from [NODE-{post.id.split("-")[0]}]
                      </h2>
                      
                      <p className="text-lg font-light text-white mb-6 italic leading-relaxed whitespace-pre-wrap">
                        "{post.content}"
                      </p>
                      
                      {post.mediaUrls && post.mediaUrls.length > 0 && (
                        <div className="mb-6 grid grid-cols-2 gap-2">
                          {post.mediaUrls.map((url, i) => (
                            <img key={i} src={url} alt={`Media ${i}`} className="w-full h-32 object-cover rounded-lg border border-white/10" referrerPolicy="no-referrer" />
                          ))}
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="bg-white/5 border border-white/5 rounded-lg p-3">
                          <div className="text-[9px] uppercase text-slate-500 mb-1 font-bold tracking-widest">Targets</div>
                          <div className="text-xs text-slate-300 font-mono truncate">{post.platforms.join(", ")}</div>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-lg p-3">
                          <div className="text-[9px] uppercase text-slate-500 mb-1 font-bold tracking-widest">Status</div>
                          <div className="text-xs text-slate-300 font-mono uppercase">{post.status}</div>
                        </div>
                        <div className="bg-white/5 border border-white/5 rounded-lg p-3 col-span-2 md:col-span-1">
                          <div className="text-[9px] uppercase text-slate-500 mb-1 font-bold tracking-widest">
                            {post.status === "scheduled" ? "Scheduled For" : "Timestamp"}
                          </div>
                          <div className="text-xs font-mono text-slate-300 truncate">
                            {post.status === "scheduled" && post.scheduledFor
                              ? formatDistanceToNow(new Date(post.scheduledFor), { addSuffix: true })
                              : post.publishedAt 
                                ? formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true }) 
                                : formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Connect Modal */}
        {showConnectModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                <h3 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Connect Social Media Account</h3>
                <button onClick={() => setShowConnectModal(false)} className="text-slate-500 hover:text-white">✕</button>
              </div>
              <form onSubmit={handleConnectAccount} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Platform</label>
                    <select 
                      value={connectPlatform}
                      onChange={(e) => setConnectPlatform(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded p-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
                    >
                      {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  
                  <div className="flex gap-2 p-1 bg-black/40 border border-white/5 rounded-lg mb-4 mt-2">
                    <button
                      type="button"
                      onClick={() => setConnectMethod("desktop_app")}
                      className={`flex-1 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-all ${
                        connectMethod === "desktop_app" 
                          ? "bg-cyan-500/20 text-cyan-400 shadow-sm border border-cyan-500/30" 
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      Desktop Companion
                    </button>
                    <button
                      type="button"
                      onClick={() => setConnectMethod("session_cookie")}
                      className={`flex-1 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-all ${
                        connectMethod === "session_cookie" 
                          ? "bg-white/10 text-cyan-400 shadow-sm" 
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      Session Cookie
                    </button>
                    <button
                      type="button"
                      onClick={() => setConnectMethod("credentials")}
                      className={`flex-1 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-all ${
                        connectMethod === "credentials" 
                          ? "bg-white/10 text-white shadow-sm" 
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      Login Details
                    </button>
                  </div>

                  {connectMethod === "desktop_app" && (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-4 text-cyan-400">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h4 className="text-slate-200 font-bold mb-2">Omnipost Desktop Companion</h4>
                      <p className="text-[11px] text-slate-400 mb-6 max-w-sm leading-relaxed">
                        For platforms with strict 2FA like X/Twitter, launch the Desktop Companion App. It will securely authenticate you in a native window and seamlessly sync your active session back to the automation engine.
                      </p>
                      
                      <a 
                        href={`omnipost://connect?platform=${connectPlatform}&token=${token}`}
                        className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/30 px-6 py-2.5 rounded text-[11px] font-bold uppercase tracking-widest transition-colors shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                      >
                        Launch Companion App
                      </a>
                      
                      <div className="mt-6 pt-4 border-t border-white/5 w-full text-center">
                        <p className="text-[9px] text-slate-500 mb-2 font-mono uppercase tracking-widest">Don't have the companion app?</p>
                        <a href="#" className="text-[10px] text-cyan-500/70 hover:text-cyan-400 underline decoration-cyan-500/30">Download for Mac & Windows</a>
                      </div>
                    </div>
                  )}

                  {connectMethod === "credentials" && (
                    <>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Username / Email</label>
                        <input 
                          type="text" 
                          value={connectUsername}
                          onChange={(e) => setConnectUsername(e.target.value)}
                          className="w-full bg-black/40 border border-white/5 rounded p-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 font-mono"
                          required={connectMethod === "credentials"}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Password</label>
                        <input 
                          type="password" 
                          value={connectPassword}
                          onChange={(e) => setConnectPassword(e.target.value)}
                          className="w-full bg-black/40 border border-white/5 rounded p-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 font-mono"
                          required={connectMethod === "credentials"}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex justify-between">
                          <span>2FA Setup Key (Authenticator Secret)</span>
                          <span className="text-slate-600 normal-case font-normal">(Optional)</span>
                        </label>
                        <input 
                          type="text" 
                          value={connectTwoFactor}
                          onChange={(e) => setConnectTwoFactor(e.target.value)}
                          className="w-full bg-black/40 border border-white/5 rounded p-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 font-mono"
                          placeholder="e.g. JBSWY3DPEHPK3PXP"
                        />
                        <p className="text-[9px] text-slate-500 mt-2 font-mono">
                          To bypass 2FA prompts automatically, provide the Base32 setup key given when configuring your Authenticator App. The engine will generate the 6-digit codes on the fly.
                        </p>
                      </div>
                    </>
                  )}
                  
                  {connectMethod === "session_cookie" && (
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Session Cookie (auth_token, sessionid, etc.)</label>
                      <textarea 
                        value={connectSessionCookie}
                        onChange={(e) => setConnectSessionCookie(e.target.value)}
                        className="w-full bg-black/40 border border-white/5 rounded p-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 font-mono min-h-[100px] resize-none"
                        placeholder="Paste your raw session cookie here to bypass login and 2FA completely."
                        required={connectMethod === "session_cookie"}
                      />
                      <p className="text-[9px] text-slate-500 mt-2 font-mono">
                        Extract this from your browser's Developer Tools (Application &gt; Cookies) while logged in. This completely bypasses the login flow and 2FA prompts.
                      </p>
                    </div>
                  )}
                </div>
                <div className="mt-8 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setShowConnectModal(false)}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded text-[10px] font-bold uppercase tracking-widest transition-colors"
                  >
                    {connectMethod === "desktop_app" ? "Close" : "Cancel"}
                  </button>
                  
                  {connectMethod !== "desktop_app" && (
                    <button 
                      type="submit" 
                      disabled={connectLoading || (connectMethod === "credentials" ? (!connectUsername || !connectPassword) : !connectSessionCookie)}
                      className="flex-1 py-3 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/50 rounded text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
                    >
                      {connectLoading ? "Encrypting..." : "Secure & Connect"}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

      </main>

      {/* Status Bar */}
      <footer className="h-8 bg-[#0a0c10] border-t border-white/5 flex items-center justify-between px-6 text-[10px] font-mono text-slate-600 shrink-0">
        <div className="flex gap-4">
          <span>NODE: WEST-US-1</span>
          <span>LATENCY: 42MS</span>
          <span className="hidden sm:inline">INSTANCES: ACTIVE</span>
        </div>
        <div>OMNIPOST ENGINE v1.0-STABLE</div>
      </footer>
    </div>
  );
}

