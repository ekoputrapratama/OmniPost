/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
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
  Plus,
  Trash2,
  Image,
  Cpu, 
  Layers, 
  Globe, 
  Sliders, 
  Calendar, 
  Paperclip, 
  ExternalLink, 
  Eye, 
  Settings, 
  Zap, 
  Sparkles, 
  Activity, 
  Video, 
  Info, 
  X, 
  ChevronRight,
  Download
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { 
  auth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  handleFirestoreError, 
  OperationType,
  db,
  isMockFirebase,
  collection,
  query,
  where,
  getDocs,
  setDoc,
  doc,
  getDocFromServer,
  storage,
  storageRef,
  uploadBytes,
  getDownloadURL
} from "./firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import AnalyticsPanel from "./components/AnalyticsPanel";
import LandingPage from "./components/LandingPage";
import { LoginPage } from "./components/LoginPage";

const PLATFORMS = ["Twitter", "Facebook", "Instagram", "Bluesky", "Pinterest", "TikTok"];

const isVideoUrl = (url: string) => {
  if (!url) return false;
  const cleanUrl = url.split(/[?#]/)[0];
  return /\.(mp4|mov|webm|m4v|ogv|3gp|mkv)$/i.test(cleanUrl) || url.toLowerCase().includes("video") || url.startsWith("data:video");
};

const extractVideoThumbnail = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    video.src = url;

    const timeout = setTimeout(() => {
      cleanup();
      resolve("");
    }, 4000);

    const cleanup = () => {
      clearTimeout(timeout);
      try {
        video.src = "";
        video.load();
      } catch (e) {}
      URL.revokeObjectURL(url);
    };

    video.onloadedmetadata = () => {
      const duration = video.duration || 0;
      const seekTime = duration > 0 ? Math.min(1.5, duration / 2) : 1;
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 180;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
          cleanup();
          resolve(dataUrl);
        } else {
          cleanup();
          resolve("");
        }
      } catch (err) {
        console.error("Error drawing video frame:", err);
        cleanup();
        resolve("");
      }
    };

    video.onerror = () => {
      cleanup();
      resolve("");
    };
  });
};

