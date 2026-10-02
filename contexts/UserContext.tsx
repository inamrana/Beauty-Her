import React, { createContext, useState, ReactNode, useEffect, useCallback } from 'react';
import * as FileSystem from 'expo-file-system';
import { useAuth, getSupabaseClient } from '@/template';

// Base64 → Uint8Array without atob (not available in React Native hermes)
function decode(base64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const len = clean.length;
  const bytes = new Uint8Array(Math.floor(len * 3 / 4));
  let i = 0, j = 0;
  while (i < len) {
    const a = lookup[clean.charCodeAt(i++)];
    const b = lookup[clean.charCodeAt(i++)];
    const c = lookup[clean.charCodeAt(i++)];
    const d = lookup[clean.charCodeAt(i++)];
    bytes[j++] = (a << 2) | (b >> 4);
    if (j < bytes.length) bytes[j++] = ((b & 0xf) << 4) | (c >> 2);
    if (j < bytes.length) bytes[j++] = ((c & 0x3) << 6) | d;
  }
  return bytes;
}
import {
  getBeautyProfile,
  createBeautyProfile,
  updateBeautyProfile,
  BeautyProfile,
} from '@/services/beautyProfileService';

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string | null;  // public URL or null
  skinType: string;
  hairType: string;
  beautyGoals: string[];
  streak: number;
  totalScans: number;
  beautyScore: number;
  colorSeason: 'spring' | 'summer' | 'autumn' | 'winter';
  joinedDate: string;
  setupComplete: boolean;
}

const DEFAULT_USER: User = {
  id: '',
  name: 'Guest',
  email: '',
  avatar: null,
  skinType: 'Combination',
  hairType: 'Wavy',
  beautyGoals: ['Clear Skin', 'Natural Glow'],
  streak: 0,
  totalScans: 0,
  beautyScore: 0,
  colorSeason: 'autumn',
  joinedDate: new Date().toISOString(),
  setupComplete: false,
};

