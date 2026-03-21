// Central API base URL — switches automatically between local dev and production
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export default API_URL;
