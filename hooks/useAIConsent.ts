/**
 * useAIConsent — manages one-time AI data sharing consent.
 *
 * Persists the user's consent decision in AsyncStorage so the
 * disclosure modal is shown once and never repeated after acceptance.
 */
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CONSENT_KEY = 'beautyher_ai_consent_v1';

export interface AIConsentState {
  /** null = not yet loaded, false = not consented, true = consented */
  consented: boolean | null;
  loading: boolean;
  /** Call to persist the "I Agree" decision */
  grantConsent: () => Promise<void>;
  /** Show the modal programmatically (e.g. from a review/settings page) */
  showModal: boolean;
  openModal: () => void;
  closeModal: () => void;
}

export function useAIConsent(): AIConsentState {
  const [consented, setConsented] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CONSENT_KEY)
      .then((val) => {
        setConsented(val === 'granted');
        setLoading(false);
      })
      .catch(() => {
        setConsented(false);
        setLoading(false);
      });
  }, []);

  const grantConsent = useCallback(async () => {
    await AsyncStorage.setItem(CONSENT_KEY, 'granted');
    setConsented(true);
    setShowModal(false);
  }, []);

  const openModal = useCallback(() => setShowModal(true), []);
  const closeModal = useCallback(() => setShowModal(false), []);

  return { consented, loading, grantConsent, showModal, openModal, closeModal };
}
