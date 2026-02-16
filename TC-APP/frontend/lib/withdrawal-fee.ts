/**
 * 振込手数料の段階制計算
 *
 * 実際の銀行振込手数料は金額が大きいほど高くなる傾向がある。
 * 例: 三井住友銀行（他行宛て）
 *   - 3万円未満: 220円（税込）
 *   - 3万円以上: 440円（税込）
 *
 * TC-APPでは以下の段階制を採用（デフォルト）:
 *
 *   振込申請額          手数料
 *   ¥1,000 〜 ¥29,999   ¥200
 *   ¥30,000 〜 ¥99,999  ¥400
 *   ¥100,000以上         ¥600
 *
 * 環境変数 WITHDRAWAL_FEE_TIERS で上書き可能:
 *   format: "上限1:手数料1,上限2:手数料2,..."
 *   例: "29999:200,99999:400,0:600"
 *        → ¥29,999以下=¥200, ¥99,999以下=¥400, それ以上=¥600
 *   最後の項目の上限を0にすると「それ以上すべて」を意味する
 */

export interface FeeTier {
    upTo: number;    // この金額以下に適用（0 = 上限なし）
    fee: number;     // 手数料額（円）
}

const DEFAULT_TIERS: FeeTier[] = [
    { upTo: 29999, fee: 200 },
    { upTo: 99999, fee: 400 },
    { upTo: 0, fee: 600 },       // 0 = それ以上すべて
];

/**
 * 環境変数から段階手数料を読み込む。
 * 未設定またはパースエラー時はデフォルト値を返す。
 */
export function getFeeTiers(): FeeTier[] {
    const envTiers = process.env.WITHDRAWAL_FEE_TIERS;
    if (!envTiers) return DEFAULT_TIERS;

    try {
        const tiers = envTiers.split(',').map(pair => {
            const [upToStr, feeStr] = pair.split(':');
            return { upTo: parseInt(upToStr), fee: parseInt(feeStr) };
        });
        if (tiers.length > 0 && tiers.every(t => !isNaN(t.fee))) {
            return tiers;
        }
    } catch (e) {
        console.error('Failed to parse WITHDRAWAL_FEE_TIERS:', e);
    }
    return DEFAULT_TIERS;
}

/**
 * 振込申請額に対する手数料を計算する。
 */
export function calculateWithdrawalFee(amount: number): number {
    const tiers = getFeeTiers();
    for (const tier of tiers) {
        if (tier.upTo === 0 || amount <= tier.upTo) {
            return tier.fee;
        }
    }
    // フォールバック（最後のtierの手数料）
    return tiers[tiers.length - 1].fee;
}

/**
 * フロントエンド表示用：全段階の手数料テーブルを返す。
 * Server Actionからクライアントに渡してUI表示に使う。
 */
export function getFeeTiersForDisplay(): { upTo: number; fee: number; label: string }[] {
    const tiers = getFeeTiers();
    const MIN_AMOUNT = 1000; // 最低振込額

    return tiers.map((tier, index) => {
        const prevUpTo = index > 0 ? tiers[index - 1].upTo + 1 : MIN_AMOUNT;
        if (tier.upTo === 0) {
            return { upTo: tier.upTo, fee: tier.fee, label: `¥${prevUpTo.toLocaleString()}以上` };
        }
        return { upTo: tier.upTo, fee: tier.fee, label: `¥${prevUpTo.toLocaleString()} 〜 ¥${tier.upTo.toLocaleString()}` };
    });
}
