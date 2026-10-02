import * as FileSystem from 'expo-file-system';
import { getSupabaseClient } from '@/template';
import { FunctionsHttpError } from '@supabase/supabase-js';

export interface GlowStep {
  n: number;
  title: string;
  iconName: string;
  desc: string;
  product: string;
}

export interface GlowAnalysisResult {
  label: string;
  tagline: string;
  faceSummary: string;
  steps: GlowStep[];
  hairTips: string[];
  avoidTips: string[];
  colorPalette: { name: string; hex: string }[];
  skinPrep: string;
}

export async function analyzeGlowUp(
  imageUri: string,
  aesthetic: string
): Promise<{ data: GlowAnalysisResult | null; error: string | null }> {
  try {
    let imageBase64: string | undefined;
    let mimeType = 'image/jpeg';

    if (imageUri.startsWith('file://') || imageUri.startsWith('/')) {
      const ext = imageUri.split('.').pop()?.toLowerCase() ?? 'jpg';
      if (ext === 'png') mimeType = 'image/png';
      else if (ext === 'webp') mimeType = 'image/webp';

      try {
        imageBase64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } catch (fsErr) {
        console.warn('glowAnalysisService: could not read local image:', fsErr);
        return { data: null, error: 'Could not read the selected image. Please try another photo.' };
      }
    } else if (imageUri.startsWith('data:')) {
      const [header, data] = imageUri.split(',');
      imageBase64 = data;
      const mimeMatch = header.match(/data:([^;]+)/);
      if (mimeMatch) mimeType = mimeMatch[1];
    }

    if (!imageBase64) {
      return { data: null, error: 'no_image' };
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.functions.invoke('glow-analysis', {
      body: { imageBase64, mimeType, aesthetic },
    });

    if (error) {
      let errorMessage = error.message;
      if (error instanceof FunctionsHttpError) {
        try {
          const statusCode = error.context?.status ?? 500;
          const textContent = await error.context?.text();
          errorMessage = `[Code: ${statusCode}] ${textContent || error.message || 'Unknown error'}`;
        } catch {
          errorMessage = error.message || 'Failed to read response';
        }
      }
      return { data: null, error: errorMessage };
    }

    return { data: data as GlowAnalysisResult, error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}
