const hostname = window.location.hostname;
let API_URL = 'https://uni-verse-6bbo.onrender.com'; // Default production

if (hostname === 'localhost') {
  API_URL = 'http://localhost:8000';
} else if (hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
  API_URL = `http://${hostname}:8000`;
} else if (import.meta.env && import.meta.env.VITE_API_URL) {
  API_URL = import.meta.env.VITE_API_URL;
}

export default API_URL;
