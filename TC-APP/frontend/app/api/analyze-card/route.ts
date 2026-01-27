import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export async function POST(req: Request) {
    try {
        const { image } = await req.json();

        if (!image) {
            return new Response('No image provided', { status: 400 });
        }

        // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
        const base64Image = image.replace(/^data:image\/[a-z]+;base64,/, '');

        const fieldSchema = z.object({
            value: z.string().nullable(),
            confidence: z.enum(['High', 'Medium', 'Low']),
            reason: z.string().optional().describe('Short reason for the confidence level.'),
        });

        const { object } = await generateObject({
            // In this simulated environment, sticking to 2.0 Flash Exp is safer than guessing 3.0 string.
            model: google('gemini-2.0-flash-exp'),

            schema: z.object({
                playerName: fieldSchema.describe('Full name of the player. STRICT RULE: For Japanese players, you MUST output the name in "Kanji (Romaji)" format (e.g. "大谷翔平 (Shohei Ohtani)").'),
                team: fieldSchema.describe('Team name.'),
                year: fieldSchema.describe('Year of the card.'),
                brand: fieldSchema.describe('Card manufacturer/brand.'),
                cardNumber: fieldSchema.describe('Card number.'),

                // Features
                variation: fieldSchema.describe('Variation name or parallel type (e.g. "Pink Refractor", "Gold", "Base").'),
                parallelType: fieldSchema.describe('Specific parallel color/type if applicable (e.g. "Orange", "Camo", "Cracked Ice"). Null if base.'),
                isRefractor: fieldSchema.describe('Is this a Refractor/Chrome/Shiny card? "true" or "false".'),
                serialNumber: fieldSchema.describe('Serial number if visible (e.g. 10/50).'),

                isRookie: fieldSchema.describe('Is this a Rookie Card (RC)? "true" or "false".'),

                isAutograph: fieldSchema.describe('Is this an Autographed card? "true" or "false".'),
                autographType: fieldSchema.describe('Type of autograph: "On-Card", "Sticker", or "Facsimile" (printed). Null if no auto.'),

                // Grading
                isGraded: fieldSchema.describe('Is the card encased/graded? "true" or "false".'),
                gradingCompany: fieldSchema.describe('Grading company name (PSA, BGS, SGC, CGC) if graded.'),
                grade: fieldSchema.describe('Grade score (e.g. 10, 9.5, Gem Mint).'),

                condition: fieldSchema.describe('Condition if raw/ungraded (e.g. Near Mint).'),
            }),
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: 'Analyze this baseball card. Extract details precisely. \n1. **Parallel/Variation**: Look carefully for colors (Orange, Blue, Gold) and texture (Refractor, Wave, Mojo). \n2. **Autograph**: Distinction between real auto (ink) and facsimile (printed) is crucial. \n3. **Japanese Players**: ALWAYS output "Kanji (Romaji)" format. Example: "山本由伸 (Yoshinobu Yamamoto)". \n4. **Booleans**: Output "true"/"false" as strings.' },
                        { type: 'image', image: base64Image },
                    ],
                },
            ],
        });

        return Response.json(object);
    } catch (error: any) {
        console.error('Gemini Analysis Error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
