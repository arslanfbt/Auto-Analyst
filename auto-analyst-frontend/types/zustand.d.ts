// This file helps TypeScript understand Zustand's persist middleware
import 'zustand/middleware';

declare module 'zustand/middleware' {
  export interface PersistOptions<T> {
    name: string;
    getStorage?: () => Storage;
    version?: number | string;
    partialize?: (state: T) => Partial<T>;
    onRehydrateStorage?: (state: T) => ((state?: T) => void) | void;
    migrate?: (persistedState: any, version: number | string) => T;
    merge?: (persistedState: any, currentState: T) => T;
  }

  export const persist: <T>(
    config: (set: any, get: any, api: any) => T,
    options: PersistOptions<T>
  ) => (set: any, get: any, api: any) => T;
} 