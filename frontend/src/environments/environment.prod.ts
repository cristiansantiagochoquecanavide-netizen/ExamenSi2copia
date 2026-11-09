export const environment = {
  production: true,
  get apiUrl(): string {
    if (typeof window !== 'undefined') {
      const custom = (window as any).__API_URL__ || localStorage.getItem('API_URL');
      if (custom) return custom;
    }
    return 'https://fashionstore-backend-48fs.onrender.com/api/v1';
  }
};
