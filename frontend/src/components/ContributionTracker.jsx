import { useState, useEffect } from 'react';
import { 
  BarChart3, GitCommit, Shield, ShieldOff, AlertTriangle, 
  Activity, Code, Braces, GitBranch, RefreshCw, TrendingUp, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import API_URL from '../api';

// ── Animated percentage bar ───────────────────────────────────────────────
function ContributionBar({ percentage, color, delay = 0 }) {
  return (
    <div className="w-full bg-black/40 rounded-full h-3 overflow-hidden border border-white/5">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(percentage, 100)}%` }}
        transition={{ duration: 1.2, delay, ease: "easeOut" }}
        className={`h-full rounded-full ${color}`}
      />
    </div>
  );
}

// ── Stat pill ─────────────────────────────────────────────────────────────
function StatPill({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-black/30 rounded-lg border border-white/5">
      <Icon size={12} className={color} />
      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{label}</span>
      <span className="text-xs font-black text-white ml-auto">{value}</span>
    </div>
  );
}

export default function ContributionTracker({ projectId, isOwner }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [showCommitLog, setShowCommitLog] = useState(false);

  // Color palette for contributors
  const COLORS = [
    'bg-gradient-to-r from-emerald-500 to-teal-400',
    'bg-gradient-to-r from-blue-500 to-indigo-400',
    'bg-gradient-to-r from-purple-500 to-pink-400',
    'bg-gradient-to-r from-amber-500 to-orange-400',
    'bg-gradient-to-r from-rose-500 to-red-400',
    'bg-gradient-to-r from-cyan-500 to-sky-400',
  ];

  const DOT_COLORS = [
    'bg-emerald-400', 'bg-blue-400', 'bg-purple-400',
    'bg-amber-400', 'bg-rose-400', 'bg-cyan-400',
  ];

  const fetchContributions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/vetting/contributions/${projectId}`);
      const json = await res.json();
      if (json.success && json.has_data) {
        setData(json);
      } else {
        setData(null);
      }
    } catch (err) {
      console.error("Failed to fetch contributions", err);
    } finally {
      setLoading(false);
    }
  };

  const triggerScan = async () => {
    setScanning(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/vetting/scan/${projectId}`, {
        method: 'POST',
      });
      const json = await res.json();
      if (json.success) {
        // Re-fetch the cached data
        await fetchContributions();
      } else {
        setError(json.detail || 'Scan failed');
      }
    } catch (err) {
      setError('Failed to connect. Make sure the project has a GitHub URL linked.');
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    fetchContributions();
  }, [projectId]);

  // Sort contributors by score descending
  const contributors = data?.contributors
    ? Object.entries(data.contributors)
        .sort((a, b) => b[1].total_score - a[1].total_score)
    : [];

  const grandTotal = data?.grand_total || 0;

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-5 bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-xl">
              <Activity size={18} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">
                Contribution Tracker
              </h3>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {data && (
              <button
                onClick={fetchContributions}
                disabled={loading}
                className="p-2 text-slate-500 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                title="Refresh"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            )}
            {isOwner && (
              <button
                onClick={triggerScan}
                disabled={scanning}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/20 transition-all disabled:opacity-50"
              >
                {scanning ? (
                  <>
                    <div className="w-3 h-3 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Zap size={12} />
                    {data ? 'Re-Scan' : 'Scan Repo'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        {error && (
          <div className={`flex items-center gap-2 p-3 rounded-xl mb-4 ${
            data 
              ? 'bg-amber-500/10 border border-amber-500/20' 
              : 'bg-red-500/10 border border-red-500/20'
          }`}>
            <AlertTriangle size={14} className={data ? "text-amber-400 shrink-0" : "text-red-400 shrink-0"} />
            <p className={`text-xs ${data ? 'text-amber-300' : 'text-red-300'}`}>
              {data ? `Re-scan skipped: ${error}. Showing cached data.` : error}
            </p>
          </div>
        )}

        {!data && !loading && !scanning && (
          <div className="text-center py-10">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/5 flex items-center justify-center">
              <GitBranch size={24} className="text-slate-600" />
            </div>
            <p className="text-sm text-slate-400 mb-1 font-semibold">No contribution data yet</p>
            <p className="text-xs text-slate-600 mb-5">
              {isOwner 
                ? "Link a GitHub repo and hit 'Scan Repo' to analyze contributions." 
                : "The project owner can scan the GitHub repo to analyze contributions."}
            </p>
          </div>
        )}

        {(loading || scanning) && !data && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-10 h-10 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-xs text-slate-500">
              {scanning ? 'Analyzing commits with AST engine...' : 'Loading contribution data...'}
            </p>
          </div>
        )}

        {data && (
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-2 mb-6">
                <StatPill icon={GitCommit} label="Commits" value={data.commits_analyzed || 0} color="text-blue-400" />
                <StatPill icon={TrendingUp} label="Total Score" value={grandTotal} color="text-emerald-400" />
                <StatPill icon={Code} label="Repo" value={data.repo || '—'} color="text-purple-400" />
              </div>

              {/* Contribution Bars */}
              <div className="space-y-4 mb-6">
                {contributors.map(([username, info], idx) => {
                  const pct = grandTotal > 0 
                    ? ((info.total_score / grandTotal) * 100).toFixed(1) 
                    : 0;
                  const isStripped = parseFloat(pct) < 5;
                  
                  return (
                    <motion.div
                      key={username}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="group"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${DOT_COLORS[idx % DOT_COLORS.length]}`} />
                          <span className="text-sm font-bold text-white">{username}</span>
                          {isStripped && grandTotal > 0 && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-500/10 text-red-400 text-[9px] font-bold rounded border border-red-500/20">
                              <ShieldOff size={8} /> LOW
                            </span>
                          )}
                          {!isStripped && grandTotal > 0 && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-bold rounded border border-emerald-500/20">
                              <Shield size={8} /> VERIFIED
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500">
                            {info.commits} commit{info.commits !== 1 ? 's' : ''}
                          </span>
                          <span className="text-sm font-black text-white tabular-nums">
                            {pct}%
                          </span>
                        </div>
                      </div>
                      
                      <ContributionBar
                        percentage={parseFloat(pct)}
                        color={COLORS[idx % COLORS.length]}
                        delay={idx * 0.1}
                      />
                      
                      {/* Breakdown on hover */}
                      <div className="flex gap-3 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] text-emerald-600 flex items-center gap-1">
                          + {(info.additions || 0).toLocaleString()} lines
                        </span>
                        <span className="text-[10px] text-red-600 flex items-center gap-1">
                          − {(info.deletions || 0).toLocaleString()} lines
                        </span>
                        <span className="text-[10px] text-slate-600 ml-auto">
                          Score: {info.total_score.toLocaleString()}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Commit Log Toggle */}
              {data.commit_log && data.commit_log.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowCommitLog(!showCommitLog)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-black/30 rounded-xl border border-white/5 hover:border-white/10 transition-all text-sm"
                  >
                    <span className="flex items-center gap-2 text-slate-400 font-semibold">
                      <GitCommit size={14} />
                      Recent Commits ({data.commit_log.length})
                    </span>
                    <motion.span
                      animate={{ rotate: showCommitLog ? 180 : 0 }}
                      className="text-slate-500 text-xs"
                    >
                      ▼
                    </motion.span>
                  </button>

                  <AnimatePresence>
                    {showCommitLog && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 max-h-[300px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                          {data.commit_log.map((commit, idx) => (
                            <div
                              key={commit.sha + idx}
                              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.02] transition-colors"
                            >
                              <code className="text-[10px] text-indigo-400 font-mono bg-indigo-500/10 px-1.5 py-0.5 rounded">
                                {commit.sha}
                              </code>
                              <span className="text-xs text-slate-400 truncate flex-1">
                                {commit.message}
                              </span>
                              <span className="text-[10px] text-slate-600 shrink-0">
                                {commit.author}
                              </span>

                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
