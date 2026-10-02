import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface UserBeautyContext {
  skinType?: string;
  hairType?: string;
  beautyGoals?: string | string[];
  colorSeason?: string;
  latestScan?: {
    overallScore?: number;
    faceShape?: string;
    skinTone?: string;
    undertone?: string;
    concerns?: string[];
  } | null;
}

function buildSystemPrompt(ctx: UserBeautyContext): string {
  const goals = Array.isArray(ctx.beautyGoals)
    ? ctx.beautyGoals.join(', ')
    : (ctx.beautyGoals ?? 'Not specified');

  let profileSection = `**User's Personal Beauty Profile:**
- Skin Type: ${ctx.skinType ?? 'Unknown'}
- Hair Type: ${ctx.hairType ?? 'Unknown'}
- Beauty Goals: ${goals}
- Color Season: ${ctx.colorSeason ?? 'Not yet analyzed'}`;

  const scan = ctx.latestScan;
  if (scan) {
    const concerns =
      Array.isArray(scan.concerns) && scan.concerns.length > 0
        ? scan.concerns.join(', ')
        : 'None identified';
    profileSection += `

**Latest AI Beauty Scan Results:**
- Overall Beauty Score: ${scan.overallScore ?? 'N/A'}/100
- Face Shape: ${scan.faceShape ?? 'N/A'}
- Skin Tone: ${scan.skinTone ?? 'N/A'}
- Undertone: ${scan.undertone ?? 'N/A'}
- Areas Needing Attention: ${concerns}`;
  }

  return `You are BeautyHer, a warm, expert, and deeply personalized AI beauty coach inside the BeautyHer app.

**Personality & Tone:**
- Encouraging and empowering — like a trusted, beauty-savvy best friend
- Science-backed and ingredient-aware — give specific, clinically-informed advice
- Positive and uplifting — celebrate each person's unique beauty, never criticize appearance
- Concise and actionable — practical tips the user can apply right now

${profileSection}

**Response Guidelines:**
- Always tailor advice to the skin type, hair type, goals, and scan results above
- Recommend specific active ingredients matched to the user's skin type and concerns
- Keep responses 150–250 words for typical questions; longer only for full routine breakdowns
- Use 1–2 emojis per response for warmth (never more)
- End each reply with one concrete tip or a short follow-up question to deepen the conversation
- Never recommend seeing a doctor unless the condition genuinely warrants medical attention
- Never be critical of the user's appearance — focus on enhancement, not flaws`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { messages, userContext } = body as {
      messages: { role: string; content: string }[];
      userContext: UserBeautyContext | null;
    };

    const apiKey = Deno.env.get('ONSPACE_AI_API_KEY');
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

    if (!apiKey || !baseUrl) {
      return new Response(JSON.stringify({ error: 'AI service not configured on this server.' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = buildSystemPrompt(userContext ?? {});

    console.log(`beauty-chat: userId=${user.id}, history=${messages?.length ?? 0} messages`);

    const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          ...(Array.isArray(messages) ? messages : []),
        ],
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('OnSpace AI error:', errText);
      return new Response(JSON.stringify({ error: `AI: ${errText}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!aiResponse.body) {
      return new Response(JSON.stringify({ error: 'Empty response from AI service.' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Pipe the AI SSE stream directly through to the client
    return new Response(aiResponse.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    console.error('beauty-chat exception:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
