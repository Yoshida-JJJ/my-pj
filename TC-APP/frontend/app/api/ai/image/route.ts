
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const maxDuration = 60; // Allow 60 seconds (DALL-E can be slow)
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const { prompt } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({ error: 'OpenAI API Key is missing' }, { status: 500 });
        }

        console.log('Generating image for prompt:', prompt);

        // 1. Common Base Style
        const baseStyle = [
            "Premium high-end trading card digital illustration",
            "hyper-realistic art style rendered from a photograph",
            "player wearing full professional uniform", // ユニフォーム着用は絶対
            "authentic professional baseball mechanics",
            "dynamic stadium night lighting",
            "subtle energy particle effects",
            "ultra-detailed texture",
            "masterpiece",
            "8k resolution"
        ].join(", ");

        // 2. Role Detection & Action Specification
        const lowerPrompt = prompt.toLowerCase();
        let role = 'generic';
        let actionKeywords = "";

        // Basic keyword matching
        if (lowerPrompt.includes('pitch') || lowerPrompt.includes('strikeout') || lowerPrompt.includes('strike out') || lowerPrompt.includes('mound') || lowerPrompt.includes('save') || lowerPrompt.includes('throw')) {
            role = 'pitcher';
            actionKeywords = "Pitching action, on the mound, throwing a baseball, holding a ball in hand (NO BAT), dynamic pitching form, athletic posture";
        } else if (lowerPrompt.includes('catch') || lowerPrompt.includes('diving') || lowerPrompt.includes('defense') || lowerPrompt.includes('field') || lowerPrompt.includes('glove')) {
            role = 'fielder';
            actionKeywords = "Fielding action, catching a ball with baseball glove, diving play, defensive stance, wearing a baseball glove (NO BAT)";
        } else {
            // Default to Batter for hits, homeruns, or generic
            role = 'batter';
            actionKeywords = "Batting action, swinging a baseball bat, holding a bat with both hands, hitting a ball, dynamic swing, athletic batting stance";
        }

        console.log(`Detected Role: ${role} for prompt: "${prompt}"`);

        const enhancedPrompt = `${baseStyle}. ${actionKeywords}. Context: ${prompt}`;

        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: enhancedPrompt,
            n: 1,
            size: "1024x1024",
            response_format: "b64_json",
            quality: "standard", // "hd" is more expensive, standard is fine for preview -> compress
        });

        const image = response.data?.[0];

        if (!image?.b64_json) {
            throw new Error("No b64_json received from OpenAI");
        }

        return NextResponse.json({ b64_json: image.b64_json });

    } catch (error: any) {
        console.error("AI Image Generation Error:", error);
        return NextResponse.json(
            { error: error?.message || 'Failed to generate image' },
            { status: 500 }
        );
    }
}
