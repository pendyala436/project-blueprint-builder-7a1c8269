/**
 * Profile Service
 * 
 * Handles all profile-related API calls.
 */

import { supabase } from '@/integrations/supabase/client';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  age: number | null;
  gender: string | null;
  country: string | null;
  state: string | null;
  bio: string | null;
  photo_url: string | null;
  interests: string[] | null;
  occupation: string | null;
  education_level: string | null;
  preferred_language: string | null;
  primary_language: string | null;
  is_verified: boolean | null;
  approval_status: string;
  account_status: string;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdateData {
  full_name?: string;
  bio?: string;
  interests?: string[];
  occupation?: string;
  education_level?: string;
  religion?: string;
  marital_status?: string;
  height_cm?: number;
  body_type?: string;
}

/**
 * Get profile by user ID
 */
export async function getProfileByUserId(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data;
}

/**
 * Update user profile
 */
export async function updateProfile(
  userId: string,
  updates: ProfileUpdateData
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get user's languages
 */
export async function getUserLanguages(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('user_languages')
    .select('language_name')
    .eq('user_id', userId);

  return data?.map(l => l.language_name) || [];
}

/**
 * Update user's online status
 */
export async function updateOnlineStatus(
  userId: string,
  isOnline: boolean
): Promise<void> {
  await supabase
    .from('user_status')
    .upsert({
      user_id: userId,
      is_online: isOnline,
      last_seen: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });
}

/**
 * Get user photos
 */
export async function getUserPhotos(userId: string) {
  const { data } = await supabase
    .from('user_photos')
    .select('*')
    .eq('user_id', userId)
    .order('display_order', { ascending: true });

  return data || [];
}
