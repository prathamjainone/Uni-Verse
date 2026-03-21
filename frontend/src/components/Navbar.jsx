import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

export default function Navbar() {
  const { user, login, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/70 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-purple-500 p-0.5 shadow-lg shadow-purple-500/20">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <span className="text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-purple-400 font-extrabold text-xl tracking-tighter">UV</span>
              </div>
            </div>
            <Link to="/" className="text-white font-extrabold text-2xl tracking-tight">
              Uni-Verse
            </Link>
          </div>
          
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-2">
              <Link to="/community" className="text-slate-300 hover:text-white hover:bg-white/5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all">Community</Link>
              <Link to="/discover" className="text-slate-300 hover:text-white hover:bg-white/5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all">Discover Teams</Link>
            </div>
          </div>

          <div>
            {user ? (
              <div className="flex items-center gap-4">
                <Link to="/profile" className="flex items-center gap-3 bg-white/5 pl-2 pr-4 py-1.5 rounded-full border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-xs text-white group-hover:shadow-[0_0_10px_rgba(168,85,247,0.4)] transition-all">
                    {user.avatar}
                  </div>
                  <span className="text-sm font-medium text-slate-200 hidden md:inline-block tracking-wide group-hover:text-white transition-colors">{user.display_name}</span>
                </Link>
                <button onClick={logout} className="text-slate-400 hover:text-red-400 hover:bg-red-400/10 p-2 rounded-full transition-all" title="Sign out">
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <button 
                onClick={login}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2.5 rounded-full text-sm font-bold hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all transform hover:-translate-y-0.5"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
