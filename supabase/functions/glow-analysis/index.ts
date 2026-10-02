import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SYSTEM_PROMPT = `You are a professional beauty and aesthetic advisor. Analyze the provided selfie and the user's chosen aesthetic style, then generate a completely personalized, dynamic glow-up guide tailored to THIS specific person's features.

Your guide MUST be based on the actual face in the photo — skin tone, facial features, undertone, face shape, and natural coloring. Do NOT give generic advice. Every step must be personalized.

Return ONLY a valid JSON object — no markdown, no extra text:
{
  "label": string (the aesthetic label e.g. "Soft Girl", "Natural Glam"),
  "tagline": string (one personalized sentence referencing this person's specific features, max 15 words),
  "faceSummary": string (2 sentences describing the person's key features that influence the recommendations),
  "steps": [
    {
      "n": number,
      "title": string,
      "iconName": "water-outline" | "sparkles" | "flower-outline" | "eye-outline" | "happy-outline" | "cut-outline" | "brush-outline" | "color-palette-outline" | "sunny-outline" | "leaf-outline" | "layers-outline" | "pencil-outline" | "create-outline" | "contrast-outline" | "diamond-outline" | "star-outline" | "scan-outline",
      "desc": string (personalized step description mentioning the person's specific features/coloring, 2-3 sentences),
      "product": string (specific product recommendation with shade/variant that suits this person)
    }
  ] (exactly 6 steps),
  "hairTips": [string, string, string, string] (4 specific hair recommendations for this person's face shape and coloring),
  "avoidTips": [string, string, string, string] (4 specific things this person should avoid for this aesthetic),
  "colorPalette": [
    { "name": string, "hex": string }
  ] (4 makeup/accent colors that suit this person's coloring for this aesthetic),
  "skinPrep": string (personalized skin prep tip based on observed skin type/concerns)
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
    const { imageBase64, mimeType = 'image/jpeg', aesthetic = 'natural-glam' } = body as {
      imageBase64?: string;
      mimeType?: string;
      aesthetic?: string;
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

    // Map aesthetic ID to human-readable label for the prompt
    const AESTHETIC_LABELS: Record<string, string> = {
      'soft-girl': 'Soft Girl',
      'natural-glam': 'Natural Glam',
      'soft-grunge': 'Soft Grunge',
      'latina-baddie': 'Latina Baddie / Bold Glam',
      'full-glam': 'Full Glam / Glamorous',
    };
    const aestheticLabel = AESTHETIC_LABELS[aesthetic] ?? aesthetic;

    const userContent = [
      {
        type: 'image_url',
        image_url: { url: `data:${mimeType};base64,${imageBase64}` },
      },
      {
        type: 'text',
        text: `Analyze this photo carefully. This person has chosen the "${aestheticLabel}" aesthetic style. 
Generate a fully personalized 6-step glow-up guide for THEIR specific face, skin tone, features, and coloring.
Every recommendation must be tailored to what you see in this photo — do not give generic advice.
Return the complete JSON report.`,
      },
    ];

    console.log(`glow-analysis: analyzing selfie for userId=${user.id} aesthetic=${aesthetic}`);

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
      console.error('OnSpace AI glow error:', errText);
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
      console.error('glow-analysis: failed to parse JSON, raw:', rawContent.slice(0, 400));
      return new Response(JSON.stringify({ error: 'parse_error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ensure steps array exists and has 6 items
    if (!Array.isArray(result.steps)) result.steps = [];
    if (!Array.isArray(result.hairTips)) result.hairTips = [];
    if (!Array.isArray(result.avoidTips)) result.avoidTips = [];
    if (!Array.isArray(result.colorPalette)) result.colorPalette = [];

    // Ensure step numbers are sequential
    (result.steps as any[]).forEach((step, i) => { step.n = i + 1; });

    console.log(`glow-analysis: success steps=${(result.steps as any[]).length} aesthetic=${aesthetic}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('glow-analysis exception:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
