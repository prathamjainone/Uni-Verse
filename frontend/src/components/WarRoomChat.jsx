import { useState, useEffect, useRef } from 'react';
import { Send, Terminal, MessageSquare, Video, VideoOff, PhoneOff, Monitor, Code } from 'lucide-react';
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

      // Broadcast new track to all existing peers
      Object.values(peerConnections.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
            sender.replaceTrack(screenTrack).catch(e => console.error("ReplaceTrack Error", e));
        }
      });

      // Update local view
      if (localStreamRef.current) {
        const newStream = new MediaStream([screenTrack]);
        const audioTracks = localStreamRef.current.getAudioTracks();
        if (audioTracks.length > 0) newStream.addTrack(audioTracks[0]);
        setLocalStream(newStream);
        localStreamRef.current = newStream; // Important so new joiners get the screen!
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

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[800px]">
      
      {/* Left Pane: Notes & Code Editor */}
      <div className="flex-1 flex flex-col bg-black/40 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl relative">
        <div className="p-4 bg-gradient-to-r from-teal-500/10 to-indigo-500/10 border-b border-white/5 flex items-center justify-between z-10 relative">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400"><Code size={18} /></div>
             <div>
               <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">Collaborative Notes</h3>
               <div className="flex items-center gap-1.5 mt-0.5">
                 <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-teal-500 animate-pulse' : 'bg-red-500'}`}></div>
                 <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Live Socket Sync</span>
               </div>
             </div>
           </div>
        </div>
        <textarea
          value={sharedNotes}
          onChange={handleNotesChange}
          placeholder="// Type code snippets, meeting notes, action items...&#10;// Changes are broadcast instantly."
          className="flex-1 w-full bg-transparent text-slate-300 font-mono text-sm p-6 resize-none focus:outline-none focus:ring-inset focus:ring-1 focus:ring-teal-500/50 transition-colors placeholder:text-slate-600 leading-relaxed"
          disabled={!isConnected}
          spellCheck="false"
        />
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
