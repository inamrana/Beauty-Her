import { useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import { handleOAuthCallback, OAUTH_REDIRECT_URL } from '@/services/socialOAuthService';

export function OAuthCallbackHandler() {
  const seenUrls = useRef<Set<string>>(new Set());

  useEffect(() => {
    const handleUrl = (url: string) => {
      if (!url.startsWith(OAUTH_REDIRECT_URL) || seenUrls.current.has(url)) return;
      seenUrls.current.add(url);
      void handleOAuthCallback(url);
    };

    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    void Linking.getInitialURL().then(url => url && handleUrl(url));
    return () => subscription.remove();
  }, []);

  return null;
}