interface UserContextType {
  user: User;
  loading: boolean;
  updateUser: (updates: Partial<User>) => Promise<void>;
  incrementScanCount: (newScore: number) => Promise<void>;
  completeProfileSetup: (displayName: string, skinType: string, goals: string[]) => Promise<void>;
  uploadAvatar: (localUri: string) => Promise<void>;
  notificationsEnabled: boolean;
  toggleNotifications: () => void;
  darkModeEnabled: boolean;
  toggleDarkMode: () => void;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

function mapProfileToUser(authUser: any, profile: BeautyProfile): User {
  return {
    id: authUser.id,
    name: authUser.username || authUser.email?.split('@')[0] || 'Beautiful',
    email: authUser.email || '',
    avatar: profile.avatar_url ?? null,
    skinType: profile.skin_type || 'Combination',
    hairType: profile.hair_type || 'Wavy',
    beautyGoals: profile.beauty_goals || ['Clear Skin', 'Natural Glow'],
    colorSeason: (profile.color_season as User['colorSeason']) || 'autumn',
    streak: profile.streak || 0,
    totalScans: profile.total_scans || 0,
    beautyScore: profile.beauty_score || 0,
    joinedDate: authUser.created_at || new Date().toISOString(),
    setupComplete: profile.setup_complete ?? false,
  };
}

export function UserProvider({ children }: { children: ReactNode }) {
  const { user: authUser, loading: authLoading } = useAuth();
  const [user, setUser] = useState<User>(DEFAULT_USER);
  const [loading, setLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!authUser) {
      setUser(DEFAULT_USER);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        let profile = await getBeautyProfile(authUser.id);
        if (!profile) {
          profile = await createBeautyProfile(authUser.id, {
            skin_type: 'Combination',
            hair_type: 'Wavy',
            beauty_goals: ['Clear Skin', 'Natural Glow'],
            color_season: 'autumn',
            streak: 0,
            total_scans: 0,
            beauty_score: 0,
          });
        }
        setUser(mapProfileToUser(authUser, profile));
      } catch (err) {
        console.error('Failed to load beauty profile:', err);
        // Fallback to auth user data only
        setUser({
          ...DEFAULT_USER,
          id: authUser.id,
          name: authUser.username || authUser.email?.split('@')[0] || 'Beautiful',
          email: authUser.email || '',
          joinedDate: authUser.created_at || new Date().toISOString(),
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [authUser?.id, authLoading]);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    setUser(prev => ({ ...prev, ...updates }));

    if (!authUser?.id) return;

    const profileUpdates: Partial<Omit<BeautyProfile, 'id' | 'updated_at'>> = {};
    if (updates.skinType !== undefined) profileUpdates.skin_type = updates.skinType;
    if (updates.hairType !== undefined) profileUpdates.hair_type = updates.hairType;
    if (updates.beautyGoals !== undefined) profileUpdates.beauty_goals = updates.beautyGoals;
    if (updates.colorSeason !== undefined) profileUpdates.color_season = updates.colorSeason;
    if (updates.streak !== undefined) profileUpdates.streak = updates.streak;
    if (updates.totalScans !== undefined) profileUpdates.total_scans = updates.totalScans;
    if (updates.beautyScore !== undefined) profileUpdates.beauty_score = updates.beautyScore;

    if (Object.keys(profileUpdates).length > 0) {
      try {
        await updateBeautyProfile(authUser.id, profileUpdates);
      } catch (err) {
        console.error('Failed to persist beauty profile update:', err);
      }
    }
  }, [authUser?.id]);

  const uploadAvatar = useCallback(async (localUri: string) => {
    if (!authUser?.id) return;
    const supabase = getSupabaseClient();

    // Read file as base64 using expo-file-system (works on all RN platforms)
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const filePath = `${authUser.id}/avatar.jpg`;

    // Upload using base64 directly — avoids atob() which is unavailable in React Native
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, decode(base64), {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    // Bust cache by appending a timestamp query param
    const url = `${publicUrl}?t=${Date.now()}`;

    await updateBeautyProfile(authUser.id, { avatar_url: url });
    setUser(prev => ({ ...prev, avatar: url }));
  }, [authUser?.id]);

  const completeProfileSetup = useCallback(async (displayName: string, skinType: string, goals: string[]) => {
    if (!authUser?.id) return;

    const supabase = getSupabaseClient();

    // Persist display name to user_profiles
    await supabase
      .from('user_profiles')
      .update({ username: displayName })
      .eq('id', authUser.id);

    // Persist beauty preferences and mark setup complete
    await updateBeautyProfile(authUser.id, {
      skin_type: skinType,
      beauty_goals: goals,
      setup_complete: true,
    });

    setUser(prev => ({
      ...prev,
      name: displayName,
      skinType,
      beautyGoals: goals,
      setupComplete: true,
    }));
  }, [authUser?.id]);

  const incrementScanCount = useCallback(async (newScore: number) => {
    setUser(prev => {
      const updated = {
        ...prev,
        totalScans: prev.totalScans + 1,
        streak: prev.streak + 1,
        beautyScore: newScore,
      };
      if (authUser?.id) {
        updateBeautyProfile(authUser.id, {
          total_scans: updated.totalScans,
          streak: updated.streak,
          beauty_score: updated.beautyScore,
        }).catch(err => console.error('Failed to increment scan count:', err));
      }
      return updated;
    });
  }, [authUser?.id]);

  return (
    <UserContext.Provider value={{
      user,
      loading,
      updateUser,
      incrementScanCount,
      completeProfileSetup,
      uploadAvatar,
      notificationsEnabled,
      toggleNotifications: () => setNotificationsEnabled(p => !p),
      darkModeEnabled,
      toggleDarkMode: () => setDarkModeEnabled(p => !p),
    }}>
      {children}
    </UserContext.Provider>
  );
}
