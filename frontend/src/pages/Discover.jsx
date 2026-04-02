import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, PlusCircle, MessageSquare, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CreateProjectModal from '../components/CreateProjectModal';
import API_URL from '../api';

export default function Discover() {
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user, login } = useAuth();

  const fetchProjects = () => {
    fetch(`${API_URL}/api/projects`)
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
      const res = await fetch(`${API_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) fetchProjects();
    } catch (err) {
      console.error("Failed to create project", err);
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
        {filteredProjects.map(proj => (
          <Link 
            key={proj.id} 
            to={`/projects/${proj.id}`}
            className="flex flex-col p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-teal-500/40 transition-all hover:-translate-y-1 shadow-xl group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-3xl group-hover:bg-teal-500/10 transition-colors"></div>
            
            <div className="mb-2">
              <h3 className="text-xl font-bold text-slate-100 group-hover:text-teal-400 transition-colors">
                {proj.title}
              </h3>
            </div>
            
            <p className="text-slate-400 text-sm mb-6 flex-grow leading-relaxed line-clamp-3">
              {proj.description}
            </p>
            
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Required Skills</span>
                <div className="flex flex-wrap gap-2">
                  {proj.required_skills?.slice(0, 3).map((skill, idx) => (
                    <span key={idx} className="px-2.5 py-1 text-xs font-medium rounded-md bg-white/5 text-slate-300 border border-white/10">
                      {skill}
                    </span>
                  ))}
                  {proj.required_skills?.length > 3 && (
                    <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-white/5 text-slate-400 border border-white/5">
                      +{proj.required_skills.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-auto">
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                    <Users size={14} />
                    <span>{proj.members?.length || 1}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                    <MessageSquare size={14} />
                    <span>{proj.comments?.length || 0}</span>
                  </div>
                </div>
                <div className="text-teal-400 font-bold text-xs flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  View Project <Sparkles size={12}/>
                </div>
              </div>
            </div>
          </Link>
        ))}
        {filteredProjects.length === 0 && <div className="col-span-full py-12 text-center text-slate-500 text-lg">No projects match your search! Try another skill.</div>}
      </div>
    </div>
  );
}
