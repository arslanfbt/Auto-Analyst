import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getUserStorageKey } from '../utils/userStorage'

interface SessionStore {
  sessionId: string | null
  setSessionId: (id: string) => void
  clearSessionId: () => void
  isUserBased: () => boolean
  validateSessionId: (newId: string) => boolean
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      sessionId: null,
      
      setSessionId: (id: string) => {
        const currentState = get();
        
        // Validate the new session ID
        if (currentState.validateSessionId(id)) {
          console.log(`Updating session ID from ${currentState.sessionId} to ${id}`);
          set({ sessionId: id });
        } else {
          console.warn(`Rejected session ID update: ${id}`);
        }
      },
      
      clearSessionId: () => set({ sessionId: null }),
      
      isUserBased: () => {
        const state = get();
        return state.sessionId ? state.sessionId.startsWith('user_') : false;
      },
      
      validateSessionId: (newId: string) => {
        const currentState = get();
        const currentId = currentState.sessionId;
        
        if (!currentId) {
          // No current session ID, accept any new one
          return true;
        }
        
        const isNewUserBased = newId.startsWith('user_');
        const isCurrentUserBased = currentId.startsWith('user_');
        
        // Prevent downgrade from user-based to anonymous
        if (isCurrentUserBased && !isNewUserBased) {
          console.warn('Preventing downgrade from user-based to anonymous session');
          return false;
        }
        
        // Allow upgrade from anonymous to user-based
        if (!isCurrentUserBased && isNewUserBased) {
          console.log('Upgrading from anonymous to user-based session');
          return true;
        }
        
        // Same type, allow if different
        return newId !== currentId;
      }
    }),
    {
      name: 'session-storage',
      storage: {
        getItem: (name: string) => {
          if (typeof window === 'undefined') return null;
          const userKey = getUserStorageKey(name);
          const item = localStorage.getItem(userKey);
          return item ? JSON.parse(item) : null;
        },
        setItem: (name: string, value: any) => {
          if (typeof window === 'undefined') return;
          const userKey = getUserStorageKey(name);
          localStorage.setItem(userKey, JSON.stringify(value));
        },
        removeItem: (name: string) => {
          if (typeof window === 'undefined') return;
          const userKey = getUserStorageKey(name);
          localStorage.removeItem(userKey);
        },
      },
    }
  )
) 