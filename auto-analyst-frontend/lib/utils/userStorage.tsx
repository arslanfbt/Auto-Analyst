// Simple multi-user localStorage management
// Adds user-specific prefixes to localStorage keys

export const getCurrentUserId = (): string => {
  if (typeof window === 'undefined') return 'guest';
  
  // Check for NextAuth session token
  const sessionToken = document.cookie
    .split(';')
    .find(cookie => cookie.trim().startsWith('next-auth.session-token='));
  
  if (sessionToken) {
    try {
      // Extract user ID from JWT token (simplified)
      const token = sessionToken.split('=')[1];
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub || payload.email || 'unknown';
    } catch {
      return 'unknown';
    }
  }
  
  // Check for admin
  if (localStorage.getItem('isAdmin') === 'true') {
    return 'admin';
  }
  
  return 'guest';
};

export const getUserStorageKey = (key: string): string => {
  const userId = getCurrentUserId();
  return `${userId}:${key}`;
};

export const clearUserData = (userId: string): void => {
  if (typeof window === 'undefined') return;
  
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(`${userId}:`)) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
};

export const switchUser = (newUserId: string): void => {
  if (typeof window === 'undefined') return;
  
  // Clear current user's data
  const currentUserId = getCurrentUserId();
  if (currentUserId !== newUserId) {
    clearUserData(currentUserId);
  }
};
