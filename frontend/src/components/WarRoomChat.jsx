import { useState, useEffect, useRef } from 'react';
import { Send, Terminal, MessageSquare, Video, VideoOff, PhoneOff, Monitor, Code, Github, ExternalLink, GitCommit, GitPullRequest, RefreshCw, Link2, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import API_URL from '../api';

// --- Small Helper for Video ---
function VideoPlayer({ stream, muted, label, isScreenShare }) {
  const videoRef = useRef();
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`relative bg-black/80 rounded-xl overflow-hidden shadow-xl border border-white/10 aspect-video group ${isScreenShare ? 'col-span-full aspect-auto h-64' : ''}`}>
      <video ref={videoRef} autoPlay playsInline muted={muted} className={`w-full h-full ${isScreenShare ? 'object-contain bg-black' : 'object-cover'}`} />
      <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur rounded flex items-center gap-2 text-[10px] text-white font-bold tracking-wider uppercase">
        {isScreenShare && <Monitor size={10} className="text-teal-400" />} {label}
      </div>
    </div>
  );
}

export default function WarRoomChat({ project, user }) {
  const projectId = project.id;
  const isLeader = project.owner_uid === user?.uid;

  // --- Left Pane Tab ---
  const [leftTab, setLeftTab] = useState('notes'); // 'notes' | 'repo'

  // --- Chat & Notes State (Persisted) ---
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem(`warroom_msgs_${projectId}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [inputText, setInputText] = useState("");
  const [sharedNotes, setSharedNotes] = useState(() => {
    return localStorage.getItem(`warroom_notes_${projectId}`) || "";
  });
  const [isConnected, setIsConnected] = useState(false);
  const scrollRef = useRef(null);
  const socketRef = useRef(null);

  // --- GitHub Repo State ---
  const [repoUrl, setRepoUrl] = useState(project.github_url || '');
  const [repoInput, setRepoInput] = useState('');
  const [savingRepo, setSavingRepo] = useState(false);
  const [commits, setCommits] = useState([]);
  const [pulls, setPulls] = useState([]);
  const [repoLoading, setRepoLoading] = useState(false);
  const [repoError, setRepoError] = useState('');

  // --- WebRTC State ---
  const [inCall, setInCall] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const localStreamRef = useRef(null);
  const peerConnections = useRef({});

  const rtcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };

  // --- Persistence Hooks ---
  useEffect(() => { localStorage.setItem(`warroom_msgs_${projectId}`, JSON.stringify(messages)); }, [messages, projectId]);
  useEffect(() => { localStorage.setItem(`warroom_notes_${projectId}`, sharedNotes); }, [sharedNotes, projectId]);

  // --- Parse GitHub owner/repo ---
  const parseGithubRepo = (url) => {
    if (!url) return null;
    try {
      // Handle full URLs or owner/repo format
      const cleaned = url.replace(/\.git$/, '').replace(/\/$/, '');
      if (cleaned.includes('github.com')) {
        const parts = new URL(cleaned.startsWith('http') ? cleaned : `https://${cleaned}`).pathname.split('/').filter(Boolean);
        if (parts.length >= 2) return { owner: parts[0], repo: parts[1] };
      } else if (cleaned.includes('/')) {
        const [owner, repo] = cleaned.split('/');
        if (owner && repo) return { owner, repo };
      }
    } catch {}
    return null;
  };

  // --- Fetch GitHub Data ---
  const fetchRepoData = async (url) => {
    const parsed = parseGithubRepo(url || repoUrl);
    if (!parsed) { setRepoError('Invalid repo URL'); return; }
    setRepoLoading(true);
    setRepoError('');
    try {
      const [commitsRes, pullsRes] = await Promise.all([
        fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits?per_page=10`),
        fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/pulls?state=open&per_page=5`)
      ]);
      if (!commitsRes.ok) throw new Error(`Repo not found or private`);
      const commitsData = await commitsRes.json();
      const pullsData = pullsRes.ok ? await pullsRes.json() : [];
      setCommits(commitsData);
      setPulls(pullsData);
    } catch (err) {
      setRepoError(err.message);
      setCommits([]);
      setPulls([]);
    } finally {
      setRepoLoading(false);
    }
  };

  // Auto-fetch when repo tab is selected and URL exists
  useEffect(() => {
    if (leftTab === 'repo' && repoUrl) {
      fetchRepoData(repoUrl);
    }
  }, [leftTab, repoUrl]);

  // Sync repoUrl from project prop
  useEffect(() => {
    if (project.github_url) setRepoUrl(project.github_url);
  }, [project.github_url]);

  const saveRepoUrl = async () => {
    if (!repoInput.trim()) return;
    setSavingRepo(true);
    try {
      const res = await fetch(`${API_URL}/api/projects/${projectId}/github`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ github_url: repoInput.trim() })
      });
      if (res.ok) {
        setRepoUrl(repoInput.trim());
        fetchRepoData(repoInput.trim());
      }
    } catch (err) {
      console.error("Failed to save repo URL", err);
    } finally {
      setSavingRepo(false);
    }
  };

  // --- WebSocket Setup ---
  useEffect(() => {
    const wsBase = API_URL.replace(/^http/, 'ws');
    const wsUrl = `${wsBase}/ws/chat/${projectId}`;

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => setIsConnected(true);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (!data.type || data.type === 'chat') {
        setMessages(prev => [...prev, data]);
        return;
      }
      
      if (data.type === 'editor_sync' && data.sender !== user.uid) {
        setSharedNotes(data.payload);
        return;
      }

      const { type, sender, target, payload } = data;
      if (target && target !== user.uid) return;
      if (sender === user.uid) return;

      if (type === 'webrtc_join') {
        if (localStreamRef.current) createPeerConnection(sender, true);
      } else if (type === 'webrtc_offer') {
        if (localStreamRef.current) handleOffer(sender, payload);
      } else if (type === 'webrtc_answer') {
        handleAnswer(sender, payload);
      } else if (type === 'webrtc_ice') {
        handleNewICECandidate(sender, payload);
      } else if (type === 'webrtc_leave') {
        removePeerConnection(sender);
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      leaveHuddle();
    };

    return () => {
      leaveHuddle();
      socket.close();
    };
  }, [projectId]);

  // --- WebRTC Logic ---
  const createPeerConnection = async (peerUid, isInitiator) => {
    if (peerConnections.current[peerUid]) return;

    const pc = new RTCPeerConnection(rtcConfig);
    peerConnections.current[peerUid] = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));
    }

    pc.onicecandidate = (e) => {
      if (e.candidate && socketRef.current) {
        socketRef.current.send(JSON.stringify({ type: 'webrtc_ice', sender: user.uid, target: peerUid, payload: e.candidate }));
      }
    };

    pc.ontrack = (e) => setRemoteStreams(prev => ({ ...prev, [peerUid]: e.streams[0] }));

    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current.send(JSON.stringify({ type: 'webrtc_offer', sender: user.uid, target: peerUid, payload: offer }));
    }
    return pc;
  };

  const handleOffer = async (peerUid, offer) => {
    const pc = await createPeerConnection(peerUid, false);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socketRef.current.send(JSON.stringify({ type: 'webrtc_answer', sender: user.uid, target: peerUid, payload: answer }));
  };

  const handleAnswer = async (peerUid, answer) => {
    const pc = peerConnections.current[peerUid];
    if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
  };

  const handleNewICECandidate = async (peerUid, candidate) => {
    const pc = peerConnections.current[peerUid];
    if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
  };

  const removePeerConnection = (peerUid) => {
    const pc = peerConnections.current[peerUid];
    if (pc) {
      pc.close();
      delete peerConnections.current[peerUid];
    }
    setRemoteStreams(prev => {
      const updated = { ...prev };
      delete updated[peerUid];
      return updated;
    });
  };

  // --- Huddle Controls ---
  const startHuddle = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      localStreamRef.current = stream;
      setInCall(true);
      if (socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'webrtc_join', sender: user.uid }));
      }
    } catch (err) { alert("Camera permissions denied."); }
  };

  const shareScreen = async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" } });
      const screenTrack = displayStream.getVideoTracks()[0];

      Object.values(peerConnections.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
            sender.replaceTrack(screenTrack).catch(e => console.error("ReplaceTrack Error", e));
        }
      });

      if (localStreamRef.current) {
        const newStream = new MediaStream([screenTrack]);
        const audioTracks = localStreamRef.current.getAudioTracks();
        if (audioTracks.length > 0) newStream.addTrack(audioTracks[0]);
        setLocalStream(newStream);
        localStreamRef.current = newStream;
      }
      setIsScreenSharing(true);

      screenTrack.onended = () => {
         stopScreenShare();
      };
    } catch (err) { console.error("Screen Share Failed", err); }
  };

  const stopScreenShare = async () => {
     setIsScreenSharing(false);
     try {
       const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
       const camTrack = camStream.getVideoTracks()[0];
       
       Object.values(peerConnections.current).forEach(pc => {
         const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
         if (sender) sender.replaceTrack(camTrack).catch(e => console.error(e));
       });
       
       if (localStreamRef.current) {
         const restoredStream = new MediaStream([camTrack]);
         const audioTracks = localStreamRef.current.getAudioTracks();
         if (audioTracks.length > 0) restoredStream.addTrack(audioTracks[0]);
         setLocalStream(restoredStream);
         localStreamRef.current = restoredStream;
       }
     } catch(e) { console.error("Restore Camera Failed", e); }
  };

  const leaveHuddle = () => {
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
    setLocalStream(null);
    localStreamRef.current = null;
    setInCall(false);
    setIsScreenSharing(false);
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'webrtc_leave', sender: user.uid }));
    }
    Object.keys(peerConnections.current).forEach(removePeerConnection);
  };

  // --- UI Actions ---
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSendText = () => {
    if (!inputText.trim() || !socketRef.current) return;
    socketRef.current.send(JSON.stringify({ type: 'chat', user: user.display_name, uid: user.uid, text: inputText, timestamp: new Date().toISOString() }));
    setInputText("");
  };

  const handleNotesChange = (e) => {
    const val = e.target.value;
    setSharedNotes(val);
    if (socketRef.current && isConnected) {
      socketRef.current.send(JSON.stringify({ type: 'editor_sync', sender: user.uid, payload: val }));
    }
  };

  // --- Helper: time ago ---
  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const parsed = parseGithubRepo(repoUrl);
  const githubDevUrl = parsed ? `https://github.dev/${parsed.owner}/${parsed.repo}` : null;
  const githubWebUrl = parsed ? `https://github.com/${parsed.owner}/${parsed.repo}` : null;

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[800px]">
      
      {/* Left Pane: Notes & Repo Tabs */}
      <div className="flex-1 flex flex-col bg-black/40 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl relative">
        {/* Tab Header */}
        <div className="p-4 bg-gradient-to-r from-teal-500/10 to-indigo-500/10 border-b border-white/5 z-10 relative">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setLeftTab('notes')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                leftTab === 'notes' 
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 shadow-lg' 
                  : 'text-slate-500 hover:text-slate-300 border border-transparent'
              }`}
            >
              <Code size={14} /> Live Notes
            </button>
            <button 
              onClick={() => setLeftTab('repo')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                leftTab === 'repo' 
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 shadow-lg' 
                  : 'text-slate-500 hover:text-slate-300 border border-transparent'
              }`}
            >
              <Github size={14} /> Project Repo
            </button>
            
            <div className="ml-auto flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-teal-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                {isConnected ? 'Connected' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {leftTab === 'notes' ? (
          <textarea
            value={sharedNotes}
            onChange={handleNotesChange}
            placeholder={"// Type code snippets, meeting notes, action items...\n// Changes are broadcast instantly to all team members."}
            className="flex-1 w-full bg-transparent text-slate-300 font-mono text-sm p-6 resize-none focus:outline-none focus:ring-inset focus:ring-1 focus:ring-teal-500/50 transition-colors placeholder:text-slate-600 leading-relaxed"
            disabled={!isConnected}
            spellCheck="false"
          />
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Repo Setup (if no URL set) */}
            {!repoUrl ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center border border-emerald-500/20">
                  <Github size={28} className="text-emerald-400" />
                </div>
                <h3 className="text-lg font-black text-white">Connect Your Repository</h3>
                <p className="text-xs text-slate-400 max-w-sm">Link your team's GitHub repository to see live commits, open PRs, and access the browser IDE.</p>
                
                {isLeader ? (
                  <div className="w-full max-w-sm space-y-3">
                    <input
                      type="text"
                      placeholder="github.com/username/repo or owner/repo"
                      value={repoInput}
                      onChange={e => setRepoInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveRepoUrl()}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                    <button 
                      onClick={saveRepoUrl} 
                      disabled={savingRepo || !repoInput.trim()}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                    >
                      {savingRepo ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                      {savingRepo ? 'Saving...' : 'Link Repository'}
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">Ask your project leader to link a repository.</p>
                )}
              </div>
            ) : (
              /* Repo Dashboard */
              <>
                {/* Repo Header */}
                <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border border-emerald-500/15 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Github size={16} className="text-emerald-400" />
                      <span className="text-sm font-black text-white">{parsed?.owner}/{parsed?.repo}</span>
                    </div>
                    <button onClick={() => fetchRepoData()} className="p-1.5 text-slate-500 hover:text-white transition-colors" title="Refresh">
                      <RefreshCw size={12} className={repoLoading ? 'animate-spin' : ''} />
                    </button>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {githubWebUrl && (
                      <a href={githubWebUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold text-slate-300 transition-colors">
                        <ExternalLink size={10} /> View on GitHub
                      </a>
                    )}
                    {githubDevUrl && (
                      <a href={githubDevUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/20 rounded-lg text-[10px] font-bold text-indigo-300 transition-colors">
                        <Code size={10} /> Open in VS Code
                      </a>
                    )}
                    {isLeader && (
                      <button onClick={() => { setRepoUrl(''); setRepoInput(''); }} className="ml-auto text-[10px] text-red-400/50 hover:text-red-400 transition-colors">
                        Unlink
                      </button>
                    )}
                  </div>
                </div>

                {repoError && (
                  <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    ⚠ {repoError}
                  </div>
                )}

                {/* Open Pull Requests */}
                {pulls.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <GitPullRequest size={12} /> Open Pull Requests ({pulls.length})
                    </h4>
                    <div className="space-y-2">
                      {pulls.map(pr => (
                        <a key={pr.id} href={pr.html_url} target="_blank" rel="noopener noreferrer" className="block p-3 bg-black/30 border border-white/5 rounded-lg hover:border-emerald-500/30 transition-all group">
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-400 text-[10px] font-bold">#{pr.number}</span>
                            <span className="text-xs text-slate-300 font-semibold group-hover:text-white transition-colors truncate">{pr.title}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[9px] text-slate-500">{pr.user?.login}</span>
                            <span className="text-[9px] text-slate-600">• {timeAgo(pr.created_at)}</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Commits */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <GitCommit size={12} /> Recent Commits
                  </h4>
                  {repoLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw size={16} className="text-slate-500 animate-spin" />
                    </div>
                  ) : commits.length > 0 ? (
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-[11px] top-3 bottom-3 w-px bg-gradient-to-b from-emerald-500/30 via-slate-700/30 to-transparent"></div>
                      
                      <div className="space-y-1">
                        {commits.map((c, i) => (
                          <div key={c.sha} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/[0.02] transition-colors group relative">
                            {/* Timeline dot */}
                            <div className={`w-[7px] h-[7px] rounded-full mt-1.5 shrink-0 ring-2 ring-black/80 ${i === 0 ? 'bg-emerald-400' : 'bg-slate-600'}`}></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-300 leading-snug truncate group-hover:text-white transition-colors">{c.commit?.message?.split('\n')[0]}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] text-slate-500 font-semibold">{c.commit?.author?.name || c.author?.login}</span>
                                <span className="text-[9px] text-slate-600">• {timeAgo(c.commit?.author?.date)}</span>
                                <a href={c.html_url} target="_blank" rel="noopener noreferrer" className="ml-auto text-[9px] text-slate-600 hover:text-teal-400 transition-colors font-mono opacity-0 group-hover:opacity-100">
                                  {c.sha?.slice(0, 7)}
                                </a>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600 italic text-center py-6">No commits found.</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right Pane: Media & Chat */}
      <div className="w-full lg:w-[400px] flex flex-col bg-black/40 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl relative">
        <div className="p-4 bg-gradient-to-r from-teal-500/10 to-indigo-500/10 border-b border-white/5 flex flex-col gap-3 z-10 relative">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
               <Terminal size={16} className="text-indigo-400" /> WebRTC Comms
            </h3>
          </div>
          
          <div className="flex items-center gap-2">
            {!inCall ? (
              <button onClick={startHuddle} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-lg transition-all border border-indigo-500/50">
                <Video size={14} /> Join Call
              </button>
            ) : (
              <>
                {!isScreenSharing ? (
                   <button onClick={shareScreen} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg transition-all">
                     <Monitor size={14} /> Present Screen
                   </button>
                ) : (
                   <button onClick={stopScreenShare} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-all">
                     <Video size={14} /> Back to Camera
                   </button>
                )}
                <button onClick={leaveHuddle} className="flex-none p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all border border-red-500/30">
                  <PhoneOff size={16} />
                </button>
              </>
            )}
          </div>
        </div>

        <AnimatePresence>
          {inCall && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="border-b border-white/5 bg-black/60 overflow-y-auto max-h-[300px] scrollbar-thin">
              <div className="p-3 grid grid-cols-2 gap-3 auto-rows-max">
                {localStream && <VideoPlayer stream={localStream} muted={true} isScreenShare={isScreenSharing} label={`${user.display_name} (Me)`} />}
                {Object.entries(remoteStreams).map(([uid, stream]) => {
                  const memberInfo = project?.members_info?.find(m => m.uid === uid);
                  const displayName = memberInfo ? memberInfo.name : `Peer ${uid.slice(0,4)}`;
                  return <VideoPlayer key={uid} stream={stream} muted={false} label={displayName} />;
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide z-10 relative bg-black/20">
          {messages.map((msg, i) => {
            const isMe = msg.uid === user.uid;
            return (
              <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <div className={`flex items-center gap-2 mb-0.5 px-2`}><span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{msg.user}</span></div>
                  <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed shadow-lg ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white/10 text-slate-200 rounded-tl-none'}`}>
                    {msg.text}
                  </div>
                </div>
              </motion.div>
            );
          })}
          <div ref={scrollRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 bg-white/5 border-t border-white/5 z-10 relative">
          <div className="relative flex items-center gap-2">
            <input type="text" placeholder="Type message..." value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendText()} className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500" />
            <button onClick={handleSendText} disabled={!inputText.trim()} className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl"><Send size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
