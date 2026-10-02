import * as FileSystem from 'expo-file-system';
import { getSupabaseClient } from '@/template';
import { FunctionsHttpError } from '@supabase/supabase-js';

export type ColorSeason = 'spring' | 'summer' | 'autumn' | 'winter';
export type AnalysisConfidence = 'high' | 'medium' | 'low';

export interface ColorPaletteItem {
  name: string;
  hex: string;
}

export interface ColorMakeupItem {
  shade: string;
  desc: string;
  brands: string[];
}

export interface ColorAnalysisResult {
  season: ColorSeason;
  seasonVariant: string;
  confidence: AnalysisConfidence;
  undertone: string;
  depth: string;
  clarity: string;
  contrast: string;
  tagline: string;
  reasoning: string;
  keyFeatures: string[];
  palette: ColorPaletteItem[];
  bestColors: ColorPaletteItem[];
  worstColors: ColorPaletteItem[];
  makeup: {
    foundation: ColorMakeupItem;
    blush: ColorMakeupItem;
    lips: ColorMakeupItem;
    eyeshadow: ColorMakeupItem;
  };
  styling: {
    metals: string;
    patterns: string;
    avoidMetals: string;
  };
}

export async function analyzeColorSeason(
  imageUri: string
): Promise<{ data: ColorAnalysisResult | null; error: string | null }> {
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
        console.warn('colorAnalysisService: could not read local image:', fsErr);
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
    const { data, error } = await supabase.functions.invoke('color-analysis', {
      body: { imageBase64, mimeType },
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

    if (data?.error) {
      return { data: null, error: data.error };
    }

    return { data: data as ColorAnalysisResult, error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}
