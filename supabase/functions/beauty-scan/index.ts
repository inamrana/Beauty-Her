import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SYSTEM_PROMPT = `You are a professional AI beauty analyst with expertise in facial feature analysis, skin assessment, and personalized beauty recommendations. Your task is to analyze a selfie image and return a detailed, structured beauty report.

IMPORTANT: Base ALL values strictly on what you observe in this specific photo. Do NOT use default or generic values. Every metric must reflect the actual person in the image.

Analyze the following aspects precisely:

**FACE ANALYSIS:**
- faceShape: One of: Oval, Round, Square, Heart, Diamond, Oblong, Rectangle (choose the one that best fits the actual facial structure observed)
- skinTone: Descriptive phrase based on actual observed tone e.g. "Light", "Light Medium", "Medium", "Medium Deep", "Deep", "Fair", "Olive"
- undertone: Exactly one of: Warm, Cool, Neutral (base on actual jaw/neck area observation)
- eyeShape: e.g. "Almond", "Round", "Hooded", "Monolid", "Upturned", "Downturned"
- eyebrows: e.g. "Arched", "Straight", "Naturally Arched", "Thick & Defined", "Sparse", "Defined"
- lipShape: e.g. "Full & Defined", "Thin", "Bow-Shaped", "Wide", "Heart-Shaped", "Cupid's Bow"
- jawline: e.g. "Defined", "Softly Defined", "Round", "Angular", "Sharp"
- facialSymmetry: Integer 0-100 (measure the actual symmetry visible in this photo — vary based on what you see)

**SKIN ANALYSIS** (each metric: score 0-100 + label — base on actual skin condition observed):
- texture: score + label (e.g. "Smooth", "Slightly Rough", "Rough", "Very Smooth")
- clarity: score + label (e.g. "Clear", "Mostly Clear", "Some Blemishes", "Congested")
- hydration: score + label (e.g. "Well Hydrated", "Slightly Dry", "Dry", "Dehydrated", "Oily")
- pores: score + label (e.g. "Minimal", "Slightly Visible", "Visible", "Enlarged")
- darkCircles: score + label (e.g. "None", "Minimal", "Mild", "Moderate", "Significant")
- redness: score + label (e.g. "None", "Minimal", "Mild Redness", "Noticeable Redness")
- hyperpigmentation: score + label (e.g. "None", "Mild", "Moderate", "Significant")

**SCORES:**
- overallScore: Integer 50-100 representing overall skin health (not attractiveness — always encouraging!)
- confidenceScore: Integer 0-100 representing your confidence in this analysis given image quality

**RECOMMENDATIONS** (exactly 3 items each — personalized to THIS person's observed features):
- skincare: 3 specific recommendations based on the actual skin conditions observed
- makeup: 3 makeup suggestions that complement the detected face shape, undertone, and features
- lifestyle: 3 wellness tips relevant to the skin conditions observed

Be encouraging, accurate, and professional. Focus on enhancing natural beauty. Base ALL scores on actual observations from the photo.

Respond ONLY with a valid JSON object — no markdown, no explanation text:
{
  "overallScore": number,
  "confidenceScore": number,
  "faceAnalysis": {
    "faceShape": string,
    "skinTone": string,
    "undertone": string,
    "eyeShape": string,
    "eyebrows": string,
    "lipShape": string,
    "jawline": string,
    "facialSymmetry": number
  },
  "skinAnalysis": {
    "texture": { "score": number, "label": string },
    "clarity": { "score": number, "label": string },
    "hydration": { "score": number, "label": string },
    "pores": { "score": number, "label": string },
    "darkCircles": { "score": number, "label": string },
    "redness": { "score": number, "label": string },
    "hyperpigmentation": { "score": number, "label": string }
  },
  "recommendations": {
    "skincare": [string, string, string],
    "makeup": [string, string, string],
    "lifestyle": [string, string, string]
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
        text: 'Analyze this selfie carefully. Base every metric and recommendation strictly on what you observe in this specific photo. Return the complete JSON beauty analysis report.',
      },
    ];

    console.log(`beauty-scan: analyzing selfie for userId=${user.id} mimeType=${mimeType}`);

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
      console.error('beauty-scan: failed to parse AI JSON, raw:', rawContent.slice(0, 500));
      return new Response(JSON.stringify({ error: 'parse_error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Clamp scores to valid ranges
    const clamp = (v: unknown, lo = 0, hi = 100) =>
      Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));

    result.overallScore = clamp(result.overallScore, 50, 100);
    result.confidenceScore = clamp(result.confidenceScore);

    if (result.faceAnalysis && typeof result.faceAnalysis === 'object') {
      const fa = result.faceAnalysis as Record<string, unknown>;
      fa.facialSymmetry = clamp(fa.facialSymmetry);
    }

    if (result.skinAnalysis && typeof result.skinAnalysis === 'object') {
      const sa = result.skinAnalysis as Record<string, unknown>;
      for (const key of Object.keys(sa)) {
        const metric = sa[key] as Record<string, unknown>;
        if (metric && typeof metric === 'object') {
          metric.score = clamp(metric.score);
        }
      }
    }

    if (result.recommendations && typeof result.recommendations === 'object') {
      const recs = result.recommendations as Record<string, unknown[]>;
      for (const cat of ['skincare', 'makeup', 'lifestyle']) {
        if (!Array.isArray(recs[cat])) recs[cat] = [];
        recs[cat] = recs[cat].slice(0, 3);
        while (recs[cat].length < 3) recs[cat].push('Consult a beauty professional for personalized advice');
      }
    }

    console.log(`beauty-scan: success overallScore=${result.overallScore} confidence=${result.confidenceScore}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('beauty-scan exception:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
