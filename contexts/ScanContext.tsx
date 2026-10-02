import React, { createContext, useState, ReactNode, useEffect } from 'react';
import { useAuth } from '@/template';
import { getScans, saveScan } from '@/services/scanService';

export interface SkinMetric {
  score: number;
  label: string;
}

export interface ScanResult {
  id: string;
  date: string;
  imageUri: string | null;
  overallScore: number;
  confidenceScore: number;
  faceAnalysis: {
    faceShape: string;
    skinTone: string;
    undertone: string;
    eyeShape: string;
    eyebrows: string;
    lipShape: string;
    jawline: string;
    facialSymmetry: number;
  };
  skinAnalysis: {
    texture: SkinMetric;
    clarity: SkinMetric;
    hydration: SkinMetric;
    pores: SkinMetric;
    darkCircles: SkinMetric;
    redness: SkinMetric;
    hyperpigmentation: SkinMetric;
  };
  recommendations: {
    skincare: string[];
    makeup: string[];
    lifestyle: string[];
  };
}

interface ScanContextType {
  scans: ScanResult[];
  latestScan: ScanResult | null;
  addScan: (scan: ScanResult) => Promise<void>;
  isAnalyzing: boolean;
  setIsAnalyzing: (v: boolean) => void;
  loading: boolean;
}

export const ScanContext = createContext<ScanContextType | undefined>(undefined);

export function ScanProvider({ children }: { children: ReactNode }) {
  const { user: authUser, loading: authLoading } = useAuth();
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!authUser) {
      setScans([]);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const data = await getScans(authUser.id);
        setScans(data);
      } catch (err) {
        console.error('Failed to load scan history:', err);
        setScans([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [authUser?.id, authLoading]);

  const latestScan = scans.length > 0 ? scans[0] : null;

  const addScan = async (scan: ScanResult) => {
    // Optimistic update first
    setScans(prev => [scan, ...prev]);

    if (!authUser) return;

    try {
      const saved = await saveScan(authUser.id, scan);
      // Replace the optimistic entry with the server-confirmed one
      setScans(prev => [saved, ...prev.slice(1)]);
    } catch (err) {
      console.error('Failed to save scan to cloud:', err);
      // Keep the local version — user still sees their scan
    }
  };

  return (
    <ScanContext.Provider value={{ scans, latestScan, addScan, isAnalyzing, setIsAnalyzing, loading }}>
      {children}
    </ScanContext.Provider>
  );
}
