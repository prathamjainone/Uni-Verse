import { useState, useEffect } from 'react';
import { Users, PlusCircle, MessageSquare, Trash2, Sparkles, ChevronDown, ChevronUp, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CreateProjectModal from '../components/CreateProjectModal';

export default function Discover() {
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeReply, setActiveReply] = useState(null);
  const [replyTexts, setReplyTexts] = useState({});
  const [matchResults, setMatchResults] = useState({});
  const [matchingLoader, setMatchingLoader] = useState(null);
  const [membersOpen, setMembersOpen] = useState({});
  const [membersData, setMembersData] = useState({});
  const [contactOpen, setContactOpen] = useState({});
  const { user, login } = useAuth();

  const fetchProjects = () => {
    fetch('http://localhost:8000/api/projects')
      .then(res => res.json())
      .then(data => setProjects(data))
      .catch(err => console.error("API error", err));
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (projectData) => {
    if (!user) return;
    
    const payload = {
      ...projectData,
      owner_uid: user.uid,
      members: [user.uid]
    };

    try {
      const res = await fetch('http://localhost:8000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) fetchProjects();
    } catch (err) {
      console.error("Failed to create project", err);
    }
  };


  const handleAddComment = async (projectId) => {
    if (!user) return login();
    const text = replyTexts[projectId];
    if (!text?.trim()) return;

    try {
      const res = await fetch(`http://localhost:8000/api/projects/${projectId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.uid, user_name: user.display_name, text })
      });
      if (res.ok) {
         setReplyTexts(prev => ({ ...prev, [projectId]: "" }));
         setActiveReply(null);
         fetchProjects();
      }
    } catch(err) {
      console.error("Failed to add comment", err);
    }
  };

  const handleJoin = async (projectId) => {
    if (!user) return login();
    try {
      const res = await fetch(`http://localhost:8000/api/projects/${projectId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.uid })
      });
      const data = await res.json();
      if (data.success) {
        setProjects(projects.map(p => p.id === projectId ? { ...p, members: data.members } : p));
      }
    } catch (err) {
      console.error("Failed to join project", err);
    }
  };

  const handleDelete = async (projectId) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    try {
      const res = await fetch(`http://localhost:8000/api/projects/${projectId}`, { method: 'DELETE' });
      if (res.ok) fetchProjects();
    } catch(err) {
      console.error("Failed to delete project", err);
    }
  };

  const handleMatch = async (projectId) => {
    if (!user) return login();
    if (!user.has_profile) {
      alert("Please complete your profile to use AI matchmaking.");
      return window.location.href = '/onboarding';
    }

    setMatchingLoader(projectId);
    try {
      const res = await fetch(`http://localhost:8000/api/projects/${projectId}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: user.uid,
          skills: user.skills || []  // fallback for accounts without saved profile
        })
      });
      const data = await res.json();
      if (data.success) {
        setMatchResults(prev => ({ ...prev, [projectId]: data.match }));
      }
    } catch (err) {
      console.error("Matchmaking error", err);
    } finally {
      setMatchingLoader(null);
    }
  };

  const filteredProjects = projects.filter(p => {
    const term = search.toLowerCase();
    return p.title.toLowerCase().includes(term) || 
           p.description.toLowerCase().includes(term) ||
           p.required_skills.some(skill => skill.toLowerCase().includes(term));
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header section */}
      <div className="text-center py-10 relative">
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400 mb-4 drop-shadow-lg">
          Discover Teams
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-8">
          Find ambitious students across the campus. Filter by branch, required skills, or pitch your own project to find co-founders.
        </p>
        <button 
          onClick={user ? () => setIsModalOpen(true) : login}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-teal-600 text-white px-8 py-3.5 rounded-full text-sm font-bold shadow-[0_0_20px_rgba(45,212,191,0.2)] hover:shadow-[0_0_30px_rgba(45,212,191,0.4)] transition-all transform hover:-translate-y-1"
        >
          <PlusCircle size={18} />
          {user ? 'Pitch a Project' : 'Sign in to Pitch'}
        </button>
      </div>

      <CreateProjectModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={handleCreateProject} 
      />

      {/* Filter / Search Bar */}
      <div className="max-w-3xl mx-auto flex flex-col md:flex-row gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md">
        <input 
          type="text" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search for skills (e.g. React, UX, Finance)..." 
          className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
        />
      </div>

      {/* Projects Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
        {filteredProjects.map(proj => {
          return (
          <div key={proj.id} className="flex flex-col p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-teal-500/40 transition-all hover:-translate-y-1 shadow-xl group cursor-pointer relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-3xl group-hover:bg-teal-500/10 transition-colors"></div>
            
            <div className="mb-2">
              <h3 className="text-xl font-bold text-slate-100 group-hover:text-teal-400 transition-colors">
                {proj.title}
              </h3>
            </div>
            
            <p className="text-slate-400 text-sm mb-6 flex-grow leading-relaxed">
              {proj.description}
            </p>
            
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Required Skills</span>
                <div className="flex flex-wrap gap-2">
                  {proj.required_skills.map((skill, idx) => (
                    <span key={idx} className="px-2.5 py-1 text-xs font-medium rounded-md bg-white/5 text-slate-300 border border-white/10">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* AI Match Area */}
              <div className="pt-2">
                 {!matchResults[proj.id] ? (
                   <button 
                     onClick={() => handleMatch(proj.id)}
                     disabled={matchingLoader === proj.id}
                     className="w-full flex justify-center items-center gap-2 py-2.5 rounded-xl bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 transition-all font-semibold text-sm disabled:opacity-50"
                   >
                     <Sparkles size={16} />
                     {matchingLoader === proj.id ? 'Groq Llama-3 Analyzing...' : 'Check Match Rate'}
                   </button>
                 ) : (
                   <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/10 border border-purple-500/30 rounded-xl p-4 animate-in fade-in zoom-in duration-300">
                     <div className="flex justify-between items-center mb-2">
                       <span className="text-xs font-bold text-purple-300 uppercase flex items-center gap-1"><Sparkles size={12}/> AI Assessment</span>
                       <span className={`text-lg font-black ${matchResults[proj.id].score > 70 ? 'text-teal-400' : matchResults[proj.id].score > 40 ? 'text-yellow-400' : 'text-red-400'}`}>{matchResults[proj.id].score}%</span>
                     </div>
                     <p className="text-xs text-slate-300 leading-relaxed italic border-l-2 border-purple-500/50 pl-3 py-1">"{matchResults[proj.id].reason}"</p>
                   </div>
                 )}
              </div>
              
              {/* Comments Display */}
              {proj.comments?.length > 0 && (
                <div className="pt-4 border-t border-white/5 space-y-2.5">
                  {proj.comments.map(c => (
                    <div key={c.id} className="flex gap-2">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center font-bold text-[9px] text-white shrink-0 mt-0.5">
                        {c.user_name.charAt(0)}
                      </div>
                      <div className="bg-white/5 rounded-lg px-2.5 py-1.5 w-full">
                        <span className="text-xs font-medium text-slate-300 mr-2">{c.user_name}</span>
                        <p className="text-xs text-slate-400 mt-0.5">{c.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Box Target */}
              {activeReply === proj.id && (
                <div className="pt-3 border-t border-white/5 flex gap-2 animate-in fade-in">
                  <input 
                    type="text"
                    placeholder={user ? "Ask a question..." : "Sign in to ask..."}
                    value={replyTexts[proj.id] || ""}
                    onChange={e => setReplyTexts({...replyTexts, [proj.id]: e.target.value})}
                    onKeyDown={e => e.key === 'Enter' && handleAddComment(proj.id)}
                    disabled={!user}
                    className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 transition-colors"
                  />
                  <button onClick={() => handleAddComment(proj.id)} disabled={!user || !replyTexts[proj.id]?.trim()} className="bg-teal-600 hover:bg-teal-500 disabled:bg-slate-800 disabled:text-slate-500 text-white px-3 h-8 rounded-lg text-xs font-bold transition-colors">
                    Post
                  </button>
                </div>
              )}

              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                    <Users size={16} />
                    <span>{proj.members?.length || 1} Mbrs</span>
                  </div>
                  <button onClick={() => setActiveReply(activeReply === proj.id ? null : proj.id)} className={`flex items-center gap-1.5 hover:text-white transition-colors text-sm font-medium ${activeReply === proj.id ? 'text-white' : 'text-slate-400'}`}>
                    <MessageSquare size={16} />
                    <span>{proj.comments?.length || 0}</span>
                  </button>
                </div>
                {user && proj.owner_uid === user.uid ? (
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={async () => {
                        const isOpen = !membersOpen[proj.id];
                        setMembersOpen(prev => ({...prev, [proj.id]: isOpen}));
                        if (isOpen && !membersData[proj.id]) {
                          const res = await fetch(`http://localhost:8000/api/projects/${proj.id}/members`);
                          const data = await res.json();
                          if (data.success) setMembersData(prev => ({...prev, [proj.id]: data.members}));
                        }
                      }}
                      className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors text-sm font-medium"
                    >
                      <Users size={16} />
                      <span>Members ({proj.members?.length || 1})</span>
                      {membersOpen[proj.id] ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                    </button>
                    <button onClick={() => handleDelete(proj.id)} className="flex items-center gap-1.5 text-slate-500 hover:text-red-400 transition-colors text-sm font-medium">
                      <Trash2 size={16} />
                      <span>Delete</span>
                    </button>
                  </div>
                ) : user && proj.members?.includes(user.uid) ? (
                  <button onClick={() => handleJoin(proj.id)} className="text-slate-400 font-medium text-sm hover:text-white transition-colors">
                    Leave Team
                  </button>
                ) : (
                  <button onClick={() => handleJoin(proj.id)} className="text-teal-400 font-medium text-sm hover:text-teal-300 transition-colors">
                    Join &rarr;
                  </button>
                )}
              </div>

              {/* Owner-only Members Panel */}
              {user && proj.owner_uid === user.uid && membersOpen[proj.id] && (
                <div className="mt-3 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
                  <p className="text-xs font-bold text-indigo-300 uppercase mb-3 tracking-wider">👥 Team Members</p>
                  {!membersData[proj.id] ? (
                    <p className="text-xs text-slate-500">Loading...</p>
                  ) : membersData[proj.id].length === 0 ? (
                    <p className="text-xs text-slate-500">No members yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {membersData[proj.id].map(m => (
                        <div key={m.uid} className="rounded-lg bg-white/5 overflow-hidden">
                          <div className="flex items-start justify-between p-2 hover:bg-white/5 transition-colors">
                            <div>
                              <p className="text-sm font-semibold text-white">{m.name}</p>
                              {m.branch && <p className="text-xs text-slate-400">{m.branch}</p>}
                              {m.skills?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {m.skills.slice(0,3).map(s => <span key={s} className="text-[10px] px-1.5 py-0.5 bg-teal-500/20 text-teal-300 rounded">{s}</span>)}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => setContactOpen(prev => ({...prev, [m.uid]: !prev[m.uid]}))}
                              className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all ml-2 shrink-0 mt-0.5 ${
                                contactOpen[m.uid] 
                                  ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-500/40' 
                                  : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20'
                              }`}
                            >
                              <Mail size={12}/>
                              {contactOpen[m.uid] ? 'Hide' : 'Contact'}
                            </button>
                          </div>
                          {contactOpen[m.uid] && (
                            <div className="px-3 pb-3 pt-1 bg-indigo-900/20 border-t border-indigo-500/20 animate-in fade-in duration-150">
                              <p className="text-xs text-slate-400 mb-1">📧 Email</p>
                              <span className="text-sm font-mono text-indigo-300 break-all">{m.email}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )})}
        {filteredProjects.length === 0 && <div className="col-span-full py-12 text-center text-slate-500 text-lg">No projects match your search! Try another skill.</div>}
      </div>

    </div>
  );
}
