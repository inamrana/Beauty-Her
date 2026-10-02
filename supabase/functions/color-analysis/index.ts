import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SYSTEM_PROMPT = `You are a professional personal color analyst specializing in seasonal color theory. Analyze the provided selfie image precisely and return a complete, dynamic color report.

Your analysis MUST be based entirely on what you observe in this specific photo. Do NOT use default or generic values.

Observe carefully:
1. Skin undertone (warm = golden/peachy/olive vs cool = pink/rosy/bluish vs neutral = balanced)
2. Natural contrast between skin, hair, and eyes
3. Overall warmth/coolness of the person's coloring
4. Depth (light, medium, deep)
5. Clarity (clear/bright vs muted/soft)

Color Seasons:
- spring: warm + light-medium + clear/bright
- summer: cool + light-medium + muted/soft
- autumn: warm + medium-deep + muted/rich
- winter: cool or neutral + medium-deep + clear/high contrast

Return ONLY a valid JSON object — no markdown, no extra text:
{
  "season": "spring" | "summer" | "autumn" | "winter",
  "seasonVariant": string (e.g. "True Autumn", "Soft Summer", "Clear Spring", "Deep Winter"),
  "confidence": "high" | "medium" | "low",
  "undertone": string (e.g. "Warm Golden", "Cool Rose", "Neutral Olive", "Cool Ash"),
  "depth": "Light" | "Light-Medium" | "Medium" | "Medium-Deep" | "Deep",
  "clarity": "Clear" | "Soft-Clear" | "Muted" | "Soft",
  "contrast": "Low" | "Medium-Low" | "Medium" | "Medium-High" | "High",
  "tagline": string (one evocative sentence about this person's coloring, max 12 words),
  "reasoning": string (2-3 sentences referencing specific observed features),
  "keyFeatures": [string, string, string] (3 specific observable traits that determined the season),
  "palette": [
    { "name": string, "hex": string }
  ] (exactly 8 colors that complement this person's season — real hex codes),
  "bestColors": [
    { "name": string, "hex": string }
  ] (exactly 6 specific clothing/accessory colors that enhance this person),
  "worstColors": [
    { "name": string, "hex": string }
  ] (exactly 6 colors that clash with this person's coloring — real hex codes),
  "makeup": {
    "foundation": { "shade": string, "desc": string, "brands": [string, string, string] },
    "blush": { "shade": string, "desc": string, "brands": [string, string] },
    "lips": { "shade": string, "desc": string, "brands": [string, string] },
    "eyeshadow": { "shade": string, "desc": string, "brands": [string, string] }
  },
  "styling": {
    "metals": string (e.g. "Gold and rose gold"),
    "patterns": string (e.g. "Floral, animal print, earthy textures"),
    "avoidMetals": string (e.g. "Silver and platinum")
  }
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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
    const { imageBase64, mimeType = 'image/jpeg' } = body as {
      imageBase64?: string;
      mimeType?: string;
    };

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'no_image' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('ONSPACE_AI_API_KEY');
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

    if (!apiKey || !baseUrl) {
      return new Response(JSON.stringify({ error: 'AI service not configured.' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userContent = [
      {
        type: 'image_url',
        image_url: { url: `data:${mimeType};base64,${imageBase64}` },
      },
      {
        type: 'text',
        text: 'Analyze this photo and determine my personal color season. Base your answer ONLY on what you can observe in this specific image. Return the full JSON report.',
      },
    ];

    console.log(`color-analysis: analyzing selfie for userId=${user.id}`);

    const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('OnSpace AI error:', errText);
      return new Response(JSON.stringify({ error: `ai_error:${aiResponse.status}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const rawContent: string = aiData.choices?.[0]?.message?.content ?? '';

    let result: Record<string, unknown>;
    try {
      const cleaned = rawContent
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();
      result = JSON.parse(cleaned);
    } catch {
      console.error('color-analysis: failed to parse JSON, raw:', rawContent.slice(0, 400));
      return new Response(JSON.stringify({ error: 'parse_error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate season
    const validSeasons = ['spring', 'summer', 'autumn', 'winter'];
    const season = String(result.season ?? '').toLowerCase();
    if (!validSeasons.includes(season)) {
      return new Response(JSON.stringify({ error: 'invalid_season' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    result.season = season;

    const validConf = ['high', 'medium', 'low'];
    result.confidence = validConf.includes(String(result.confidence).toLowerCase())
      ? String(result.confidence).toLowerCase()
      : 'medium';

    if (!Array.isArray(result.keyFeatures)) result.keyFeatures = [];
    if (!Array.isArray(result.palette)) result.palette = [];
    if (!Array.isArray(result.bestColors)) result.bestColors = [];
    if (!Array.isArray(result.worstColors)) result.worstColors = [];

    console.log(`color-analysis: success season=${result.season} confidence=${result.confidence}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('color-analysis exception:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
