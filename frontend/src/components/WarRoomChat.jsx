import { useState, useEffect, useRef } from 'react';
import { Send, Terminal, MessageSquare, Video, VideoOff, PhoneOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import API_URL from '../api';

// --- Small Helper for Video ---
function VideoPlayer({ stream, muted, label }) {
  const videoRef = useRef();
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative bg-black/80 rounded-xl overflow-hidden shadow-xl border border-white/10 aspect-video group">
      <video ref={videoRef} autoPlay playsInline muted={muted} className="w-full h-full object-cover" />
      <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur rounded text-[10px] text-white font-bold tracking-wider uppercase">
        {label}
      </div>
    </div>
  );
}

export default function WarRoomChat({ project, user }) {
  const projectId = project.id;
  // --- Chat State ---
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const scrollRef = useRef(null);
  const socketRef = useRef(null);

  // --- WebRTC State ---
  const [inCall, setInCall] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({}); // { [uid]: MediaStream }
  const localStreamRef = useRef(null);
  const peerConnections = useRef({}); // { [uid]: RTCPeerConnection }

  const rtcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

  // --- WebSocket Setup ---
  useEffect(() => {
    // Dynamically map HTTP API_URL to WS protocol
    const wsBase = API_URL.replace(/^http/, 'ws');
    const wsUrl = `${wsBase}/ws/chat/${projectId}`;

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      console.log("Connected to War Room");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (!data.type || data.type === 'chat') {
        // Normal text message
        setMessages(prev => [...prev, data]);
        return;
      }

      // --- WebRTC Signaling Routing ---
      const { type, sender, target, payload } = data;

      // Ensure signal is strictly meant for us, and ignore our own loopbacks
      if (target && target !== user.uid) return;
      if (sender === user.uid) return;

      if (type === 'webrtc_join') {
        console.log("Got JOIN", sender);
        // Only initiate peering if WE are also currently in the call
        if (localStreamRef.current) {
          createPeerConnection(sender, true);
        }
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
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Send my ICE candidates
    pc.onicecandidate = (e) => {
      if (e.candidate && socketRef.current) {
        socketRef.current.send(JSON.stringify({
          type: 'webrtc_ice', sender: user.uid, target: peerUid, payload: e.candidate
        }));
      }
    };

    // Receive remote video
    pc.ontrack = (e) => {
      setRemoteStreams(prev => ({ ...prev, [peerUid]: e.streams[0] }));
    };

    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current.send(JSON.stringify({
        type: 'webrtc_offer', sender: user.uid, target: peerUid, payload: offer
      }));
    }

    return pc;
  };

  const handleOffer = async (peerUid, offer) => {
    const pc = await createPeerConnection(peerUid, false);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socketRef.current.send(JSON.stringify({
      type: 'webrtc_answer', sender: user.uid, target: peerUid, payload: answer
    }));
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

  const startHuddle = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      localStreamRef.current = stream;
      setInCall(true);

      // Tell everyone currently in the room we are here with video
      if (socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'webrtc_join', sender: user.uid }));
      }
    } catch (err) {
      console.error("Failed to acquire camera/mic", err);
      alert("Camera permissions denied or unavailable.");
    }
  };

  const leaveHuddle = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
    }
    setLocalStream(null);
    localStreamRef.current = null;
    setInCall(false);
    
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'webrtc_leave', sender: user.uid }));
    }

    Object.keys(peerConnections.current).forEach(removePeerConnection);
  };


  // --- Chat UI Actions ---
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendText = () => {
    if (!inputText.trim() || !socketRef.current) return;
    socketRef.current.send(JSON.stringify({
      type: 'chat',
      user: user.display_name,
      uid: user.uid,
      text: inputText,
      timestamp: new Date().toISOString()
    }));
    setInputText("");
  };

  return (
    <div className="flex flex-col h-[700px] bg-black/40 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl relative">
      
      {/* War Room Header */}
      <div className="p-4 bg-gradient-to-r from-teal-500/10 to-indigo-500/10 border-b border-white/5 flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
             <Terminal size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
              Team War Room
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-teal-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                {isConnected ? 'Real-time Encrypted P2P' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <AnimatePresence mode="popLayout">
            {!inCall ? (
              <motion.button 
                key="start"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={startHuddle}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-indigo-500/20 transition-all border border-indigo-500/50"
              >
                <Video size={14} /> Start Huddle
              </motion.button>
            ) : (
              <motion.button 
                key="stop"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={leaveHuddle}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-100 text-xs font-bold rounded-lg transition-all border border-red-500/30"
              >
                <PhoneOff size={14} /> End Huddle
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Dynamic Video Grid Area (Collapsible) */}
      <AnimatePresence>
        {inCall && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1, transition: { type: "spring", bounce: 0.2, duration: 0.6 } }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-white/5 bg-black/60 overflow-hidden relative z-0"
          >
            <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4 auto-rows-max">
              {/* Local Feed */}
              {localStream && <VideoPlayer stream={localStream} muted={true} label={`${user.display_name} (Me)`} />}
              
              {/* Remote Feeds */}
              {Object.entries(remoteStreams).map(([uid, stream]) => {
                const memberInfo = project?.members_info?.find(m => m.uid === uid);
                const displayName = memberInfo ? memberInfo.name : `Peer ${uid.slice(0,4)}`;
                return (
                   <VideoPlayer key={uid} stream={stream} muted={false} label={displayName} />
                );
              })}
              
              {Object.keys(remoteStreams).length === 0 && (
                <div className="col-span-2 md:col-span-2 flex flex-col items-center justify-center p-6 border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
                  <VideoOff size={24} className="text-slate-600 mb-2" />
                  <p className="text-xs text-slate-500 font-medium">Waiting for team members to join...</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide z-10 relative">
        {messages.map((msg, i) => {
          const isMe = msg.uid === user.uid;
          return (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              key={i} 
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                <div className={`flex items-center gap-2 mb-0.5 px-2`}>
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{msg.user}</span>
                   <span className="text-[9px] text-slate-700">{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                </div>
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-lg ${
                  isMe 
                    ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-none border border-white/10' 
                    : 'bg-white/5 text-slate-200 rounded-tl-none border border-white/5'
                }`}>
                  {msg.text}
                </div>
              </div>
            </motion.div>
          );
        })}
        {messages.length === 0 && !inCall && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="p-4 bg-white/5 rounded-full mb-4 text-slate-600">
               <MessageSquare size={32} />
            </div>
            <p className="text-slate-400 text-sm font-bold tracking-wide">Secure War Room Enabled.</p>
            <p className="text-slate-600 text-xs mt-2 italic">Messages sent here are encrypted and ephemeral.</p>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white/5 border-t border-white/5 z-10 relative">
        <div className="relative flex items-center gap-2">
          <input 
            type="text" 
            placeholder="Type your secure message..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendText()}
            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
          />
          <button 
            onClick={handleSendText}
            disabled={!inputText.trim() || !isConnected}
            className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
