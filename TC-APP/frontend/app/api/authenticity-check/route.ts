import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { NextRequest } from 'next/server';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const factorSchema = z.object({
  category: z.string().describe('懸念カテゴリ（例: 印刷品質、色味、フォント、ホログラム）'),
  description: z.string().describe('具体的な説明（日本語）'),
  severity: z.enum(['info', 'warning', 'critical']).describe('深刻度'),
  confidence: z.number().min(0).max(100).describe('この判定の確信度（0-100）'),
});

const authenticitySchema = z.object({
  trustScore: z.number().min(0).max(100).describe('信頼スコア（0-100。100に近いほど本物のカードである信頼度が高い）'),
  trustLevel: z.enum(['high', 'medium', 'low']).describe('信頼レベル'),
  factors: z.array(factorSchema).describe('検出された懸念点'),
  positiveSignals: z.array(z.string()).describe('正規品の特徴として検出された点（日本語）'),
  overallComment: z.string().describe('総合コメント（日本語）'),
});

export async function POST(req: NextRequest) {
  try {
    const { frontImage, backImage, imageQuality } = await req.json();

    if (!frontImage) {
      return Response.json({ error: '表面画像は必須です' }, { status: 400 });
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return Response.json({ error: 'AI API key is not configured.' }, { status: 500 });
    }

    const frontBase64 = frontImage.replace(/^data:image\/[a-z]+;base64,/, '');
    const backBase64 = backImage?.replace(/^data:image\/[a-z]+;base64,/, '');

    const qualityNote = imageQuality?.score < 75
      ? '注意: 画像品質が低いため、判定精度が低下する可能性があります。'
      : '';

    const imageContent: { type: 'image'; image: string }[] = [
      { type: 'image', image: frontBase64 },
      ...(backBase64 ? [{ type: 'image' as const, image: backBase64 }] : []),
    ];

    const { object } = await generateObject({
      model: google('gemini-2.0-flash'),
      schema: authenticitySchema,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `あなたはトレーディングカードの真贋判定の専門家です。
提供された画像を分析し、本物のカードである信頼度を評価してください。

${qualityNote}

【分析観点】
1. 印刷品質: ドットパターン、インクのにじみ、解像度
2. 色味: 正規品との色調のズレ、彩度の異常
3. フォント: テキストの鮮明さ、フォントの正確性
4. ホログラム/箔押し: 反射パターン、位置の正確性（該当する場合）
5. カード素材: 紙質の質感、厚み（推定）
6. エッジ/裁断: カットの精度、角の状態
7. センタリング: 枠のバランス

【信頼スコアガイドライン】
- 70-100: 高信頼（正規品の特徴が多く確認できる）
- 40-69: 中程度（一部確認が必要な点があるが大きな問題なし）
- 0-39: 低信頼（複数の懸念点があり、慎重な確認を推奨）

trustLevelの設定:
- trustScore >= 70 → "high"
- trustScore >= 40 → "medium"
- trustScore < 40 → "low"

【重要な注意事項】
- これはAIによる簡易チェックであり、公式鑑定ではありません
- 正規品の特徴が確認できた点はpositiveSignalsに記載してください
- 懸念点はfactorsに記載してください
- overallCommentには総合的な判定コメントを日本語で記載してください`,
            },
            ...imageContent,
          ],
        },
      ],
    });

    return Response.json({
      trustScore: object.trustScore,
      trustLevel: object.trustLevel,
      factors: object.factors,
      positiveSignals: object.positiveSignals,
      overallComment: object.overallComment,
    });

  } catch (error: unknown) {
    console.error('Authenticity Check Error:', error);
    const message = error instanceof Error ? error.message : 'AI真贋分析に失敗しました。';
    return Response.json({ error: message }, { status: 500 });
  }
}
