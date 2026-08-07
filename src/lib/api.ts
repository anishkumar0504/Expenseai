const BASE = import.meta.env.VITE_API_BASE_URL || '';

export const apiFetch = (path: string, init?: RequestInit) => 
  fetch(`${BASE}${path}`, init);