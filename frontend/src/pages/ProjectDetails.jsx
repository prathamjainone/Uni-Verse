import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Users, MessageSquare, ArrowLeft, Sparkles, 
  Send, Mail, Trash2, Github, ExternalLink, X, Star, BookOpen, Code, BarChart3
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
  
  // --- Applicant Compatibility State ---
  const [applicantMatches, setApplicantMatches] = useState({}); // { [uid]: { score, reason, loading } }

  // --- Team Intelligence State ---
  const [teamAnalysis, setTeamAnalysis] = useState(null);
  const [isAnalyzingTeam, setIsAnalyzingTeam] = useState(false);

  // --- GitHub Intel Modal State ---
  const [intelModal, setIntelModal] = useState(null); // { name, github, ... } or null
  const [intelData, setIntelData] = useState(null);
  const [intelLoading, setIntelLoading] = useState(false);

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
    const intervalId = setInterval(fetchProject, 5000);
    return () => clearInterval(intervalId);
  }, [id]);

  useEffect(() => {
    if (project && user && String(project.owner_uid).trim() === String(user.uid).trim()) {
       // Match existing members
       project.members_info?.forEach(m => {
          if (m.uid !== project.owner_uid && applicantMatches[m.uid] === undefined) {
             handleApplicantMatch(m.uid, m.skills);
          }
       });
       // Match join requests
       project.join_requests_info?.forEach(req => {
          if (applicantMatches[req.uid] === undefined) {
             handleApplicantMatch(req.uid, req.skills);
          }
       });
       // Auto-trigger team analysis if not started
       if (!teamAnalysis && !isAnalyzingTeam) {
          handleTeamAnalysis();
       }
    }
  }, [project, user, applicantMatches, teamAnalysis, isAnalyzingTeam]);

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

  const handleApplicantMatch = async (reqUid, reqSkills) => {
    setApplicantMatches(prev => ({ ...prev, [reqUid]: { loading: true } }));
    try {
      const res = await fetch(`${API_URL}/api/projects/${id}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: reqUid, skills: reqSkills || [] })
      });
      const data = await res.json();
      if (data.success) {
        console.log(`[AI Match] Success for ${reqUid}:`, data.match.score);
        setApplicantMatches(prev => ({ 
          ...prev, 
          [reqUid]: { score: data.match.score, reason: data.match.reason, loading: false } 
        }));
      } else {
        console.warn(`[AI Match] Failed for ${reqUid}:`, data.error);
        setApplicantMatches(prev => ({ ...prev, [reqUid]: null }));
      }
    } catch (err) {
      console.error("Applicant match error", err);
      setApplicantMatches(prev => ({ ...prev, [reqUid]: null }));
    }
  };

  const handleTeamAnalysis = async () => {
    setIsAnalyzingTeam(true);
    try {
      const res = await fetch(`${API_URL}/api/projects/${id}/team-analysis`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success && data.analysis) setTeamAnalysis(data.analysis);
    } catch (err) {
      console.error("Error fetching team analysis", err);
    } finally {
      setIsAnalyzingTeam(false);
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

  const handleRemoveMember = async (memberUid) => {
    if (!window.confirm("Remove this member from the project?")) return;
    try {
      const res = await fetch(`${API_URL}/api/projects/${id}/members/${memberUid}`, { method: 'DELETE' });
      if (res.ok) fetchProject();
    } catch(err) {
      console.error("Failed to remove member", err);
    }
  };

  // --- GitHub Intel ---
  const openGithubIntel = async (person) => {
    let username = person.github || '';
    if (!username) { alert('This user has not linked a GitHub account.'); return; }
    if (username.includes('github.com/')) username = username.split('github.com/')[1].split('/')[0];
    username = username.replace(/\/$/, '');
    if (!username) { alert('Invalid GitHub username.'); return; }

    setIntelModal(person);
    setIntelData(null);
    setIntelLoading(true);

    try {
      const [userRes, reposRes] = await Promise.all([
        fetch(`https://api.github.com/users/${username}`),
        fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`)
      ]);
      if (!userRes.ok) throw new Error('User not found');
      const userData = await userRes.json();
      const reposData = reposRes.ok ? await reposRes.json() : [];

      const totalStars = reposData.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);
      const languages = {};
      reposData.forEach(r => { if (r.language) languages[r.language] = (languages[r.language] || 0) + 1; });
      const topLangs = Object.entries(languages).sort((a,b) => b[1] - a[1]).slice(0, 8);
      const topRepos = reposData.filter(r => !r.fork).sort((a,b) => (b.stargazers_count || 0) - (a.stargazers_count || 0)).slice(0, 5);

      setIntelData({
        avatar: userData.avatar_url,
        login: userData.login,
        bio: userData.bio,
        publicRepos: userData.public_repos,
        followers: userData.followers,
        following: userData.following,
        totalStars,
        topLangs,
        topRepos,
        profileUrl: userData.html_url
      });
    } catch (err) {
      setIntelData({ error: err.message });
    } finally {
      setIntelLoading(false);
    }
  };

  const radarData = project?.required_skills?.map(skill => {
    // Check if user has this skill in their profile
    const hasSkill = user?.skills?.some(s => s.toLowerCase() === skill.toLowerCase());
    
    // Instead of random, use a more deterministic approach: 
    // 100 if has exact skill, 0 if not (AI matching handles the semantic part elsewhere)
    return {
      subject: skill,
      A: hasSkill ? 100 : 0,
      fullMark: 100,
    };
  }) || [];

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin"></div>
    </div>
  );

  if (!project) return null;


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

          {/* Overall Compatibility Score (Owner Only) */}
          {user && project && String(project.owner_uid).trim() === String(user.uid).trim() && (
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-blue-500/5 z-0" />
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-[11px] font-black text-teal-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Sparkles size={14} /> Overall Compatibility
                  </h4>
                  <button 
                    onClick={handleTeamAnalysis}
                    disabled={isAnalyzingTeam}
                    className="text-[10px] text-teal-300 font-bold bg-teal-900/30 hover:bg-teal-900/60 px-3 py-1.5 rounded transition-colors border border-teal-500/20 flex items-center gap-1.5"
                  >
                    {isAnalyzingTeam ? <div className="w-2 h-2 bg-teal-400 rounded-full animate-ping" /> : <Sparkles size={12} />}
                    Refresh Semantic Score
                  </button>
                </div>

                {teamAnalysis ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-black/40 p-4 rounded-xl border border-white/5">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Semantic Match Result</p>
                        <h3 className="text-xl font-black text-white">{teamAnalysis.team_compatibility_score}% Match</h3>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Recommendation</p>
                        <p className="text-xs font-bold text-teal-400">{teamAnalysis.recommendation}</p>
                      </div>
                    </div>
                    
                    <div className="bg-teal-500/5 border border-teal-500/10 rounded-xl p-4">
                      <p className="text-[10px] text-teal-400 uppercase font-black tracking-widest mb-2 flex items-center gap-1.5">
                        <MessageSquare size={12} /> AI Insights
                      </p>
                      <p className="text-xs text-slate-300 italic leading-relaxed">
                        "{teamAnalysis.reasoning || 'Based on a semantic analysis of skills, project mission, and member complementarity.'}"
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-[10px] text-slate-500">Click refresh to generate compatibility score via AI.</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* No longer showing public AI Match Card per user request to keep scores for admin only */}

          {/* Team Members Card */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 shadow-xl">
             <div className="flex items-center justify-between mb-6">
                <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <Users size={16} className="text-teal-400" /> Current Team
                </h4>
                <span className="px-2 py-0.5 bg-teal-500/10 text-teal-400 text-[10px] font-bold rounded-lg border border-teal-500/20">
                  {project.members_info?.length || 0} Members
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
                      
                      {user && project && String(project.owner_uid).trim() === String(user.uid).trim() && m.uid !== project.owner_uid && (
                        <div className="mt-3 bg-purple-900/10 border border-purple-500/10 rounded-lg p-2.5">
                          {applicantMatches[m.uid] ? (
                             applicantMatches[m.uid].loading ? (
                               <div className="flex items-center gap-2 text-purple-400 text-xs font-bold animate-pulse">
                                 <Sparkles size={12} /> Calculating semantic match via AI...
                               </div>
                             ) : (
                                 <div className="flex items-center gap-4 animate-in fade-in zoom-in duration-300">
                                   <div className="relative w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full border-2 border-purple-500/10" style={{background: `conic-gradient(from 0deg, #8b5cf6 ${applicantMatches[m.uid].score}%, transparent ${applicantMatches[m.uid].score}%)`}}>
                                     <div className="w-10 h-10 bg-[#111318] rounded-full flex flex-col items-center justify-center absolute">
                                       <span className="text-[10px] font-black text-white leading-none">{applicantMatches[m.uid].score}%</span>
                                       <span className="text-[6px] font-black uppercase text-purple-400 tracking-tighter">
                                         {applicantMatches[m.uid].score >= 80 ? 'High' : applicantMatches[m.uid].score >= 50 ? 'Mod' : 'Low'}
                                       </span>
                                     </div>
                                   </div>
                                   <div className="flex-1">
                                      <p className="text-[10px] uppercase font-black tracking-widest text-purple-400 mb-0.5">AI Compatibility</p>
                                      <p className="text-[10px] text-slate-400 italic leading-tight line-clamp-2">
                                        "{applicantMatches[m.uid].reason}"
                                      </p>
                                   </div>
                                 </div>
                             )
                          ) : (
                            <button 
                              onClick={() => handleApplicantMatch(m.uid, m.skills)}
                              className="w-full py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-[10px] font-bold uppercase tracking-widest rounded-md border border-purple-500/20 transition-colors flex justify-center items-center gap-2"
                            >
                              <Sparkles size={12} /> Evaluate Compatibility
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {user && project && String(project.owner_uid).trim() === String(user.uid).trim() && m.github && (
                      <button onClick={() => openGithubIntel(m)} className="text-emerald-500/40 hover:text-emerald-400 transition-colors group-hover:scale-110 ml-1 self-start mt-1" title="GitHub Intel">
                        <Github size={14} />
                      </button>
                    )}
                    {user && project && String(project.owner_uid).trim() === String(user.uid).trim() && m.uid !== project.owner_uid && (
                      <button onClick={() => handleRemoveMember(m.uid)} className="text-red-500/50 hover:text-red-400 transition-colors group-hover:scale-110 ml-1 self-start mt-1" title="Remove Member">
                        <Trash2 size={14} />
                      </button>
                    )}
                    <button className="text-slate-600 hover:text-white transition-colors group-hover:scale-110 ml-1 self-start mt-1">
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
          {user && project && String(project.owner_uid).trim() === String(user.uid).trim() && project.join_requests_info?.length > 0 && (
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
                      {req.github && (
                        <button onClick={() => openGithubIntel(req)} className="text-emerald-500/40 hover:text-emerald-400 transition-colors ml-auto" title="GitHub Intel">
                          <Github size={14} />
                        </button>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2 mb-4">
                      {req.skills && req.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {req.skills.slice(0,3).map(s => (
                            <span key={s} className="px-2 py-0.5 bg-white/5 text-[10px] text-slate-400 rounded-md border border-white/5">{s}</span>
                          ))}
                          {req.skills.length > 3 && <span className="text-[10px] text-slate-500 pl-1">+{req.skills.length - 3}</span>}
                        </div>
                      )}

                      {/* Dynamic Compatibility Engine */}
                      <div className="bg-purple-900/10 border border-purple-500/10 rounded-lg p-2.5 mt-1">
                        {applicantMatches[req.uid] ? (
                           applicantMatches[req.uid].loading ? (
                             <div className="flex items-center gap-2 text-purple-400 text-xs font-bold animate-pulse">
                               <Sparkles size={12} /> Calculating semantic match via AI...
                             </div>
                           ) : (
                             <div className="flex items-center gap-4 animate-in fade-in zoom-in duration-300">
                               <div className="relative w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full border-2 border-purple-500/10" style={{background: `conic-gradient(from 0deg, #8b5cf6 ${applicantMatches[req.uid].score}%, transparent ${applicantMatches[req.uid].score}%)`}}>
                                 <div className="w-10 h-10 bg-[#111318] rounded-full flex flex-col items-center justify-center absolute">
                                   <span className="text-[10px] font-black text-white leading-none">{applicantMatches[req.uid].score}%</span>
                                   <span className="text-[6px] font-black uppercase text-purple-400 tracking-tighter">
                                     {applicantMatches[req.uid].score >= 80 ? 'High' : applicantMatches[req.uid].score >= 50 ? 'Mod' : 'Low'}
                                   </span>
                                 </div>
                               </div>
                               <div className="flex-1">
                                  <p className="text-[10px] uppercase font-black tracking-widest text-purple-400 mb-0.5">AI Compatibility</p>
                                  <p className="text-[10px] text-slate-400 italic leading-tight line-clamp-2">
                                    "{applicantMatches[req.uid].reason}"
                                  </p>
                               </div>
                             </div>
                           )
                        ) : (
                          <button 
                            onClick={() => handleApplicantMatch(req.uid, req.skills)}
                            className="w-full py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-[10px] font-bold uppercase tracking-widest rounded-md border border-purple-500/20 transition-colors flex justify-center items-center gap-2"
                          >
                            <Sparkles size={12} /> Evaluate Compatibility
                          </button>
                        )}
                      </div>
                    </div>

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

      {/* GitHub Intel Modal */}
      <AnimatePresence>
        {intelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setIntelModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-5 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-xl">
                    <BarChart3 size={18} className="text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">GitHub Intel</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">{intelModal.name}</p>
                  </div>
                </div>
                <button onClick={() => setIntelModal(null)} className="p-1.5 text-slate-500 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 max-h-[70vh] overflow-y-auto">
                {intelLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                    <p className="text-xs text-slate-500">Fetching GitHub data...</p>
                  </div>
                ) : intelData?.error ? (
                  <div className="text-center py-8">
                    <p className="text-red-400 text-sm">⚠ {intelData.error}</p>
                  </div>
                ) : intelData ? (
                  <div className="space-y-5">
                    {/* Profile Card */}
                    <div className="flex items-center gap-4 p-4 bg-black/30 rounded-xl border border-white/5">
                      <img src={intelData.avatar} alt="" className="w-14 h-14 rounded-full border-2 border-emerald-500/30" />
                      <div className="flex-1">
                        <a href={intelData.profileUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-black text-white hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                          @{intelData.login} <ExternalLink size={10} />
                        </a>
                        {intelData.bio && <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{intelData.bio}</p>}
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: 'Repos', value: intelData.publicRepos, icon: BookOpen, color: 'text-indigo-400' },
                        { label: 'Stars', value: intelData.totalStars, icon: Star, color: 'text-yellow-400' },
                        { label: 'Followers', value: intelData.followers, icon: Users, color: 'text-teal-400' },
                        { label: 'Following', value: intelData.following, icon: Users, color: 'text-slate-400' },
                      ].map(stat => (
                        <div key={stat.label} className="bg-black/40 rounded-xl p-3 text-center border border-white/5">
                          <stat.icon size={14} className={`${stat.color} mx-auto mb-1.5`} />
                          <p className="text-lg font-black text-white">{stat.value || 0}</p>
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{stat.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Top Languages */}
                    {intelData.topLangs?.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Code size={12} /> Top Languages
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {intelData.topLangs.map(([lang, count]) => (
                            <span key={lang} className="px-3 py-1.5 bg-emerald-500/10 text-emerald-300 text-[10px] font-bold rounded-lg border border-emerald-500/20 flex items-center gap-1.5">
                              {lang}
                              <span className="text-emerald-500/50 text-[9px]">{count} repos</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Top Repos */}
                    {intelData.topRepos?.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <BookOpen size={12} /> Notable Projects
                        </h4>
                        <div className="space-y-2">
                          {intelData.topRepos.map(repo => (
                            <a key={repo.id} href={repo.html_url} target="_blank" rel="noopener noreferrer" className="block p-3 bg-black/30 border border-white/5 rounded-lg hover:border-emerald-500/30 transition-all group">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">{repo.name}</span>
                                <div className="flex items-center gap-1 text-yellow-500 text-[10px]">
                                  <Star size={10} /> {repo.stargazers_count}
                                </div>
                              </div>
                              {repo.description && <p className="text-[10px] text-slate-500 mt-1 truncate">{repo.description}</p>}
                              <div className="flex items-center gap-2 mt-1.5">
                                {repo.language && <span className="text-[9px] text-emerald-400/60 font-semibold">{repo.language}</span>}
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
