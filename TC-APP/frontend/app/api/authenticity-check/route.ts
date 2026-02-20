import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { NextRequest } from 'next/server';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const riskFactorSchema = z.object({
  category: z.string().describe('リスクカテゴリ（例: 印刷品質、色味、フォント、ホログラム）'),
  description: z.string().describe('検出内容の説明（日本語）'),
  severity: z.enum(['info', 'warning', 'critical']).describe('深刻度'),
  confidence: z.number().min(0).max(100).describe('この判定の確信度（0-100）'),
});

const authenticitySchema = z.object({
  riskScore: z.number().min(0).max(100).describe('総合リスクスコア（0=低リスク、100=高リスク）'),
  factors: z.array(riskFactorSchema).describe('検出されたリスク要因'),
  positiveSignals: z.array(z.string()).describe('正規品の特徴として検出された点（日本語）'),
  uncertainAreas: z.array(z.string()).describe('画像品質により判定が困難だった点（日本語）'),
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
      ? '注意: 画像品質が低いため、判定精度が低下する可能性があります。判定が困難な点はuncertainAreasに含めてください。'
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
提供された画像を分析し、偽造の可能性を示すリスク要因を特定してください。

${qualityNote}

【分析観点】
1. 印刷品質: ドットパターン、インクのにじみ、解像度
2. 色味: 正規品との色調のズレ、彩度の異常
3. フォント: テキストの鮮明さ、フォントの正確性
4. ホログラム/箔押し: 反射パターン、位置の正確性（該当する場合）
5. カード素材: 紙質の質感、厚み（推定）
6. エッジ/裁断: カットの精度、角の状態
7. センタリング: 枠のバランス

【重要な注意事項】
- これは参考情報であり、確定的な真贋判定ではありません
- 高精度の偽造品は検出できない可能性があります
- 画像品質が低い場合、誤判定のリスクが高まります
- 判定が困難な点は正直にuncertainAreasに記載してください

【スコアガイドライン】
- 0-30: 低リスク（明らかな異常なし）
- 31-60: 中リスク（一部確認が必要な点あり）
- 61-100: 高リスク（複数の懸念点あり、慎重な確認を推奨）`,
            },
            ...imageContent,
          ],
        },
      ],
    });

    let riskLevel: 'low' | 'medium' | 'high';
    if (object.riskScore <= 30) {
      riskLevel = 'low';
    } else if (object.riskScore <= 60) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'high';
    }

    const avgFactorConfidence = object.factors.length > 0
      ? object.factors.reduce((sum: number, f: { confidence: number }) => sum + f.confidence, 0) / object.factors.length
      : 50;
    const qualityScore = imageQuality?.score || 50;
    const combinedConfidence = (avgFactorConfidence + qualityScore) / 2;

    let confidence: 'high' | 'medium' | 'low';
    if (combinedConfidence >= 75) {
      confidence = 'high';
    } else if (combinedConfidence >= 50) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }

    const limitations = [
      'この判定はAIによる参考情報であり、公式鑑定機関の判定とは異なります',
      '高精度の偽造品は検出できない場合があります',
    ];

    if (imageQuality?.score < 75) {
      limitations.push('画像品質が低いため、判定精度が低下している可能性があります');
    }

    if (!backImage) {
      limitations.push('裏面画像がないため、一部の検証ができていません');
    }

    if (object.uncertainAreas.length > 0) {
      limitations.push(`以下の点は判定が困難でした: ${object.uncertainAreas.join('、')}`);
    }

    return Response.json({
      riskScore: object.riskScore,
      riskLevel,
      confidence,
      factors: object.factors,
      positiveSignals: object.positiveSignals,
      limitations,
      imageQuality,
    });

  } catch (error: unknown) {
    console.error('Authenticity Check Error:', error);
    const message = error instanceof Error ? error.message : 'AI真贋分析に失敗しました。';
    return Response.json({ error: message }, { status: 500 });
  }
}
