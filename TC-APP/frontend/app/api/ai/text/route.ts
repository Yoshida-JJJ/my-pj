
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const { keywords } = await req.json();

        if (!keywords) {
            return NextResponse.json({ error: 'Keywords are required' }, { status: 400 });
        }

        if (!process.env.ANTHROPIC_API_KEY) {
            return NextResponse.json({ error: 'Anthropic API Key is missing' }, { status: 500 });
        }

        const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });

        const systemPrompt = `
あなたはプロ野球トレーディングカードの敏腕編集者です。
ユーザーから提供されたキーワードを元に、ファンが熱狂し、購買意欲をそそるようなテキストを作成してください。
出力は必ずJSON形式のみとしてください。
        `;

        const userPrompt = `
Target Keywords: "${keywords}"

以下の要件でコンテンツを作成してください：
1. Title: 20文字以内の劇的でキャッチーなタイトル。体言止め推奨。
2. Desc: 60文字程度の状況描写。情景が浮かぶようなエモーショナルな表現で。
3. Intensity: 1〜5の熱量スコア（5が最高）。

Response format (JSON only):
{ "title": "...", "desc": "...", "intensity": "..." }
        `;

        const msg = await anthropic.messages.create({
            model: "claude-sonnet-4-5-20250929", // Latest confirmed working model
            max_tokens: 1000,
            temperature: 0.7,
            system: systemPrompt,
            messages: [
                {
                    "role": "user",
                    "content": userPrompt
                }
            ]
        });

        const content = msg.content[0];
        if (content.type !== 'text') {
            throw new Error('Unexpected response type from Claude');
        }

        // Extract JSON from response (in case of extra text)
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse JSON from Claude response');
        }

        const result = JSON.parse(jsonMatch[0]);

        return NextResponse.json(result);

    } catch (error: any) {
        console.error("AI Text Generation Error:", error);
        return NextResponse.json(
            { error: error?.message || 'Failed to generate text' },
            { status: 500 }
        );
    }
}
