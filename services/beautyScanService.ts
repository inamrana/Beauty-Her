import * as FileSystem from 'expo-file-system';
import { getSupabaseClient } from '@/template';
import { FunctionsHttpError } from '@supabase/supabase-js';
import type { ScanResult } from '@/contexts/ScanContext';

export interface AIScanResponse {
  overallScore: number;
  confidenceScore: number;
  faceAnalysis: ScanResult['faceAnalysis'];
  skinAnalysis: ScanResult['skinAnalysis'];
  recommendations: ScanResult['recommendations'];
}

export async function analyzeSelfie(
  imageUri: string
): Promise<{ data: AIScanResponse | null; error: string | null }> {
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
        console.warn('beautyScanService: could not read local image:', fsErr);
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
    const { data, error } = await supabase.functions.invoke('beauty-scan', {
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

    return { data: data as AIScanResponse, error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}
