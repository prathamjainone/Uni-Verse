import { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import API_URL from '../api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize from storage for persistence
  useEffect(() => {
    if (!auth) {
      const saved = localStorage.getItem('universe_user');
      if (saved) setUser(JSON.parse(saved));
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        let profileData = {};
        let hasProfile = false;
        try {
          const res = await fetch(`${API_URL}/api/users/${currentUser.uid}`);
          if (res.ok) {
            const data = await res.json();
            hasProfile = true;
            profileData = {
              skills: data.skills || [],
              branch: data.branch || '',
              year: data.year || '',
              bio: data.bio || '',
              github: data.github || '',
              // Use saved display_name if they updated it, else Firebase name
              display_name: data.display_name || currentUser.displayName,
            };
          }
        } catch (err) {
          console.warn("Could not fetch user profile status from API", err);
        }

        setUser({
          uid: currentUser.uid,
          display_name: profileData.display_name || currentUser.displayName,
          email: currentUser.email,
          photo_url: currentUser.photoURL,
          avatar: (profileData.display_name || currentUser.displayName)?.charAt(0) || 'U',
          has_profile: hasProfile,
          ...profileData
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async () => {
    if (!auth) {
      const mockUser = {
        uid: 'user_' + Math.floor(Math.random() * 10000),
        display_name: 'Demo Student',
        email: 'demo@university.edu',
        branch: 'Computer Science',
        avatar: 'D'
      };
      setUser(mockUser);
      localStorage.setItem('universe_user', JSON.stringify(mockUser));
      return;
    }

    try {
      // Force Google to show the account selector every time for testing
      googleProvider.setCustomParameters({
        prompt: 'select_account'
      });
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
      alert("Firebase Login Error: " + error.message);
    }
  };

  const logout = async () => {
    if (!auth) {
      setUser(null);
      localStorage.removeItem('universe_user');
      return;
    }
    await firebaseSignOut(auth);
  };

  const updateUser = (partialUpdate) => {
    setUser(prev => ({
      ...prev,
      ...partialUpdate,
      avatar: (partialUpdate.display_name || prev.display_name)?.charAt(0) || prev.avatar
    }));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
