import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Home from './pages/Home';
import Discover from './pages/Discover';
import Onboarding from './pages/Onboarding';
import Profile from './pages/Profile';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useLocation, Navigate } from 'react-router-dom';

function RouterGuard({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (user && !user.has_profile && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  
  return children;
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
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/community" element={<Home />} />
                <Route path="/discover" element={<Discover />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/profile" element={<Profile />} />
              </Routes>
            </RouterGuard>
          </main>
        </div>
      </div>
    </Router>
    </AuthProvider>
  );
}
