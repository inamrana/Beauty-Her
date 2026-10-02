import { getSupabaseClient } from '@/template';
import { ScanResult } from '@/contexts/ScanContext';

function dbToScan(row: any): ScanResult {
  return {
    id: row.id,
    date: row.scan_date,
    imageUri: row.image_uri,
    overallScore: row.overall_score,
    confidenceScore: row.confidence_score,
    faceAnalysis: row.face_analysis,
    skinAnalysis: row.skin_analysis,
    recommendations: row.recommendations,
  };
}

export async function getScans(userId: string): Promise<ScanResult[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('scan_history')
    .select('*')
    .eq('user_id', userId)
    .order('scan_date', { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data ?? []).map(dbToScan);
}

export async function saveScan(userId: string, scan: ScanResult): Promise<ScanResult> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('scan_history')
    .insert({
      id: scan.id,
      user_id: userId,
      scan_date: scan.date,
      image_uri: scan.imageUri,
      overall_score: scan.overallScore,
      confidence_score: scan.confidenceScore,
      face_analysis: scan.faceAnalysis,
      skin_analysis: scan.skinAnalysis,
      recommendations: scan.recommendations,
    })
    .select()
    .single();

  if (error) throw error;
  return dbToScan(data);
}
