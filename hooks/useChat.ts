import { useState, useCallback } from 'react';
import { getSupabaseClient } from '@/template';
import type { ScanResult } from '@/contexts/ScanContext';

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export interface UserBeautyContext {
  skinType: string;
  hairType: string;
  beautyGoals: string[];
  colorSeason: string;
  latestScan?: {
    overallScore: number;
    faceShape: string;
    skinTone: string;
    undertone: string;
    concerns: string[];
  } | null;
}

const INITIAL_MESSAGE: ChatMessage = {
  id: 'init',
  text: "Hello beautiful! I'm BeautyHer, your personal AI beauty coach. I've reviewed your beauty profile and I'm ready to give you personalized advice. Ask me anything about skincare, makeup, hair, or wellness! ✨",
  isUser: false,
  timestamp: new Date(),
};

/** Parse a single SSE `data: {...}` line and return the text delta, or '' */
function parseSseLine(line: string): string {
  if (!line.startsWith('data: ')) return '';
  const raw = line.slice(6).trim();
  if (raw === '[DONE]') return '';
  try {
    const json = JSON.parse(raw);
    return json.choices?.[0]?.delta?.content ?? '';
  } catch {
    return '';
  }
}

/** Derive top skin concerns from a scan result (metrics scoring below 70) */
export function extractConcerns(scan: ScanResult | null): string[] {
  if (!scan) return [];
  const labelMap: Record<string, string> = {
    texture: 'Texture',
    clarity: 'Clarity',
    hydration: 'Hydration',
    pores: 'Pores',
    darkCircles: 'Dark Circles',
    redness: 'Redness',
    hyperpigmentation: 'Hyperpigmentation',
  };
  return Object.entries(scan.skinAnalysis)
    .filter(([, v]) => v.score < 70)
    .map(([k]) => labelMap[k] ?? k)
    .slice(0, 3);
}

export function useChat(userContext?: UserBeautyContext) {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isTyping) return;

      const userMsg: ChatMessage = {
        id: `u_${Date.now()}`,
        text: trimmed,
        isUser: true,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, userMsg]);
      setIsTyping(true);

      // Build conversation history for the AI (last 9 prior messages + current)
      const history = [...messages.slice(-9), userMsg].map(m => ({
        role: m.isUser ? 'user' : 'assistant',
        content: m.text,
      }));

      const botId = `b_${Date.now()}`;
      let accumulated = '';
      let gotFirstChunk = false;

      try {
        const supabase = getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        const token =
          session?.access_token ??
          (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '');
        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

        const res = await fetch(`${supabaseUrl}/functions/v1/beauty-chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            messages: history,
            userContext: userContext ?? null,
          }),
        });

        if (!res.ok) {
          throw new Error(`Server error: ${res.status}`);
        }

        const reader = res.body?.getReader();

        if (reader) {
          // ── Streaming path (web / Expo Go / simulator) ──────────────────────
          const decoder = new TextDecoder();
          let done = false;

          while (!done) {
            const { done: chunkDone, value } = await reader.read();
            done = chunkDone;
            if (value) {
              const chunk = decoder.decode(value, { stream: !done });
              for (const line of chunk.split('\n')) {
                const content = parseSseLine(line);
                if (!content) continue;

                accumulated += content;

                if (!gotFirstChunk) {
                  // First token: hide typing indicator, show the growing message
                  gotFirstChunk = true;
                  setIsTyping(false);
                  setMessages(prev => [
                    ...prev,
                    { id: botId, text: accumulated, isUser: false, timestamp: new Date() },
                  ]);
                } else {
                  setMessages(prev =>
                    prev.map(m => (m.id === botId ? { ...m, text: accumulated } : m))
                  );
                }
              }
            }
          }
        } else {
          // ── Full-response fallback (native device) ──────────────────────────
          const fullText = await res.text();

          // Parse concatenated SSE events
          for (const line of fullText.split('\n')) {
            accumulated += parseSseLine(line);
          }

          // If SSE parsing yielded nothing, try plain JSON
          if (!accumulated) {
            try {
              const json = JSON.parse(fullText);
              accumulated = json.choices?.[0]?.message?.content ?? '';
            } catch { /* ignore */ }
          }

          gotFirstChunk = !!accumulated;
          setIsTyping(false);
          setMessages(prev => [
            ...prev,
            {
              id: botId,
              text:
                accumulated ||
                "I'm having trouble responding right now. Please try again. ✨",
              isUser: false,
              timestamp: new Date(),
            },
          ]);
        }

        // Edge case: stream ended without any content
        if (!gotFirstChunk) {
          setIsTyping(false);
          setMessages(prev => [
            ...prev,
            {
              id: botId,
              text: "I'm having trouble responding right now. Please try again in a moment. ✨",
              isUser: false,
              timestamp: new Date(),
            },
          ]);
        }
      } catch (err) {
        console.error('BeautyHer chat error:', err);
        setIsTyping(false);
        setMessages(prev => [
          ...prev,
          {
            id: `e_${Date.now()}`,
            text: "I'm having trouble connecting right now. Please check your connection and try again. ✨",
            isUser: false,
            timestamp: new Date(),
          },
        ]);
      }
    },
    [messages, isTyping, userContext]
  );

  return { messages, isTyping, sendMessage };
}
