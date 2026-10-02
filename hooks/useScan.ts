import { useContext } from 'react';
import { ScanContext } from '@/contexts/ScanContext';

export function useScan() {
  const context = useContext(ScanContext);
  if (!context) throw new Error('useScan must be used within ScanProvider');
  return context;
}
