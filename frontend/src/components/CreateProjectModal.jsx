import { useState } from 'react';
import { X } from 'lucide-react';

export default function CreateProjectModal({ isOpen, onClose, onSubmit }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [skills, setSkills] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    
    setIsSubmitting(true);
    const skillArray = skills.split(',').map(s => s.trim()).filter(Boolean);
    
    await onSubmit({ title, description, required_skills: skillArray, members: [] });
    
    setIsSubmitting(false);
    setTitle('');
    setDescription('');
    setSkills('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      
      <div className="relative bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-slate-800">
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-400">Launch a Project</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Project Name</label>
            <input 
              type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
              placeholder="e.g. AI Financial Advisor"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Project Description & Pitch</label>
            <textarea 
              required rows={4} value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 resize-none"
              placeholder="Explain what you are building and why..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Required Skills (comma separated)</label>
            <input 
              type="text" value={skills} onChange={(e) => setSkills(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
              placeholder="React, Machine Learning, UI Design..."
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-teal-600 to-blue-600 text-white px-8 py-2.5 rounded-lg text-sm font-bold hover:shadow-[0_0_15px_rgba(20,184,166,0.5)] transition-all disabled:opacity-50">
              {isSubmitting ? 'Launching...' : 'Submit Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
