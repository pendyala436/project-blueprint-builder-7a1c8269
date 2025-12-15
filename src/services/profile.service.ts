/**
 * Profile Service
 * 
 * Handles all profile-related API calls.
 * Uses the single 'profiles' table as the source of truth for all user data.
 */

import { supabase } from '@/integrations/supabase/client';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  age: number | null;
  date_of_birth: string | null;
  gender: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  bio: string | null;
  photo_url: string | null;
  interests: string[] | null;
  life_goals: string[] | null;
  occupation: string | null;
  education_level: string | null;
  height_cm: number | null;
  body_type: string | null;
  marital_status: string | null;
  religion: string | null;
  smoking_habit: string | null;
  drinking_habit: string | null;
  dietary_preference: string | null;
  fitness_level: string | null;
  has_children: boolean | null;
  pet_preference: string | null;
  travel_frequency: string | null;
  personality_type: string | null;
  zodiac_sign: string | null;
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
  life_goals?: string[];
  occupation?: string;
  education_level?: string;
  religion?: string;
  marital_status?: string;
  height_cm?: number;
  body_type?: string;
  country?: string;
  state?: string;
  city?: string;
  smoking_habit?: string;
  drinking_habit?: string;
  dietary_preference?: string;
  fitness_level?: string;
  has_children?: boolean;
  pet_preference?: string;
  travel_frequency?: string;
  personality_type?: string;
  zodiac_sign?: string;
  primary_language?: string;
  preferred_language?: string;
  photo_url?: string;
}

/**
 * Non-editable fields that users cannot modify after registration
 */
export const PROTECTED_FIELDS = ['email', 'phone', 'gender'] as const;

/**
 * Get profile by user ID from the single profiles table
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
 * Update user profile in the single profiles table
 * Protected fields (email, phone, gender) are excluded from updates
 */
export async function updateProfile(
  userId: string,
  updates: ProfileUpdateData
): Promise<{ success: boolean; error?: string }> {
  // Remove any protected fields from updates
  const safeUpdates = { ...updates };
  PROTECTED_FIELDS.forEach(field => {
    delete (safeUpdates as any)[field];
  });

  const { error } = await supabase
    .from('profiles')
    .update({
      ...safeUpdates,
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
