import { useState, useEffect } from 'react';
import { MessageSquare, ArrowUp, Share2, PlusCircle, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import API_URL from '../api';
import CreatePostModal from '../components/CreatePostModal';

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeReply, setActiveReply] = useState(null);
  const [replyTexts, setReplyTexts] = useState({});
  const { user, login } = useAuth();

  const fetchPosts = () => {
    fetch(`${API_URL}/api/community`)
      .then(res => res.json())
      .then(data => setPosts(data))
      .catch(err => console.error("API error", err));
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleCreatePost = async (postData) => {
    if (!user) return;
    
    const payload = {
      ...postData,
      author_uid: user.uid,
      author_name: user.display_name,
      upvotes: 0
    };

    try {
      const res = await fetch(`${API_URL}/api/community`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) fetchPosts();
    } catch (err) {
      console.error("Failed to submit post", err);
    }
  };

  const handleUpvote = async (postId) => {
    if (!user) return login();

    try {
      // Optimistic update assumes success is too complex with the toggle. Let's just await.
      const res = await fetch(`${API_URL}/api/community/${postId}/upvote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.uid })
      });
      const data = await res.json();
      if (data.success) {
        setPosts(posts.map(p => p.id === postId ? { ...p, upvotes: data.new_upvotes, upvoted_by: data.upvoted_by } : p));
      }
    } catch (err) {
      console.error("Failed to upvote", err);
    }
  };

  const handleAddComment = async (postId) => {
    if (!user) return login();
    const text = replyTexts[postId];
    if (!text?.trim()) return;

    try {
      const res = await fetch(`${API_URL}/api/community/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.uid, user_name: user.display_name, text })
      });
      if (res.ok) {
         setReplyTexts(prev => ({ ...prev, [postId]: "" }));
         setActiveReply(null);
         fetchPosts();
      }
    } catch(err) {
      console.error("Failed to add comment", err);
    }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      const res = await fetch(`${API_URL}/api/community/${postId}`, { method: 'DELETE' });
      if (res.ok) fetchPosts();
    } catch(err) {
      console.error("Failed to delete post", err);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white/[0.02] border border-white/5 p-8 rounded-3xl backdrop-blur-md">
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 mb-2">
            Community Campus
          </h1>
          <p className="text-slate-400 text-lg max-w-xl">
            Break out of your branch. Connect, share knowledge, and build the ultimate interdisciplinary team.
          </p>
        </div>
        <button 
          onClick={user ? () => setIsModalOpen(true) : login}
          className="hidden md:flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white px-6 py-3 rounded-xl transition-all font-medium border border-white/10 hover:border-white/20 hover:shadow-lg"
        >
          <PlusCircle size={20} />
          <span>{user ? 'New Post' : 'Sign in to Post'}</span>
        </button>
      </div>

      <CreatePostModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={handleCreatePost} 
      />

      <div className="grid gap-6 max-w-4xl">
        {posts.map(post => {
          const isUpvoted = user && post.upvoted_by?.includes(user.uid);
          return (
          <div key={post.id} className="group p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-purple-500/40 hover:bg-white/[0.04] transition-all backdrop-blur-sm shadow-xl flex gap-6">
            
            <div className="flex flex-col items-center gap-2">
              <button 
                onClick={() => handleUpvote(post.id)}
                className={`p-2 rounded-lg transition-colors ${isUpvoted ? 'bg-purple-500/20 text-purple-400' : 'hover:bg-white/10 hover:text-purple-400 text-slate-400'}`}
              >
                <ArrowUp size={24} strokeWidth={2.5} />
              </button>
              <span className={`font-bold ${isUpvoted ? 'text-purple-400' : 'text-slate-200'}`}>{post.upvotes}</span>
            </div>

            <div className="flex-1">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-sm shadow-inner text-white">
                    {post.author_name.charAt(0)}
                  </div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-slate-300">{post.author_name}</h3>
                    <span className="text-xs text-slate-500">• {new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                {user && post.author_uid === user.uid && (
                  <button onClick={() => handleDelete(post.id)} className="text-slate-500 hover:text-red-400 transition-colors p-1" title="Delete Post">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              
              <h2 className="text-xl font-bold text-slate-100 mb-2 group-hover:text-purple-300 transition-colors">
                {post.title}
              </h2>
              <p className="text-slate-400 mb-5 leading-relaxed whitespace-pre-wrap">
                {post.content}
              </p>
              
              <div className="flex items-center justify-between mt-auto">
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag, idx) => (
                    <span key={idx} className="px-3 py-1 text-xs font-medium rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20">
                      {tag}
                    </span>
                  ))}
                </div>
                
                <div className="flex items-center gap-4 text-slate-400">
                  <button onClick={() => setActiveReply(activeReply === post.id ? null : post.id)} className={`flex items-center gap-1.5 hover:text-white transition-colors text-sm font-medium ${activeReply === post.id ? 'text-white' : ''}`}>
                    <MessageSquare size={18} />
                    <span>{post.comments?.length > 0 ? `${post.comments.length} Replies` : 'Reply'}</span>
                  </button>
                  <button className="flex items-center gap-1.5 hover:text-white transition-colors text-sm font-medium">
                    <Share2 size={18} />
                    <span>Share</span>
                  </button>
                </div>
              </div>

              {/* Comments Section */}
              {post.comments?.length > 0 && (
                <div className="mt-5 pt-5 border-t border-white/5 space-y-3">
                  {post.comments.map(c => (
                    <div key={c.id} className="flex gap-3 bg-white/[0.02] p-3 rounded-xl border border-white/[0.02]">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-[10px] text-white shrink-0 mt-0.5">
                        {c.user_name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="text-sm font-medium text-slate-300">{c.user_name}</span>
                          <span className="text-xs text-slate-500">{new Date(c.timestamp).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-slate-400">{c.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Active Reply Box */}
              {activeReply === post.id && (
                <div className="mt-4 pt-4 border-t border-white/5 flex gap-3 animate-in fade-in slide-in-from-top-2">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-white shrink-0">
                    {user ? user.display_name.charAt(0) : '?'}
                  </div>
                  <input 
                    type="text"
                    placeholder={user ? "Type your thoughtful reply..." : "Sign in to reply..."}
                    value={replyTexts[post.id] || ""}
                    onChange={e => setReplyTexts({...replyTexts, [post.id]: e.target.value})}
                    onKeyDown={e => e.key === 'Enter' && handleAddComment(post.id)}
                    disabled={!user}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-50"
                  />
                  <button onClick={() => handleAddComment(post.id)} disabled={!user || !replyTexts[post.id]?.trim()} className="bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 text-white px-5 py-2 rounded-xl text-sm font-bold transition-colors shadow-lg">
                    Post
                  </button>
                </div>
              )}
            </div>
          </div>
        )})}
        {posts.length === 0 && <div className="text-center text-slate-500 py-10 border border-dashed border-white/10 rounded-2xl">No posts yet! Be the first to start a discussion.</div>}
      </div>
    </div>
  );
}
