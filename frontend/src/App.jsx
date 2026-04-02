import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Home from './pages/Home';
import Discover from './pages/Discover';
import Onboarding from './pages/Onboarding';
import Profile from './pages/Profile';
import ProjectDetails from './pages/ProjectDetails';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useLocation, Navigate } from 'react-router-dom';

import { AnimatePresence, motion } from 'framer-motion';

function RouterGuard({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (user && !user.has_profile && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  
  return children;
}

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}}><Landing /></motion.div>} />
        <Route path="/community" element={<motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}}><Home /></motion.div>} />
        <Route path="/discover" element={<motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}}><Discover /></motion.div>} />
        <Route path="/onboarding" element={<motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}}><Onboarding /></motion.div>} />
        <Route path="/profile" element={<motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}}><Profile /></motion.div>} />
        <Route path="/projects/:id" element={<motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}}><ProjectDetails /></motion.div>} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-[#0b0c10] text-slate-100 font-sans selection:bg-purple-500/30 relative">
        {/* Ambient background glows */}
        <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none z-0"></div>
        <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none z-0"></div>

        <div className="relative z-10 flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <RouterGuard>
              <AnimatedRoutes />
            </RouterGuard>
          </main>
        </div>
      </div>
    </Router>
    </AuthProvider>
  );
}
