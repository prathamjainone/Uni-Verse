import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Rocket, GraduationCap, Github, Briefcase, Plus, X } from 'lucide-react';
import API_URL from '../api';

export default function Onboarding() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    branch: '',
    year: '',
    github: '',
    bio: ''
  });
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) navigate('/');
    if (user?.has_profile) navigate('/discover');
  }, [user, navigate]);

  const handleAddSkill = (e) => {
    e.preventDefault();
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput('');
    }
  };

  const removeSkill = (skillToRemove) => {
    setSkills(skills.filter(s => s !== skillToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      uid: user.uid,
      email: user.email,
      display_name: user.display_name,
      ...formData,
      skills
    };

    try {
      const res = await fetch(`${API_URL}/api/users/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        // Push skills into context so matchmaking works without reload
        updateUser({ skills, ...formData, has_profile: true });
        window.location.href = '/discover';
      }
    } catch (err) {
      console.error("Failed to save profile", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center animate-in fade-in duration-500 pt-10 pb-20">
      <div className="w-full max-w-2xl bg-white/[0.02] border border-white/5 p-8 md:p-12 rounded-3xl backdrop-blur-md shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-teal-500/20 transform -rotate-6">
            <Rocket className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-2">Complete Your Profile</h1>
          <p className="text-slate-400">Tell us about yourself so we can match you with the perfect hackathons and teammates.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Briefcase size={16} className="text-teal-400" /> Branch / Major
              </label>
              <input required type="text" placeholder="e.g. Computer Science" value={formData.branch} onChange={e => setFormData({...formData, branch: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <GraduationCap size={16} className="text-purple-400" /> Year of Study
              </label>
              <select required value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors appearance-none cursor-pointer">
                <option value="" disabled className="bg-slate-900">Select Year</option>
                <option value="1" className="bg-slate-900">1st Year</option>
                <option value="2" className="bg-slate-900">2nd Year</option>
                <option value="3" className="bg-slate-900">3rd Year</option>
                <option value="4" className="bg-slate-900">4th Year</option>
                <option value="Alumni" className="bg-slate-900">Alumni</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Github size={16} className="text-slate-400" /> GitHub URL (Optional)
            </label>
            <input type="url" placeholder="https://github.com/username" value={formData.github} onChange={e => setFormData({...formData, github: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-slate-500 transition-colors" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300">Skills</label>
            <div className="p-3 bg-black/20 border border-white/10 rounded-xl focus-within:border-teal-500 transition-colors min-h-[50px]">
              <div className="flex flex-wrap gap-2 mb-2">
                {skills.map(skill => (
                  <span key={skill} className="flex items-center gap-1.5 px-3 py-1 bg-teal-500/20 text-teal-300 rounded-lg text-sm font-medium border border-teal-500/30">
                    {skill}
                    <button type="button" onClick={() => removeSkill(skill)} className="hover:text-teal-100"><X size={14} /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" placeholder="Add a skill (e.g. React, UX, Python)..." value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddSkill(e)} className="flex-1 bg-transparent text-white focus:outline-none text-sm placeholder:text-slate-500" />
                <button type="button" onClick={handleAddSkill} disabled={!skillInput.trim()} className="text-teal-400 hover:text-teal-300 disabled:opacity-50"><Plus size={20} /></button>
              </div>
            </div>
            <p className="text-xs text-slate-500">Press Enter to add multiple skills</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300">Short Bio</label>
            <textarea required rows="3" placeholder="I am highly passionate about..." value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors resize-none"></textarea>
          </div>

          <button disabled={loading} type="submit" className="w-full py-4 rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 text-white font-bold shadow-[0_0_20px_rgba(45,212,191,0.2)] hover:shadow-[0_0_30px_rgba(45,212,191,0.4)] transition-all transform hover:-translate-y-1 disabled:opacity-70 disabled:hover:translate-y-0 text-lg flex justify-center items-center gap-2">
            {loading ? 'Saving Profile...' : 'Complete Setup 🚀'}
          </button>
        </form>
      </div>
    </div>
  );
}