function SocialPreview({ content, mediaFiles, mediaUrl, platform }: { content: string, mediaFiles: any[], mediaUrl: string, platform: string }) {
  const firstMedia = mediaFiles[0];
  const previewMediaUrl = firstMedia?.url || firstMedia?.data || mediaUrl;
  const isVideo = firstMedia ? firstMedia.type.startsWith('video') : isVideoUrl(mediaUrl);

  const renderMedia = () => {
    if (!previewMediaUrl) return null;
    if (isVideo) {
      return (
        <div className="relative mt-3 rounded-xl border border-zinc-800/80 overflow-hidden bg-black aspect-video max-h-60 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center text-white">
              <svg className="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
          <video src={previewMediaUrl} poster={firstMedia?.thumbnail} className="w-full h-full object-cover" muted />
        </div>
      );
    }
    return (
      <img 
        src={previewMediaUrl} 
        alt="Preview attachment" 
        className="mt-3 rounded-xl border border-zinc-800/80 w-full object-cover max-h-60" 
        referrerPolicy="no-referrer" 
      />
    );
  };

  switch (platform.toLowerCase()) {
    case "twitter":
    case "bluesky":
      return (
        <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-xl text-sm font-sans text-left">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300 font-bold shrink-0 border border-zinc-700">
              O
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-zinc-100 hover:underline cursor-pointer">OmniPublisher</span>
                <span className="text-xs text-zinc-500">@omnipost • 1s</span>
              </div>
              <p className="text-zinc-200 mt-1.5 whitespace-pre-wrap leading-relaxed break-words">{content || "Start typing your dispatch payload to preview..."}</p>
              {renderMedia()}
              <div className="flex justify-between items-center text-zinc-500 mt-4 max-w-xs text-xs">
                <span className="flex items-center gap-1 hover:text-cyan-400 cursor-pointer"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> 0</span>
                <span className="flex items-center gap-1 hover:text-green-400 cursor-pointer"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.248 8H15V3" /></svg> 0</span>
                <span className="flex items-center gap-1 hover:text-red-400 cursor-pointer"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg> 0</span>
                <span className="flex items-center gap-1 hover:text-blue-400 cursor-pointer"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg></span>
              </div>
            </div>
          </div>
        </div>
      );
    case "instagram":
      return (
        <div className="bg-zinc-950 border border-zinc-850 rounded-xl overflow-hidden font-sans max-w-sm mx-auto text-sm text-left">
          <div className="p-3 flex items-center justify-between border-b border-zinc-900 bg-zinc-950/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 via-red-500 to-purple-600 p-[1.5px]">
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-zinc-300 font-bold text-xs">
                  O
                </div>
              </div>
              <div>
                <span className="font-bold text-zinc-100 block text-xs">omnipost</span>
                <span className="text-[10px] text-zinc-500 block">Original Audio</span>
              </div>
            </div>
            <span className="text-zinc-400 font-bold hover:text-white cursor-pointer">•••</span>
          </div>
          <div className="bg-zinc-900/60 flex items-center justify-center aspect-square overflow-hidden relative border-y border-zinc-900">
            {previewMediaUrl ? (
              isVideo ? (
                <video src={previewMediaUrl} poster={firstMedia?.thumbnail} className="w-full h-full object-cover animate-fade-in" p-1="true" muted autoPlay loop />
              ) : (
                <img src={previewMediaUrl} alt="Instagram preview" className="w-full h-full object-cover animate-fade-in" />
              )
            ) : (
              <div className="flex flex-col items-center justify-center text-zinc-600 gap-2 p-6 text-center">
                <svg className="w-8 h-8 stroke-current opacity-50" fill="none" viewBox="0 0 24 24" strokeWidth="1.5"><path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 002.25 1.5z" /></svg>
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">No Media Selected</p>
              </div>
            )}
          </div>
          <div className="p-4 bg-zinc-950">
            <div className="flex justify-between items-center text-zinc-200 mb-3">
              <div className="flex gap-4">
                <svg className="w-5 h-5 hover:text-red-500 cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                <svg className="w-5 h-5 hover:text-blue-400 cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                <svg className="w-5 h-5 hover:text-green-400 cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684" /></svg>
              </div>
              <svg className="w-5 h-5 hover:text-yellow-500 cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
            </div>
            <div className="space-y-1">
              <p className="font-bold text-zinc-100 text-xs">1,248 likes</p>
              <p className="text-zinc-200 text-xs leading-relaxed">
                <span className="font-bold text-zinc-100 mr-2 cursor-pointer hover:underline">omnipost</span>
                <span className="whitespace-pre-wrap">{content || "Start typing your dispatch payload..."}</span>
              </p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-2 block">1 second ago</p>
            </div>
          </div>
        </div>
      );
    case "tiktok":
      return (
        <div className="bg-black border border-zinc-850 rounded-xl overflow-hidden font-sans relative aspect-[9/16] max-w-[240px] mx-auto text-white shadow-2xl text-left">
          {previewMediaUrl ? (
            isVideo ? (
              <video src={previewMediaUrl} poster={firstMedia?.thumbnail} className="w-full h-full object-cover" muted autoPlay loop />
            ) : (
              <img src={previewMediaUrl} alt="TikTok preview" className="w-full h-full object-cover" />
            )
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 gap-2 p-6 text-center bg-zinc-950">
              <svg className="w-8 h-8 stroke-current opacity-40" fill="none" viewBox="0 0 24 24" strokeWidth="1.5"><path d="M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" /></svg>
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Video Required</p>
            </div>
          )}
          
          <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4 z-10 text-xs">
            <div className="relative">
              <div className="w-9 h-9 rounded-full border border-white/20 bg-zinc-850 flex items-center justify-center text-white font-bold text-sm">O</div>
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#ff0050] rounded-full flex items-center justify-center text-[10px] font-bold">+</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 cursor-pointer"><svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09" /></svg></div>
              <span className="text-[10px] font-medium">1.2k</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 cursor-pointer"><svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4" /></svg></div>
              <span className="text-[10px] font-medium">84</span>
            </div>
          </div>

          <div className="absolute left-3 bottom-4 right-14 text-xs z-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5 rounded-xl">
            <p className="font-bold">@omnipost</p>
            <p className="mt-1 font-normal opacity-90 line-clamp-2 leading-relaxed">{content || "Start typing content..."}</p>
            <div className="flex items-center gap-1.5 mt-2 opacity-80">
              <span className="w-3.5 h-3.5 animate-spin">🎵</span>
              <p className="text-[10px] truncate max-w-[120px]">Original Audio - omnipost</p>
            </div>
          </div>
        </div>
      );
    default:
      return (
        <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-5 text-sm text-left">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300 font-bold">O</div>
            <div>
              <span className="font-bold text-zinc-100 block">{platform} Preview</span>
              <span className="text-xs text-zinc-500">Scheduled Dispatch Node</span>
            </div>
          </div>
          <p className="text-zinc-200 mt-2 whitespace-pre-wrap leading-relaxed break-words">{content || "Start typing your dispatch payload to preview..."}</p>
          {renderMedia()}
        </div>
      );
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaFiles, setMediaFiles] = useState<{id?: string, name: string, type: string, data: string, uploading?: boolean, url?: string, thumbnail?: string, error?: string}[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const [disconnectingPlatform, setDisconnectingPlatform] = useState<string | null>(null);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activePreviewTab, setActivePreviewTab] = useState<string>("Twitter");
  const [rightTab, setRightTab] = useState<"queue" | "analytics">("queue");
  const [apiDocTab, setApiDocTab] = useState<"curl" | "json" | "node">("curl");
  const [snippetCopied, setSnippetCopied] = useState(false);

  useEffect(() => {
    async function testConnection() {
      if (isMockFirebase) return;
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
      if (isMockFirebase) return; // Managed locally
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
    
    if (isMockFirebase) {
      setAuthLoading(false);
    }
    
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    if (isMockFirebase) {
      const mockUser = {
        uid: "demo_user_123",
        email: "demo@omnipost.io",
        displayName: "Demo Publisher",
        getIdToken: async () => {
          const payload = { user_id: "demo_user_123" };
          const base64Payload = btoa(JSON.stringify(payload));
          return `header.${base64Payload}.signature`;
        }
      };
      setUser(mockUser as any);
      const t = await mockUser.getIdToken();
      setToken(t);
      return;
    }

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error("Login failed", e);
    }
  };

  const handleLogout = async () => {
    if (isMockFirebase) {
      setUser(null);
      setToken(null);
      setPosts([]);
      setConnectedAccounts([]);
      return;
    }
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

    // Check if any media files are still uploading
    if (mediaFiles.some(f => f.uploading)) {
      setErrorMessage("Please wait for all media files to finish uploading.");
      return;
    }

    // Instagram validation: require at least one media file
    if (selectedPlatforms.some(plat => plat.toLowerCase() === "instagram") && mediaFiles.length === 0) {
      setErrorMessage("Instagram is a visual-first platform and strictly requires at least one image or video to create a post. Please attach a media file.");
      return;
    }

    // Pinterest validation: require at least one media file
    if (selectedPlatforms.some(plat => plat.toLowerCase() === "pinterest") && mediaFiles.length === 0) {
      setErrorMessage("Pinterest is an image-centric platform and strictly requires at least one image or video to create a Pin. Please attach a media file.");
      return;
    }

    // TikTok validation: require at least one media file
    if (selectedPlatforms.some(plat => plat.toLowerCase() === "tiktok") && mediaFiles.length === 0) {
      setErrorMessage("TikTok is a video-centric platform and strictly requires at least one video (or image) to create a post. Please attach a media file.");
      return;
    }

    setLoading(true);
    try {
      // 1. If scheduling, validate inputs
      let scheduledForIso: string | undefined = undefined;
      if (isScheduled) {
        if (!scheduledDate || !scheduledTime) {
          setErrorMessage("Please specify both a target date and time.");
          setLoading(false);
          return;
        }
        const schedDate = new Date(`${scheduledDate}T${scheduledTime}`);
        if (schedDate.getTime() <= Date.now()) {
          setErrorMessage("Scheduled dispatch time must be in the future.");
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
        createdAt: new Date().toISOString(),
        mediaUrls: mediaFiles.map(f => f.url || f.name), // Use storage URL if uploaded, fallback to name
        thumbnails: mediaFiles.map(f => f.thumbnail || "")
      };

      if (scheduledForIso !== undefined) {
        newPost.scheduledFor = scheduledForIso;
      }

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
          mediaFiles: mediaFiles.filter(f => !f.url) // Only send files that don't have direct Storage URLs
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
    files.forEach(async (file) => {
      const tempId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(2);
      
      let thumbnailDataUrl: string | undefined = undefined;
      if (file.type.startsWith('video')) {
        try {
          thumbnailDataUrl = await extractVideoThumbnail(file);
        } catch (err) {
          console.error("Failed to extract video thumbnail:", err);
        }
      }

      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64Data = ev.target?.result as string;
        const useFirebaseStorage = !isMockFirebase && storage && !storage.isMock;

        // 1. Insert file state with uploading indicator
        setMediaFiles(prev => [...prev, {
          id: tempId,
          name: file.name,
          type: file.type,
          data: base64Data,
          thumbnail: thumbnailDataUrl,
          uploading: !!useFirebaseStorage
        }]);

        // 2. If storage is available, upload immediately
        if (useFirebaseStorage) {
          try {
            const ext = file.name.split('.').pop() || 'jpg';
            const storagePath = `users/${user?.uid}/media/${crypto.randomUUID()}.${ext}`;
            const fileRef = storageRef(storage, storagePath);

            const response = await fetch(base64Data);
            const blob = await response.blob();

            const uploadResult = await uploadBytes(fileRef, blob, {
              contentType: file.type
            });
            const downloadUrl = await getDownloadURL(uploadResult.ref);

            // Update the file state with resolved URL
            setMediaFiles(prev => prev.map(f => f.id === tempId ? {
              ...f,
              uploading: false,
              url: downloadUrl
            } : f));
          } catch (err: any) {
            console.error("Firebase Storage upload failed, falling back to local base64:", err);
            setMediaFiles(prev => prev.map(f => f.id === tempId ? {
              ...f,
              uploading: false,
              error: err.message || "Upload failed"
            } : f));
          }
        }
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
        expired: false,
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

  const handleDisconnectAccount = (platform: string) => {
    setShowDisconnectConfirm(platform);
  };

  const executeDisconnectAccount = async (platform: string) => {
    if (!token) return;
    
    setDisconnectingPlatform(platform);
    setShowDisconnectConfirm(null);
    try {
      const res = await fetch(`/api/accounts/${platform.toLowerCase()}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        fetchAccounts();
      } else {
        const errData = await res.json();
        setErrorMessage(errData.error || `Failed to disconnect ${platform} account.`);
      }
    } catch (err) {
      console.error(`Error disconnecting ${platform}:`, err);
      setErrorMessage(`Error disconnecting ${platform} account.`);
    } finally {
      setDisconnectingPlatform(null);
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

  const getCharLimit = (platform: string): number => {
    switch (platform.toLowerCase()) {
      case "twitter": return 280;
      case "bluesky": return 300;
      case "pinterest": return 500;
      case "tiktok": return 2200;
      case "instagram": return 2200;
      case "facebook": return 5000;
      default: return 280;
    }
  };

  const getApiSnippet = (): string => {
    const uid = user?.uid || "your_account_uid";
    switch (apiDocTab) {
      case "curl":
        return `curl -X POST https://omnipost-hub.ai.studio/api/v1/publish \\
  -H "Authorization: Bearer sk_${uid}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "${content.replace(/"/g, '\\"').replace(/\n/g, '\\n') || "Hello from OmniPost!"}",
    "platforms": ${JSON.stringify(selectedPlatforms.length > 0 ? selectedPlatforms : ["Twitter"])}
  }'`;
      case "json":
        return `{
  "content": "${content.replace(/"/g, '\\"').replace(/\n/g, '\\n') || "Hello from OmniPost!"}",
  "platforms": ${JSON.stringify(selectedPlatforms.length > 0 ? selectedPlatforms : ["Twitter"])},
  "mediaUrls": ${JSON.stringify(mediaFiles.map(f => f.url || "https://example.com/media.png"))}
}`;
      case "node":
        return `const res = await fetch('https://omnipost-hub.ai.studio/api/v1/publish', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_${uid}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    content: '${content.replace(/'/g, "\\'").replace(/\n/g, '\\n') || "Hello from OmniPost!"}',
    platforms: ${JSON.stringify(selectedPlatforms.length > 0 ? selectedPlatforms : ["Twitter"])}
  })
});
console.log(await res.json());`;
      default:
        return "";
    }
  };

  const copySnippet = () => {
    navigator.clipboard.writeText(getApiSnippet());
    setSnippetCopied(true);
    setTimeout(() => setSnippetCopied(false), 2000);
  };

  const isPublishDisabled = 
    !content.trim() || 
    selectedPlatforms.length === 0 || 
    loading || 
    mediaFiles.some(f => f.uploading) || 
    selectedPlatforms.some(p => content.length > getCharLimit(p));

  if (authLoading) {
    return (
      <div className="h-screen bg-[#09090b] flex flex-col items-center justify-center relative overflow-hidden">
        {/* Background Grids */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/60 via-[#09090b] to-[#040405] opacity-80 pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808003_1px,transparent_1px),linear-gradient(to_bottom,#80808003_1px,transparent_1px)] bg-[size:16px_24px] pointer-events-none" />
        
        <div className="relative flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent opacity-60 animate-pulse" />
            <Bot className="w-8 h-8 text-emerald-400 animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <div className="mt-6 flex flex-col items-center gap-2">
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Allocating Secure Container</p>
            <div className="w-32 h-1 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/40">
              <div className="h-full bg-emerald-500 rounded-full animate-progress-bar w-[60%]" style={{ animation: 'progress 1.5s infinite ease-in-out' }} />
            </div>
          </div>
        </div>
        
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes progress {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}} />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage onLogin={handleLogin} />} />
      <Route path="/dashboard" element={
        !user ? <Navigate to="/login" replace /> : (
    <div className="h-screen bg-[#09090b] text-zinc-300 font-sans selection:bg-emerald-500/30 flex flex-col overflow-hidden relative">
      {/* Dynamic Cyber Dot Overlay and subtle top glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/40 via-[#09090b] to-[#040405] opacity-80 pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808003_1px,transparent_1px),linear-gradient(to_bottom,#80808003_1px,transparent_1px)] bg-[size:16px_24px] pointer-events-none" />

      {/* Header */}
      <header className="h-14 border-b border-zinc-800/80 flex items-center justify-between px-6 bg-zinc-950/60 backdrop-blur-md shrink-0 relative z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent" />
            <Bot className="w-4.5 h-4.5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white uppercase font-mono flex items-center gap-1.5">
              OmniPost <span className="text-[10px] text-zinc-500 font-normal">v1.0.4</span>
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-lg">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider">Node West: Active</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-lg">
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Latency: </span>
            <span className="text-[9px] font-mono text-emerald-400">42ms</span>
          </div>
          <div className="text-[9px] font-mono text-zinc-500 hidden sm:block bg-zinc-900/40 border border-zinc-800/40 px-2.5 py-1 rounded-lg">
            UID: {user.uid.substring(0, 8).toUpperCase()}
          </div>
          <button 
            onClick={handleLogout}
            className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-red-950/40 border border-zinc-800 hover:border-red-500/30 flex items-center justify-center text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 gap-6 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto relative z-10">
        {/* Left Column: API Gateway & Account Sync */}
        <div className="lg:col-span-4 space-y-6 flex flex-col min-w-0">
          
          {/* API Gateway Panel */}
          <div className="bg-zinc-900/40 border border-zinc-800/85 rounded-2xl p-5 relative overflow-hidden shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                API Gateway
              </h2>
              <span className="text-[9px] font-mono bg-zinc-950 border border-zinc-800/60 text-zinc-500 px-1.5 py-0.5 rounded font-bold uppercase">SSL</span>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Bearer Token Key</label>
                <div className="relative">
                  <code className="block w-full bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3 pr-10 text-[10px] text-zinc-400 font-mono truncate">
                    sk_{user.uid}
                  </code>
                  <button 
                    type="button"
                    onClick={copyApiKey}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* API Language Tabs */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Integration Code</label>
                  <div className="flex gap-1 p-0.5 bg-zinc-950 border border-zinc-850 rounded-lg">
                    {(["curl", "json", "node"] as const).map(lang => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setApiDocTab(lang)}
                        className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase transition-all cursor-pointer ${
                          apiDocTab === lang 
                            ? "bg-zinc-800 text-white" 
                            : "text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative group">
                  <pre className="block w-full bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-3.5 text-[9px] text-emerald-400 font-mono overflow-x-auto max-h-40 leading-relaxed scrollbar-thin">
                    {getApiSnippet()}
                  </pre>
                  <button 
                    type="button"
                    onClick={copySnippet}
                    className="absolute right-2.5 top-2.5 p-1.5 text-zinc-500 hover:text-white transition-colors rounded-lg bg-zinc-900 border border-zinc-850 opacity-0 group-hover:opacity-100 shadow"
                  >
                    {snippetCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Connected Accounts Manager */}
          <div className="bg-zinc-900/40 border border-zinc-800/85 rounded-2xl p-5 shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                Active Channels
              </h2>
              <button 
                onClick={() => setShowConnectModal(true)}
                className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1.5 rounded-xl border border-emerald-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Connect Channel
              </button>
            </div>

            {connectedAccounts.length === 0 ? (
              <div className="text-[10px] font-mono text-zinc-500 uppercase border border-dashed border-zinc-800/80 rounded-xl p-5 text-center bg-zinc-950/20">
                No active channels linked.<br/>Connect below to enable automated dispatch.
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto scrollbar-thin pr-1">
                {connectedAccounts.map((acc, i) => (
                  <div key={i} className="flex flex-col gap-1.5 bg-zinc-950/40 border border-zinc-850 p-2.5 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${acc.expired ? "bg-red-500 animate-pulse" : "bg-emerald-500 animate-pulse"}`} />
                        <span className="text-[10px] font-bold text-zinc-200 uppercase tracking-wider">{acc.platform}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {acc.expired ? (
                          <span className="text-[8px] font-mono text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded font-bold uppercase animate-pulse">
                            EXPIRED
                          </span>
                        ) : (
                          <span className="text-[8px] font-mono text-emerald-500 bg-emerald-500/5 border border-emerald-500/10 px-1.5 py-0.5 rounded font-bold uppercase">
                            SECURE
                          </span>
                        )}
                        {acc.expired && (
                          <button
                            onClick={() => {
                              setConnectPlatform(acc.platform);
                              setShowConnectModal(true);
                            }}
                            className="text-emerald-400 hover:text-emerald-300 p-1 rounded-lg hover:bg-emerald-500/10 transition-colors cursor-pointer"
                            title={`Reconnect ${acc.platform}`}
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDisconnectAccount(acc.platform)}
                          disabled={disconnectingPlatform === acc.platform}
                          className="text-zinc-500 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-50 cursor-pointer"
                          title={`Disconnect ${acc.platform}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {acc.expired && (
                      <div className="text-[8px] font-mono text-red-400 bg-red-950/20 border border-red-950/40 px-2 py-1 rounded-md leading-normal">
                        <span className="font-bold">Error:</span> {acc.lastError || "Session expired. Please click reconnect icon above to update your session cookies."}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center Column: Publishing Command Center & Live Previews */}
        <div className="lg:col-span-4 space-y-6 flex flex-col min-w-0">
            
            {/* Publisher Workspace */}
            <div className="bg-zinc-900/40 border border-zinc-800/85 rounded-2xl p-5 flex flex-col shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                  Publishing Hub
                </h2>
                <div className="flex items-center gap-1.5 font-mono text-[9px] text-zinc-500 bg-zinc-950 border border-zinc-800/40 px-2 py-0.5 rounded">
                  <span>{content.length} CHARS</span>
                  <span className="text-zinc-700">•</span>
                  <span>{content.split(/\s+/).filter(Boolean).length} WORDS</span>
                </div>
              </div>
              
              <form onSubmit={handleManualPost} className="flex flex-col gap-4">
                <div 
                  className="relative flex flex-col min-h-[140px]"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                >
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Enter post details, paste hashtags, or drop payload content..."
                    className="flex-1 w-full bg-zinc-950/60 border border-zinc-850 rounded-xl p-4 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-all resize-none font-mono min-h-[140px] leading-relaxed"
                  />
                  <div className="absolute bottom-3 right-4 pointer-events-none text-[8px] text-zinc-600 font-mono flex items-center gap-1 uppercase tracking-widest">
                    <Paperclip className="w-3 h-3" />
                    Drop files here
                  </div>
                </div>

                {/* Media Attachment Actions */}
                <div className="flex items-center justify-between bg-zinc-950/30 border border-zinc-850 p-2 rounded-xl">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleFiles(Array.from(e.target.files));
                        }
                        e.target.value = '';
                      }}
                      multiple
                      accept="image/*,video/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400 hover:text-white transition-colors bg-emerald-500/5 hover:bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/10 cursor-pointer"
                    >
                      <Image className="w-3.5 h-3.5" />
                      Attach Media
                    </button>
                  </div>
                  <span className="text-[8px] text-zinc-600 font-mono uppercase tracking-widest hidden sm:inline">
                    JPG, PNG, MP4 Supported
                  </span>
                </div>
                
                {/* File Attachment Trays */}
                {mediaFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-2 bg-zinc-950/20 border border-zinc-850 rounded-xl">
                    {mediaFiles.map((file, i) => (
                      <div key={i} className="relative w-14 h-14 rounded-lg border border-zinc-850 overflow-hidden bg-zinc-950 shrink-0">
                        {file.type.startsWith('image') ? (
                          <img src={file.url || file.data} alt="preview" className="w-full h-full object-cover" />
                        ) : file.thumbnail ? (
                          <img src={file.thumbnail} alt="video thumbnail" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[7px] font-mono text-zinc-500 p-1 text-center break-all">
                            {file.name}
                          </div>
                        )}
                        
                        {file.uploading && (
                          <div className="absolute inset-0 bg-zinc-950/80 flex flex-col items-center justify-center">
                            <RefreshCw className="w-4.5 h-4.5 text-emerald-400 animate-spin" />
                          </div>
                        )}
                        {file.error && (
                          <div className="absolute inset-0 bg-red-950/90 flex flex-col items-center justify-center p-1 text-center" title={file.error}>
                            <AlertCircle className="w-4 h-4 text-red-400" />
                          </div>
                        )}
                        {!file.uploading && !file.error && file.url && (
                          <div className="absolute bottom-1 left-1 bg-emerald-500/80 rounded px-1 text-[7px] font-bold text-white uppercase tracking-wider flex items-center gap-0.5 shadow">
                            <CheckCircle2 className="w-2 h-2" /> Live
                          </div>
                        )}

                        <button 
                          type="button"
                          onClick={() => setMediaFiles(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 bg-zinc-900/80 hover:bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-bold transition-colors cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div>
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Media URL (Optional)</label>
                  <input 
                    type="url"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe"
                    className="w-full bg-zinc-950/60 border border-zinc-850 rounded-xl p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/50 font-mono placeholder-zinc-700"
                  />
                </div>

                {/* Intelligent Platform Selection */}
                <div>
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Target Platforms</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PLATFORMS.map(p => {
                      const connected = connectedAccounts.some(acc => acc.platform.toLowerCase() === p.toLowerCase());
                      const selected = selectedPlatforms.includes(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            if (!connected) {
                              setConnectPlatform(p);
                              setShowConnectModal(true);
                            } else {
                              togglePlatform(p);
                            }
                          }}
                          className={`px-3 py-2 rounded-xl text-[10px] font-semibold transition-all border flex items-center justify-between gap-1.5 cursor-pointer ${
                            selected
                              ? "bg-zinc-800 border-zinc-700 text-white shadow-md border-transparent"
                              : connected
                                ? "bg-zinc-950/40 border-zinc-850 text-zinc-300 hover:bg-zinc-850/40"
                                : "bg-zinc-950/10 border-zinc-900/30 text-zinc-600 hover:text-zinc-500"
                          }`}
                        >
                          <span className="flex items-center gap-1.5 truncate">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${connected ? "bg-emerald-500 animate-pulse" : "bg-zinc-700"}`} />
                            <span className="truncate">{p}</span>
                          </span>
                          {!connected && (
                            <span className="text-[7px] font-mono font-bold text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-1 py-0.5 rounded uppercase">
                              Link
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Character Warnings Block */}
                {selectedPlatforms.filter(p => content.length > getCharLimit(p)).length > 0 && (
                  <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-[10px] text-amber-400 flex items-start gap-2 animate-fade-in leading-relaxed">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Length Over Limit:</span> Your dispatch payload exceeds text constraints for: {selectedPlatforms.filter(p => content.length > getCharLimit(p)).join(", ")}. Please shorten it.
                    </div>
                  </div>
                )}

                {/* Schedule Dispatch Drawer */}
                <div className="bg-zinc-950/20 border border-zinc-850 p-3 rounded-xl">
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                      Queue Scheduling
                    </label>
                    <label className="inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isScheduled} 
                        onChange={(e) => setIsScheduled(e.target.checked)} 
                        className="sr-only peer" 
                      />
                      <div className="relative w-8 h-4.5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-zinc-400 peer-checked:after:bg-emerald-400 after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-500/10 border border-zinc-700 peer-checked:border-emerald-500/30"></div>
                    </label>
                  </div>

                  {isScheduled && (
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-zinc-850/60 animate-fade-in">
                      <div>
                        <label className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Date</label>
                        <input 
                          type="date" 
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          className="w-full bg-zinc-950/60 border border-zinc-850 rounded-xl p-2 text-[10px] text-zinc-200 focus:outline-none focus:border-emerald-500/50 font-mono"
                          required={isScheduled}
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Time</label>
                        <input 
                          type="time" 
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="w-full bg-zinc-950/60 border border-zinc-850 rounded-xl p-2 text-[10px] text-zinc-200 focus:outline-none focus:border-emerald-500/50 font-mono"
                          required={isScheduled}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isPublishDisabled}
                  className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl py-3 text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading || mediaFiles.some(f => f.uploading) ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  ) : isScheduled ? (
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  {loading ? "Allocating Instance..." : mediaFiles.some(f => f.uploading) ? "Uploading Media..." : isScheduled ? "Schedule Payload" : "Dispatch Payload"}
                </button>
              </form>
            </div>

            {/* Live Feed Preview */}
            <div className="border border-zinc-800/80 bg-zinc-900/40 rounded-2xl p-5 shrink-0">
              <div className="flex items-center justify-between mb-4 border-b border-zinc-800/60 pb-3">
                <div className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Live Preview</h3>
                </div>
                
                {selectedPlatforms.length > 0 && (
                  <div className="flex gap-1 p-0.5 bg-zinc-950 border border-zinc-850 rounded-xl max-w-[180px] overflow-x-auto scrollbar-none">
                    {selectedPlatforms.map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setActivePreviewTab(p)}
                        className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                          activePreviewTab === p 
                            ? "bg-zinc-800 text-white" 
                            : "text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedPlatforms.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-zinc-800/80 rounded-xl bg-zinc-950/20">
                  <Sparkles className="w-5 h-5 text-zinc-600 mx-auto mb-2 animate-pulse" />
                  <p className="text-[9px] uppercase font-mono tracking-widest text-zinc-500">Select active channel<br/>to render feed mockups</p>
                </div>
              ) : (
                <SocialPreview 
                  content={content} 
                  mediaFiles={mediaFiles} 
                  mediaUrl={mediaUrl} 
                  platform={activePreviewTab} 
                />
              )}
            </div>

          </div>
        {/* Right Column: Automated Execution Terminal */}
        <div className="lg:col-span-4 flex flex-col min-h-[500px] min-w-0">
          <div className="bg-zinc-900/40 border border-zinc-800/85 rounded-2xl flex flex-col flex-1 overflow-hidden">
            <div className="p-4 border-b border-zinc-800/60 flex flex-col sm:flex-row gap-3 sm:items-center justify-between bg-zinc-950/40 shrink-0">
              <div className="flex gap-1.5 p-0.5 bg-zinc-950 border border-zinc-850 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRightTab("queue")}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                    rightTab === "queue"
                      ? "bg-zinc-800 text-white border border-zinc-700/40 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  Queue Feed
                </button>
                <button
                  type="button"
                  onClick={() => setRightTab("analytics")}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                    rightTab === "analytics"
                      ? "bg-zinc-800 text-white border border-zinc-700/40 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  Analytics Hub
                </button>
              </div>

              {rightTab === "queue" ? (
                <div className="flex gap-1.5 items-center justify-end sm:justify-start">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                  <span className="text-[8px] font-mono font-bold text-emerald-400 uppercase tracking-wider">LIVE FEED</span>
                </div>
              ) : (
                <div className="flex gap-1.5 items-center justify-end sm:justify-start">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[8px] font-mono font-bold text-emerald-400 uppercase tracking-wider">REALTIME STATS</span>
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-zinc-950/20 scrollbar-thin">
              {rightTab === "analytics" ? (
                <AnalyticsPanel posts={posts} connectedAccounts={connectedAccounts} />
              ) : posts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 py-20 font-mono text-[10px] uppercase tracking-widest">
                  <div className="w-12 h-12 rounded-xl border border-zinc-800/80 flex items-center justify-center bg-zinc-900/40 mb-4 animate-pulse">
                    <Activity className="w-5 h-5 text-zinc-600" />
                  </div>
                  <p className="leading-relaxed">
                    Awaiting incoming payloads<br/>
                    <span className="text-[9px] text-zinc-700">from automated nodes...</span>
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <div key={post.id} className="relative bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4.5 shadow-lg relative overflow-hidden group">
                      {/* Subtle status top ribbon */}
                      <div className={`absolute top-0 left-0 right-0 h-[2px] ${
                        post.status === "published" ? "bg-emerald-500" :
                        post.status === "publishing" ? "bg-amber-500 animate-pulse" :
                        post.status === "scheduled" ? "bg-blue-500" :
                        post.status === "pending" ? "bg-zinc-600" :
                        "bg-red-500"
                      }`} />

                      <div className="flex justify-between items-start gap-4 mb-3">
                        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded uppercase tracking-wider font-bold">
                          NODE-{post.id.split("-")[0].toUpperCase()}
                        </span>
                        
                        <div className={`flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest ${
                          post.status === "published" ? "text-emerald-400" :
                          post.status === "publishing" ? "text-amber-400" :
                          post.status === "scheduled" ? "text-blue-400" :
                          post.status === "pending" ? "text-zinc-500" :
                          "text-red-400"
                        }`}>
                          {post.status === "published" && <><CheckCircle2 className="w-3.5 h-3.5" /> Success</>}
                          {post.status === "publishing" && <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> In Progress</>}
                          {post.status === "scheduled" && <><Clock className="w-3.5 h-3.5" /> Scheduled</>}
                          {post.status === "pending" && <><Clock className="w-3.5 h-3.5" /> Queued</>}
                          {post.status === "failed" && <><AlertCircle className="w-3.5 h-3.5" /> Failed</>}
                        </div>
                      </div>
                      
                      <p className="text-xs text-zinc-200 mb-4 font-mono leading-relaxed whitespace-pre-wrap break-words bg-zinc-950/60 border border-zinc-850 p-3 rounded-lg">
                        {post.content}
                      </p>
                      
                      {post.mediaUrls && post.mediaUrls.length > 0 && (
                        <div className="mb-4 grid grid-cols-2 gap-1.5">
                          {post.mediaUrls.map((url, i) => {
                            const isVideo = isVideoUrl(url);
                            const hasThumbnail = post.thumbnails && post.thumbnails[i];
                            return isVideo ? (
                              <div key={i} className="relative w-full h-24 rounded-lg border border-zinc-850 overflow-hidden bg-zinc-950">
                                {hasThumbnail ? (
                                  <img 
                                    src={post.thumbnails[i]} 
                                    alt={`Video preview ${i}`} 
                                    className="w-full h-full object-cover" 
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <video 
                                    src={url} 
                                    className="w-full h-full object-cover" 
                                    muted 
                                    playsInline 
                                  />
                                )}
                                <div className="absolute inset-0 flex items-center justify-center bg-black/35 pointer-events-none">
                                  <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center text-white animate-pulse">
                                    <svg className="w-3 h-3 fill-current ml-0.5" viewBox="0 0 24 24">
                                      <path d="M8 5v14l11-7z" />
                                    </svg>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <img 
                                key={i} 
                                src={url} 
                                alt={`Node Resource ${i}`} 
                                className="w-full h-24 object-cover rounded-lg border border-zinc-850" 
                                referrerPolicy="no-referrer" 
                              />
                            );
                          })}
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2 text-[9px] font-mono text-zinc-500 bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-850/60">
                        <div className="truncate">
                          <span className="text-zinc-600 block uppercase font-bold text-[8px] tracking-wider mb-0.5">Platforms</span>
                          <span className="text-zinc-300 uppercase tracking-wide font-bold">{post.platforms.join(", ")}</span>
                        </div>
                        <div>
                          <span className="text-zinc-600 block uppercase font-bold text-[8px] tracking-wider mb-0.5">
                            {post.status === "scheduled" ? "Triggers" : "Timeline"}
                          </span>
                          <span className="text-zinc-300">
                            {post.status === "scheduled" && post.scheduledFor
                              ? formatDistanceToNow(new Date(post.scheduledFor), { addSuffix: true })
                              : post.publishedAt 
                                ? formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true }) 
                                : formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>

                      {post.status === "failed" && post.error && (
                        <div className="mt-3 p-3 bg-red-950/10 border border-red-900/30 rounded-lg text-[9px] font-mono text-red-400 leading-relaxed max-h-32 overflow-y-auto scrollbar-thin">
                          <div className="text-[8px] font-bold text-red-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> System Diagnostics:
                          </div>
                          {post.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

        {/* Connect Modal */}
        {showConnectModal && (
          <div className="fixed inset-0 bg-[#040405]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
              <div className="absolute inset-0 bg-gradient-to-b from-zinc-800/10 to-transparent pointer-events-none" />
              <div className="p-4 border-b border-zinc-800/80 flex justify-between items-center bg-zinc-950/40 relative z-10">
                <h3 className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  Link Channel Node
                </h3>
                <button onClick={() => setShowConnectModal(false)} className="text-zinc-500 hover:text-white transition-colors cursor-pointer text-xs">✕</button>
              </div>
              <form onSubmit={handleConnectAccount} className="p-6 space-y-5 relative z-10">
                <div className="space-y-4">
                  <div>
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Select Platform</label>
                    <select 
                      value={connectPlatform}
                      onChange={(e) => {
                        const plat = e.target.value;
                        setConnectPlatform(plat);
                        if (plat === "Bluesky") {
                          setConnectMethod("credentials");
                        }
                      }}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/50 font-mono"
                    >
                      {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  
                  <div className="flex gap-2 p-1 bg-zinc-950 border border-zinc-850 rounded-xl mb-4">
                    {connectPlatform !== "Bluesky" && (
                      <button
                        type="button"
                        onClick={() => setConnectMethod("desktop_app")}
                        className={`flex-1 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          connectMethod === "desktop_app" 
                            ? "bg-zinc-800 text-white border border-zinc-700/60 shadow-sm" 
                            : "text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        Companion App
                      </button>
                    )}
                    {connectPlatform !== "Bluesky" && (
                      <button
                        type="button"
                        onClick={() => setConnectMethod("session_cookie")}
                        className={`flex-1 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          connectMethod === "session_cookie" 
                            ? "bg-zinc-800 text-white border border-zinc-700/60 shadow-sm" 
                            : "text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        Session Cookie
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setConnectMethod("credentials")}
                      className={`flex-1 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        connectMethod === "credentials" 
                          ? "bg-zinc-800 text-white border border-zinc-700/60 shadow-sm" 
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      Credentials
                    </button>
                  </div>

                  {connectMethod === "desktop_app" && (
                    <div className="flex flex-col items-center justify-center py-4 text-center">
                      <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center mb-3 text-emerald-400">
                        <Cpu className="w-5 h-5 animate-pulse" />
                      </div>
                      <h4 className="text-zinc-200 text-xs font-bold mb-1 font-mono uppercase tracking-wide">Desktop Companion Hook</h4>
                      <p className="text-[10px] text-zinc-500 mb-5 max-w-xs leading-relaxed">
                        Authorize securely via a local Puppeteer instance. This triggers local keychain validation to bypass anti-bot and 2FA.
                      </p>
                      
                      <div className="flex flex-col gap-2 w-full max-w-[240px]">
                        <a 
                          href={`omnipost://connect?platform=${connectPlatform}&token=${token}&host=${encodeURIComponent(window.location.origin)}`}
                          target="_blank"
                          className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-colors shadow flex items-center justify-center gap-1.5"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          Launch Local Handshake
                        </a>

                        <div className="w-full flex items-center justify-center gap-2 py-1">
                          <span className="h-px bg-zinc-800/60 flex-1" />
                          <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest font-mono">or</span>
                          <span className="h-px bg-zinc-800/60 flex-1" />
                        </div>

                        <a 
                          href="https://github.com/ekoputrapratama/OmniPost/releases/tag/v1.0.0"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-zinc-950/40 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-950/80 border border-zinc-850 hover:border-zinc-750 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download Companion App
                        </a>
                      </div>
                    </div>
                  )}

                  {connectMethod === "credentials" && (
                    <div className="space-y-3 pt-1">
                      <div>
                        <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">
                          {connectPlatform === "Bluesky" ? "Bluesky Handle" : "Login Email / Username"}
                        </label>
                        <input 
                          type="text" 
                          value={connectUsername}
                          onChange={(e) => setConnectUsername(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/50 font-mono"
                          placeholder={connectPlatform === "Bluesky" ? "e.g. handle.bsky.social" : "admin@domain.com"}
                          required={connectMethod === "credentials"}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">
                          {connectPlatform === "Bluesky" ? "App-Specific Password" : "Account Password"}
                        </label>
                        <input 
                          type="password" 
                          value={connectPassword}
                          onChange={(e) => setConnectPassword(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/50 font-mono"
                          placeholder="••••••••••••"
                          required={connectMethod === "credentials"}
                        />
                      </div>
                      {connectPlatform !== "Bluesky" && (
                        <div>
                          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1 flex justify-between">
                            <span>2FA Secret Seed</span>
                            <span className="text-zinc-600 font-normal lowercase tracking-wide">(Optional)</span>
                          </label>
                          <input 
                            type="text" 
                            value={connectTwoFactor}
                            onChange={(e) => setConnectTwoFactor(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/50 font-mono"
                            placeholder="Base32 Setup Key"
                          />
                        </div>
                      )}
                    </div>
                  )}
                  
                  {connectMethod === "session_cookie" && (
                    <div>
                      <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Raw Session Cookie Payload</label>
                      <textarea 
                        value={connectSessionCookie}
                        onChange={(e) => setConnectSessionCookie(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/50 font-mono min-h-[90px] resize-none leading-relaxed"
                        placeholder="Paste auth_token or raw cookies to bypass login protocols entirely..."
                        required={connectMethod === "session_cookie"}
                      />
                    </div>
                  )}
                </div>

                <div className="mt-6 flex gap-3 pt-1">
                  <button 
                    type="button" 
                    onClick={() => setShowConnectModal(false)}
                    className="flex-1 py-2.5 bg-zinc-950 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded-xl text-[9px] font-bold uppercase tracking-wider border border-zinc-850 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  
                  {connectMethod !== "desktop_app" && (
                    <button 
                      type="submit" 
                      disabled={connectLoading || (connectMethod === "credentials" ? (!connectUsername || !connectPassword) : !connectSessionCookie)}
                      className="flex-1 py-2.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/25 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      {connectLoading ? "Encrypting..." : "Connect Node"}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Disconnect Account Modal */}
        {showDisconnectConfirm && (
          <div className="fixed inset-0 bg-[#040405]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative">
              <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 to-transparent pointer-events-none" />
              <div className="p-4 border-b border-zinc-800/80 flex justify-between items-center bg-zinc-950/40 relative z-10">
                <h3 className="text-[10px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Deauthorize Node
                </h3>
              </div>
              <div className="p-6 relative z-10">
                <p className="text-xs text-zinc-300 leading-relaxed mb-6">
                  Are you sure you want to disconnect your <span className="text-emerald-400 font-bold uppercase">{showDisconnectConfirm}</span> credentials? This will terminate scheduled background tasks.
                </p>
                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setShowDisconnectConfirm(null)}
                    className="flex-1 py-2.5 bg-zinc-950 hover:bg-zinc-850 text-zinc-400 hover:text-white border border-zinc-850 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    onClick={() => executeDisconnectAccount(showDisconnectConfirm)}
                    className="flex-1 py-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/25 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global Error/Alert Modal */}
        {errorMessage && (
          <div className="fixed inset-0 bg-[#040405]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative">
              <div className="p-4 border-b border-zinc-800/80 flex justify-between items-center bg-zinc-950/40 relative z-10">
                <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">System Notice</h3>
                <button onClick={() => setErrorMessage(null)} className="text-zinc-500 hover:text-white transition-colors cursor-pointer text-xs">✕</button>
              </div>
              <div className="p-6 relative z-10">
                <p className="text-xs text-zinc-300 leading-relaxed mb-6 font-mono">
                  {errorMessage}
                </p>
                <button 
                  type="button" 
                  onClick={() => setErrorMessage(null)}
                  className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-850 border border-zinc-850 text-zinc-300 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Confirm Ingestion
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Unified Status Footer */}
      <footer className="h-7 bg-zinc-950 border-t border-zinc-800/60 flex items-center justify-between px-6 text-[8px] font-mono text-zinc-600 shrink-0 relative z-20">
        <div className="flex gap-4">
          <span className="flex items-center gap-1"><span className="w-1 h-1 bg-emerald-500 rounded-full" /> SECURE GATEWAY ENCRYPTED</span>
          <span className="hidden sm:inline">PUPPETEER ENGINE V1.0.4-STABLE</span>
        </div>
        <div>OMNIPOST HUB • ALL RIGHTS SECURED</div>
      </footer>
    </div>
    )} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

