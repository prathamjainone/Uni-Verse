import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API_URL from '../api';
import { Rocket, GraduationCap, Github, Briefcase, Plus, X } from 'lucide-react';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    branch: '',
    year: '',
    github: '',
    bio: ''
  });
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingGithub, setSyncingGithub] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (user) {
      fetch(`${API_URL}/api/users/${user.uid}`)
        .then(res => res.json())
        .then(data => {
          if (data.id) { // Not a 404
            setFormData({
              display_name: data.display_name || user.display_name || '',
              branch: data.branch || '',
              year: data.year || '',
              github: data.github || '',
              bio: data.bio || ''
            });
            setSkills(data.skills || []);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [user]);

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

  const handleGithubSync = async () => {
    if (!formData.github) return;
    
    // Extract username from URL or raw input
    let username = formData.github.trim();
    if (username.includes('github.com/')) {
        username = username.split('github.com/')[1].split('/')[0];
    }
    
    if (!username) return;

    setSyncingGithub(true);
    try {
      const res = await fetch(`https://api.github.com/users/${username}/repos?per_page=100`);
      if (!res.ok) throw new Error("Could not fetch repos");
      const repos = await res.json();
      
      const languages = new Set();
      repos.forEach(repo => {
        if (repo.language) languages.add(repo.language);
      });
      
      const newSkills = Array.from(languages);
      const combined = new Set([...skills, ...newSkills]);
      
      setSkills(Array.from(combined));
      setSuccessMsg(`Synced ${newSkills.length} programming languages from GitHub!`);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      console.error(err);
      alert("Failed to sync GitHub. Make sure the username is correct.");
    } finally {
      setSyncingGithub(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');

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
        // Update the Navbar name/avatar immediately without reload
        updateUser({ display_name: formData.display_name });
        setSuccessMsg('Profile updated successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      console.error("Failed to save profile", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center pt-20 text-slate-400">Loading profile...</div>;

  return (
    <div className="min-h-[80vh] flex items-center justify-center animate-in fade-in duration-500 pt-10 pb-20">
      <div className="w-full max-w-2xl bg-white/[0.02] border border-white/5 p-8 md:p-12 rounded-3xl backdrop-blur-md shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-white mb-2">My Profile Settings</h1>
          <p className="text-slate-400">Update your basic details, skills, and pitch.</p>
        </div>

        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-teal-500/20 border border-teal-500/30 text-teal-300 text-sm font-semibold text-center animate-in fade-in">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300">Display Name</label>
            <input required type="text" placeholder="Your Name" value={formData.display_name} onChange={e => setFormData({...formData, display_name: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors" />
          </div>

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
            <label className="text-sm font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-2"><Github size={16} className="text-slate-400" /> GitHub URL or Username</span>
              {formData.github && (
                 <button 
                   type="button" 
                   onClick={handleGithubSync}
                   disabled={syncingGithub}
                   className="text-xs font-bold text-slate-800 bg-white hover:bg-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all"
                 >
                    {syncingGithub ? <div className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin"></div> : <Rocket size={12} />}
                    {syncingGithub ? 'Syncing...' : 'Auto-Sync Skills'}
                 </button>
              )}
            </label>
            <input type="text" placeholder="username or https://github.com/..." value={formData.github} onChange={e => setFormData({...formData, github: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-slate-500 transition-colors" />
            <p className="text-[10px] text-slate-500">Syncing will analyze your public repositories and automatically add your top languages to your Skills.</p>
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

          <button disabled={saving} type="submit" className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold shadow-[0_0_20px_rgba(168,85,247,0.2)] hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] transition-all transform hover:-translate-y-1 disabled:opacity-70 disabled:hover:translate-y-0 text-lg flex justify-center items-center gap-2">
            {saving ? 'Updating...' : 'Save Profile Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
