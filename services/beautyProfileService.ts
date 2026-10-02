import { getSupabaseClient } from '@/template';

export interface BeautyProfile {
  id: string;
  skin_type: string;
  hair_type: string;
  beauty_goals: string[];
  color_season: string;
  streak: number;
  total_scans: number;
  beauty_score: number;
  setup_complete: boolean;
  avatar_url: string | null;
  updated_at: string;
}

export async function getBeautyProfile(userId: string): Promise<BeautyProfile | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('beauty_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Row not found
    throw error;
  }
  return data;
}

export async function createBeautyProfile(
  userId: string,
  defaults: Partial<Omit<BeautyProfile, 'id' | 'updated_at'>>
): Promise<BeautyProfile> {
  const supabase = getSupabaseClient();
  // Use upsert so a pre-existing row (e.g. created by trigger) is updated instead of causing FK/conflict error
  const { data, error } = await supabase
    .from('beauty_profiles')
    .upsert({ id: userId, ...defaults }, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateBeautyProfile(
  userId: string,
  updates: Partial<Omit<BeautyProfile, 'id'>>
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('beauty_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) throw error;
}
