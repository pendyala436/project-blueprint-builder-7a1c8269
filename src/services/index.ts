/**
 * Services Index
 * 
 * Central export for all API service modules.
 * Services handle all communication with the backend (Supabase).
 * 
 * MVP Architecture:
 * - Frontend: React components + hooks
 * - Services: API abstraction layer (this folder)
 * - Backend: Supabase (database + edge functions)
 */

export * from './auth.service';
export * from './profile.service';
export * from './wallet.service';
export * from './chat.service';
export * from './admin.service';
