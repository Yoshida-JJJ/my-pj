import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const riskCategorySchema = z.object({
    score: z.number().min(0).max(100).describe('Risk score 0-100. 0=no risk indicators found, 100=strong counterfeit indicators detected.'),
    confidence: z.enum(['high', 'medium', 'low']).describe('How confident the AI is in this particular assessment.'),
    findings: z.string().describe('Specific observations for this category in Japanese. Be factual and concise.'),
});

const authenticitySchema = z.object({
    overallRiskScore: z.number().min(0).max(100).describe('Overall authenticity risk score 0-100. Weighted average of all categories. 0=very likely authentic, 100=very likely counterfeit.'),
    overallVerdict: z.enum(['low_risk', 'moderate_risk', 'high_risk', 'inconclusive']).describe('Overall verdict. Use "inconclusive" when image quality prevents reliable assessment.'),
    verdictSummary: z.string().describe('One-sentence summary of the verdict in Japanese.'),

    imageQuality: z.object({
        score: z.number().min(0).max(100).describe('Image quality score 0-100. 100=excellent quality for authentication analysis.'),
        issues: z.array(z.string()).describe('List of image quality issues in Japanese (e.g. blurry, poor lighting, too dark, low resolution, glare). Empty array if no issues.'),
        sufficientForAnalysis: z.boolean().describe('Whether the image quality is sufficient for meaningful authenticity analysis.'),
    }),

    categories: z.object({
        printQuality: riskCategorySchema.describe('Print quality analysis: color accuracy, dot pattern consistency, text/line sharpness, ink quality.'),
        cardStock: riskCategorySchema.describe('Card stock and surface: thickness appearance, coating/finish consistency, texture.'),
        edgesCorners: riskCategorySchema.describe('Edge and corner quality: cut precision, edge consistency, corner sharpness.'),
        centering: riskCategorySchema.describe('Centering analysis: border symmetry on all sides.'),
        hologramFoil: riskCategorySchema.describe('Hologram/foil/refractor elements if present. If not applicable, score 0 with findings explaining N/A.'),
        backDesign: riskCategorySchema.describe('Back design analysis if back image provided: pattern accuracy, text alignment, color matching to known designs.'),
    }),

    redFlags: z.array(z.string()).describe('List of specific red flags found, in Japanese. Empty array if none.'),
    positiveIndicators: z.array(z.string()).describe('List of positive authenticity indicators found, in Japanese. Empty array if none.'),

    disclaimer: z.string().describe('Always include a disclaimer in Japanese stating this is AI-based preliminary analysis, not a professional authentication service. Mention that photo quality affects accuracy.'),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { frontImage, backImage } = body;

        if (!frontImage && !backImage) {
            return Response.json({ error: '少なくとも1枚の画像が必要です。' }, { status: 400 });
        }

        if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
            return Response.json({ error: 'AI API key is not configured.' }, { status: 500 });
        }

        const imageContent: { type: 'image'; image: string }[] = [];

        if (frontImage) {
            const base64Front = frontImage.replace(/^data:image\/[a-z]+;base64,/, '');
            imageContent.push({ type: 'image', image: base64Front });
        }
        if (backImage) {
            const base64Back = backImage.replace(/^data:image\/[a-z]+;base64,/, '');
            imageContent.push({ type: 'image', image: base64Back });
        }

        const imageCountText = frontImage && backImage
            ? '表面と裏面の2枚'
            : frontImage ? '表面の1枚' : '裏面の1枚';

        const { object } = await generateObject({
            model: google('gemini-flash-latest'),
            schema: authenticitySchema,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: `あなたはトレーディングカードの真贋鑑定の専門家です。提供された${imageCountText}のカード画像を分析し、偽造リスクを評価してください。

## 分析手順

1. **画像品質の評価**: まず画像の品質（解像度、ピント、照明、反射/グレア）を評価してください。品質が低い場合は、判定の信頼度を適切に下げてください。

2. **各カテゴリの分析**:
   - 印刷品質: インクの質、ドットパターン、テキストの鮮明さ、色の正確性
   - カード素材: 厚み、コーティング、表面テクスチャの一貫性
   - エッジ・角: カットの精度、エッジの一貫性
   - センタリング: ボーダーの対称性
   - ホログラム/箔: 該当する場合のみ評価
   - 裏面デザイン: 裏面画像がある場合のみ評価

3. **重要な注意点**:
   - 撮影環境（照明、角度、カメラ品質）が判定に影響することを常に考慮してください
   - 画像の品質が不十分な場合は "inconclusive" と判定し、その理由を明確に説明してください
   - 偽陽性（本物を偽物と判定）を避けるため、明確な証拠がない限り低リスクと判定してください
   - スコアは保守的に付けてください。写真のアーティファクトを偽造の証拠と混同しないでください
   - 裏面画像がない場合、backDesign カテゴリのスコアは0、findingsは「裏面画像が提供されていないため評価不可」としてください

4. **判定基準**:
   - 0-25: low_risk（偽造の兆候なし）
   - 26-50: moderate_risk（軽微な懸念点あり、追加確認推奨）
   - 51-75: high_risk（複数の懸念点あり、専門家による鑑定を強く推奨）
   - 76-100: high_risk（明確な偽造の兆候あり）
   - 画像品質が不十分: inconclusive

すべての出力テキスト（findings, verdictSummary, redFlags, positiveIndicators, disclaimer）は日本語で記述してください。`,
                        },
                        ...imageContent,
                    ],
                },
            ],
        });

        return Response.json({ success: true, result: object });
    } catch (error: unknown) {
        console.error('Authentication Analysis Error:', error);
        const message = error instanceof Error ? error.message : 'AI真贋分析に失敗しました。';
        return Response.json({ error: message }, { status: 500 });
    }
}
