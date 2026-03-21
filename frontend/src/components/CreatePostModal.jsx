import { useState } from 'react';
import { X } from 'lucide-react';

export default function CreatePostModal({ isOpen, onClose, onSubmit }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    
    setIsSubmitting(true);
    const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
    
    await onSubmit({ title, content, tags: tagArray });
    
    setIsSubmitting(false);
    setTitle('');
    setContent('');
    setTags('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-slate-800">
          <h2 className="text-2xl font-bold text-white">Share with Campus</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Discussion Title</label>
            <input 
              type="text" 
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              placeholder="e.g. Looking for UI feedback on my prototype"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
            <textarea 
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
              placeholder="What's on your mind? Be descriptive..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Tags (comma separated)</label>
            <input 
              type="text" 
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              placeholder="Design, Seeking Team, React..."
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-purple-600 text-white px-8 py-2.5 rounded-lg text-sm font-bold hover:bg-purple-500 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Posting...' : 'Post to Community'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
