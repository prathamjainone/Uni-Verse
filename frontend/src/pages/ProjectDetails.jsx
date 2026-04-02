import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Users, MessageSquare, ArrowLeft, Sparkles, 
  Send, Mail, Trash2, Github, ExternalLink
} from 'lucide-react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, 
  Radar as RadarComponent, ResponsiveContainer 
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import API_URL from '../api';
import WarRoomChat from '../components/WarRoomChat';

export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, login } = useAuth();
  
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [matchResult, setMatchResult] = useState(null);
  const [isMatching, setIsMatching] = useState(false);
  const [activeTab, setActiveTab] = useState("discussion"); // discussion or warroom

  const isMember = project?.members?.includes(user?.uid);
  const isRequested = project?.join_requests?.includes(user?.uid);

  const fetchProject = async () => {
    try {
      const res = await fetch(`${API_URL}/api/projects/${id}`);
      const data = await res.json();
      if (data.success) {
        setProject(data.project);
      } else {
        navigate('/discover');
      }
    } catch (err) {
      console.error("Fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [id]);

  const handleAddComment = async () => {
    if (!user) return login();
    if (!commentText.trim()) return;

    try {
      const res = await fetch(`${API_URL}/api/projects/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: user.uid, 
          user_name: user.display_name, 
          text: commentText 
        })
      });
      if (res.ok) {
        setCommentText("");
        fetchProject();
      }
    } catch (err) {
      console.error("Comment error", err);
    }
  };

  const handleMatch = async () => {
    if (!user) return login();
    setIsMatching(true);
    try {
      const res = await fetch(`${API_URL}/api/projects/${id}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.uid, skills: user.skills || [] })
      });
      const data = await res.json();
      if (data.success) setMatchResult(data.match);
    } catch (err) {
      console.error("Match error", err);
    } finally {
      setIsMatching(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    try {
      const res = await fetch(`${API_URL}/api/projects/${id}`, { method: 'DELETE' });
      if (res.ok) navigate('/discover');
    } catch(err) {
      console.error("Failed to delete project", err);
    }
  };

  const handleJoin = async () => {
    if (!user) return login();
    try {
      const res = await fetch(`${API_URL}/api/projects/${id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.uid })
      });
      const data = await res.json();
      if (data.success) {
        fetchProject();
      }
    } catch (err) {
      console.error("Failed to join project", err);
    }
  };

  const handleAccept = async (requestUid) => {
    try {
      const res = await fetch(`${API_URL}/api/projects/${id}/requests/${requestUid}/accept`, {
        method: 'POST'
      });
      if (res.ok) fetchProject();
    } catch (err) {
      console.error("Failed to accept request", err);
    }
  };

  const handleReject = async (requestUid) => {
    try {
      const res = await fetch(`${API_URL}/api/projects/${id}/requests/${requestUid}/reject`, {
        method: 'POST'
      });
      if (res.ok) fetchProject();
    } catch (err) {
      console.error("Failed to reject request", err);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin"></div>
    </div>
  );

  if (!project) return null;

  // Prepare Radar Data
  const radarData = (project.required_skills || []).map(skill => ({
    subject: skill,
    A: user?.skills?.includes(skill) ? 100 : 20,
    fullMark: 100,
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Back Navigation */}
      <Link to="/discover" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors group">
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-medium">Back to Discovery</span>
      </Link>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Main Content */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Project Content Card */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
             <div className="absolute top-0 right-0 p-4">
                {user && project.owner_uid === user.uid && (
                  <button onClick={handleDelete} className="p-2 text-slate-500 hover:text-red-400 transition-colors">
                    <Trash2 size={20} />
                  </button>
                )}
             </div>

            <div className="p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                 <div className="px-3 py-1 rounded-full bg-teal-500/10 text-teal-400 text-xs font-bold border border-teal-500/20 uppercase tracking-wider">
                  Open Project
                </div>
                <span className="text-slate-500 text-xs">• Posted {new Date(project.created_at).toLocaleDateString()}</span>
              </div>

              <h1 className="text-3xl md:text-4xl font-black text-white mb-4 leading-tight">
                {project.title}
              </h1>
              
              <div className="prose prose-invert max-w-none mb-8 text-slate-300 leading-relaxed text-lg">
                {project.description}
              </div>

              <div className="flex flex-wrap gap-4 pt-6 border-t border-white/5">
                <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                  <Users size={18} />
                  <span className="font-semibold">{project.members?.length || 1} Members</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                  <MessageSquare size={18} />
                  <span className="font-semibold">{project.comments?.length || 0} Discussions</span>
                </div>
              </div>
            </div>
          </div>

          {/* TAB SYSTEM */}
          <div className="flex gap-2 p-1 bg-white/[0.03] border border-white/10 rounded-xl w-fit">
            <button 
              onClick={() => setActiveTab("discussion")}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'discussion' ? 'bg-teal-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Discussion
            </button>
            {isMember && (
              <button 
                onClick={() => setActiveTab("warroom")}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'warroom' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Team War Room <Sparkles size={14} />
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'discussion' ? (
              <motion.div 
                key="discussion"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 md:p-8"
              >
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <MessageSquare size={20} className="text-teal-400" />
                  Community Discussion
                </h3>

                {/* Comment Box */}
                <div className="mb-8">
                  <textarea 
                    placeholder={user ? "What are your thoughts?" : "Sign in to join the conversation..."}
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 min-h-[120px] transition-all"
                    disabled={!user}
                  />
                  <div className="flex justify-end mt-3">
                    <button 
                      onClick={handleAddComment}
                      disabled={!user || !commentText.trim()}
                      className="bg-teal-600 hover:bg-teal-500 disabled:bg-slate-800 disabled:text-slate-500 text-white px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-lg overflow-hidden relative group"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        Post Comment <Send size={14} />
                      </span>
                    </button>
                  </div>
                </div>

                {/* Comments List */}
                <div className="space-y-6">
                  {project.comments?.map((c, idx) => (
                    <div key={c.id || idx} className="flex gap-4 group">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-white shrink-0 shadow-lg">
                        {c.user_name?.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-slate-100 text-sm">{c.user_name}</span>
                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter self-center py-0.5 px-1.5 bg-white/5 rounded">Student</span>
                          <span className="text-[10px] text-slate-600 ml-auto">
                            {c.timestamp ? new Date(c.timestamp).toLocaleTimeString() : 'Recent'}
                          </span>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/5 group-hover:border-white/10 transition-colors">
                          {c.text}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!project.comments || project.comments.length === 0) && (
                    <div className="text-center py-8 text-slate-500 italic">
                      Be the first to start a conversation!
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="warroom"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <WarRoomChat project={project} user={user} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT COLUMN: Sidebar */}
        <div className="space-y-6">
          
          {/* AI Match Card */}
          <div className="bg-gradient-to-br from-purple-600/10 to-blue-600/10 border border-purple-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all"></div>
            
            <h4 className="text-sm font-black text-purple-300 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Sparkles size={16} /> AI Match Readiness
            </h4>

            {matchResult ? (
              <div className="space-y-4">
                {radarData.length > 0 && (
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                        <PolarGrid stroke="#4a5568" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <RadarComponent
                          name="Skills"
                          dataKey="A"
                          stroke="#8b5cf6"
                          fill="#8b5cf6"
                          fillOpacity={0.4}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="flex justify-between items-center bg-purple-500/20 rounded-xl p-3 border border-purple-500/30">
                  <span className="text-sm font-bold text-white">Probability</span>
                  <span className="text-2xl font-black text-purple-400">{matchResult.score}%</span>
                </div>
                <p className="text-xs text-slate-300 italic leading-relaxed text-center">
                   "{matchResult.reason}"
                </p>
              </div>
            ) : (
              <div className="py-6 text-center">
                <p className="text-slate-400 text-xs mb-4">See how your skills stack up against this project's requirements.</p>
                <button 
                  onClick={handleMatch}
                  disabled={isMatching}
                  className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  {isMatching ? <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> Scoring...</> : 'Evaluate Compatibility'}
                </button>
              </div>
            )}
          </div>

          {/* Team Members Card */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 shadow-xl">
             <div className="flex items-center justify-between mb-6">
                <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <Users size={16} className="text-teal-400" /> Current Team
                </h4>
                <span className="px-2 py-0.5 bg-teal-500/10 text-teal-400 text-[10px] font-bold rounded-lg border border-teal-500/20">
                  {project.members_info?.length || 0}/5 Slots
                </span>
             </div>

             <div className="space-y-4">
                {project.members_info?.map((m) => (
                  <div key={m.uid} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 group">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                      {m.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white leading-none mb-1">{m.name} {m.uid === project.owner_uid && <span className="text-[10px] text-teal-500 font-black ml-1">OWNER</span>}</p>
                      <p className="text-[10px] text-slate-500 truncate">{m.branch || 'University Student'}</p>
                    </div>
                    <button className="text-slate-600 hover:text-white transition-colors group-hover:scale-110">
                      <Mail size={14} />
                    </button>
                  </div>
                ))}
             </div>

             {user && project.owner_uid !== user.uid && (
               <button 
                 onClick={handleJoin}
                 className={`w-full mt-6 font-bold py-3.5 rounded-xl transition-all shadow-lg active:scale-[0.98] ${
                   isMember 
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20' 
                    : isRequested
                    ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20'
                    : 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-500/10'
                 }`}
               >
                 {isMember ? 'Leave Team' : isRequested ? 'Request Pending (Click to Cancel)' : 'Request to Join'}
               </button>
             )}
             {!user && (
               <button onClick={login} className="w-full mt-6 bg-teal-600 hover:bg-teal-500 text-white font-bold py-3.5 rounded-xl transition-all">
                 Sign in to Join
               </button>
             )}
          </div>

          {/* Pending Applications - ONLY VISIBLE TO LEADER */}
          {user && project.owner_uid === user.uid && project.join_requests_info?.length > 0 && (
            <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border border-yellow-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-yellow-500/10 rounded-full blur-3xl group-hover:bg-yellow-500/20 transition-all"></div>
              
              <h4 className="text-sm font-black text-yellow-500 uppercase tracking-widest flex items-center gap-2 mb-6">
                Pending Applications ({project.join_requests_info.length})
              </h4>

              <div className="space-y-4 relative z-10">
                {project.join_requests_info.map((req) => (
                  <div key={req.uid} className="bg-black/40 border border-white/5 rounded-xl p-4 transition-all hover:border-yellow-500/30">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                        {req.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white leading-none mb-1">{req.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{req.branch || 'University Student'}</p>
                      </div>
                    </div>
                    
                    {req.skills && req.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {req.skills.slice(0,3).map(s => (
                          <span key={s} className="px-2 py-0.5 bg-white/5 text-[10px] text-slate-400 rounded-md border border-white/5">{s}</span>
                        ))}
                        {req.skills.length > 3 && <span className="text-[10px] text-slate-500 pl-1">+{req.skills.length - 3}</span>}
                      </div>
                    )}

                    <div className="flex gap-2">
                       <button onClick={() => handleAccept(req.uid)} className="flex-1 bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 text-xs font-bold py-2 rounded-lg border border-teal-500/20 transition-colors">
                         Accept
                       </button>
                       <button onClick={() => handleReject(req.uid)} className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold py-2 rounded-lg border border-red-500/20 transition-colors">
                         Decline
                       </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Required Skills Card */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 shadow-xl">
            <h4 className="text-sm font-black text-white uppercase tracking-widest mb-4">Stack Requirements</h4>
            <div className="flex flex-wrap gap-2">
              {project.required_skills?.map(skill => (
                <span key={skill} className="px-3 py-1 rounded-lg bg-black/40 text-slate-300 text-xs font-semibold border border-white/5 group hover:border-teal-500/50 transition-colors">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
