import { ArrowRight, Sparkles, Code, Users, Rocket } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] text-center space-y-12 animate-in fade-in zoom-in duration-700">
      
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 font-medium text-sm my-4">
        <Sparkles size={16} />
        <span>The premier hub for interdisciplinary teams</span>
      </div>

      <div className="space-y-6 max-w-4xl relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-blue-600/20 blur-[120px] rounded-full -z-10"></div>
        <h1 className="text-6xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 drop-shadow-xl tracking-tight leading-tight">
          Build the ultimate <br/> student startup.
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed pt-4">
          Stop struggling to find a technical co-founder or a marketing genius. Uni-Verse bridges the gap between faculties to match you with exactly the talent your project needs.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 pt-4">
        <Link 
          to="/discover" 
          className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-2xl text-lg hover:shadow-[0_0_40px_rgba(168,85,247,0.5)] transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2 overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          <span className="relative z-10">Discover Projects</span>
          <ArrowRight className="relative z-10 group-hover:translate-x-1 transition-transform" />
        </Link>
        <Link 
          to="/community" 
          className="px-8 py-4 bg-white/5 text-white font-bold rounded-2xl text-lg hover:bg-white/10 hover:border-white/20 border border-white/5 transition-all flex items-center justify-center"
        >
          Join Community
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mt-24 max-w-5xl w-full text-left pt-16 border-t border-white/5">
        <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-500/5 to-transparent border border-blue-500/10">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 mb-6">
            <Users size={24} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Branch Agnostic</h3>
          <p className="text-slate-400">Whether you're in Law, CS, or Business, discover opportunities tailored uniquely for your skillset.</p>
        </div>
        <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-500/5 to-transparent border border-purple-500/10">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 mb-6">
            <Code size={24} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Automated Matching</h3>
          <p className="text-slate-400">Our skill-based taxonomy immediately pairs your open roles with the most qualified students on campus.</p>
        </div>
        <div className="p-6 rounded-3xl bg-gradient-to-br from-teal-500/5 to-transparent border border-teal-500/10">
          <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-400 mb-6">
            <Rocket size={24} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Build Together</h3>
          <p className="text-slate-400">Manage your project teams, hold discussions, and move from ideation to launch in a unified hub.</p>
        </div>
      </div>
    </div>
  );
}
