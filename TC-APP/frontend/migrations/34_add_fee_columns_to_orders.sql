-- 取引ごとの手数料情報を記録するカラムを追加
-- fee_rate: 適用された手数料率（0.10 = 10%）。キャンペーン時に変動可能。
-- platform_fee: 実際に控除された手数料額（円）
-- net_earnings: 売り手の純収益（total_amount - platform_fee）
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS fee_rate numeric(5, 4) DEFAULT 0.10,
    ADD COLUMN IF NOT EXISTS platform_fee integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS net_earnings integer DEFAULT 0;
COMMENT ON COLUMN public.orders.fee_rate IS '適用された手数料率。例: 0.10 = 10%, 0.05 = 5%キャンペーン';
COMMENT ON COLUMN public.orders.platform_fee IS 'プラットフォーム手数料額（円）';
COMMENT ON COLUMN public.orders.net_earnings IS '出品者の純収益（total_amount - platform_fee）';
-- 既存の完了済み注文をバックフィル（現行の10%ルールで埋める）
UPDATE public.orders
SET fee_rate = 0.10,
    platform_fee = FLOOR(total_amount * 0.10),
    net_earnings = total_amount - FLOOR(total_amount * 0.10)
WHERE status = 'completed'
    AND net_earnings = 0;