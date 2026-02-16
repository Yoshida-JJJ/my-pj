'use server';

import { createClient } from '../../utils/supabase/server';
import { Payout, SalesHistoryItem } from '../../types';
import { calculateWithdrawalFee, getFeeTiersForDisplay } from '../../lib/withdrawal-fee';

import { Resend } from 'resend';
import { PayoutRequestEmail } from '../../components/emails/PayoutRequestEmail';
import { ReactElement } from 'react';

// Legacy constant - deprecated, use getCurrentFeeRate() instead
// const PLATFORM_FEE_PERCENTAGE = 0.1;
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * 現在適用される手数料率を取得する。
 * 将来的にはキャンペーンテーブル参照やユーザーランク別の料率に拡張可能。
 * 現時点では環境変数 PLATFORM_FEE_RATE（デフォルト0.10）を使用。
 */
export async function getCurrentFeeRate(): Promise<number> {
    const envRate = process.env.PLATFORM_FEE_RATE;
    if (envRate) {
        const parsed = parseFloat(envRate);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
            return parsed;
        }
    }
    return 0.10; // デフォルト10%
}

/**
 * Logic A: Calculate Available Balance
 * 個別取引の net_earnings を積み上げて計算（一律掛け算ではない）
 */
export async function getAvailableBalance(userId: string) {
    const supabase = await createClient();

    // 1. 完了済み注文から net_earnings を個別に取得して合算
    const { data: soldOrders, error: soldError } = await supabase
        .from('orders')
        .select('total_amount, platform_fee, net_earnings')
        .eq('seller_id', userId)
        .eq('status', 'completed');

    if (soldError) throw new Error(soldError.message);

    const totalSoldAmount = soldOrders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
    const totalFees = soldOrders?.reduce((sum, o) => sum + (o.platform_fee || 0), 0) || 0;
    // 個別の net_earnings を積み上げる（一律掛け算ではない）
    const totalEarnings = soldOrders?.reduce((sum, o) => sum + (o.net_earnings || 0), 0) || 0;

    // 2. 出金済み/申請中の合計
    const { data: payouts, error: payoutError } = await supabase
        .from('payouts')
        .select('amount, status')
        .eq('user_id', userId)
        .neq('status', 'rejected');

    if (payoutError) throw new Error(payoutError.message);

    const totalPayouts = payouts?.reduce((sum, p) => sum + p.amount, 0) || 0;

    return {
        totalSold: totalSoldAmount,    // 総販売額
        totalFees: totalFees,          // 手数料合計
        totalEarnings: totalEarnings,  // 純収益合計（個別積み上げ）
        withdrawn: totalPayouts,
        available: totalEarnings - totalPayouts,
        orderCount: soldOrders?.length || 0,  // 取引件数
    };
}

/**
 * Update Profile Real Name (Kana)
 */
export async function updateProfileKana(userId: string, kana: string) {
    const supabase = await createClient();

    // Sanitize: Remove all spaces (half/full width)
    const sanitizedKana = kana.replace(/[\s\u3000]+/g, '');

    // Validate Kana (Katakana Only)
    const kanaRegex = /^[\u30A0-\u30FF]+$/;
    if (!kanaRegex.test(sanitizedKana)) {
        throw new Error('Real name must be in full-width Katakana.');
    }

    const { error } = await supabase
        .from('profiles')
        .update({ real_name_kana: sanitizedKana })
        .eq('id', userId);

    if (error) throw new Error(error.message);
    return { success: true };
}

/**
 * Logic B: Register Bank Account
 * Enforces KYC Name Match
 */
export async function registerBankAccount(userId: string, bankData: {
    bankName: string;
    bankCode?: string;
    branchName: string;
    branchCode?: string;
    accountType: 'ordinary' | 'current';
    accountNumber: string;
    accountHolderName?: string; // Optional from client, we override
}) {
    const supabase = await createClient();

    // 1. Get User Profile for Kata Name
    const { data: profile } = await supabase
        .from('profiles')
        .select('real_name_kana')
        .eq('id', userId)
        .single();

    if (!profile || !profile.real_name_kana) {
        throw new Error("Profile name (Katakana) is required.");
    }

    // 2. Validate Kana Match (Implicitly enforced by OVERRIDING the input)
    // We ignore bankData.accountHolderName and use profile.real_name_kana
    // Sanitize spaces just in case
    const safeHolderName = profile.real_name_kana.replace(/[\s\u3000]+/g, '');

    const { error } = await supabase
        .from('bank_accounts')
        .upsert({
            user_id: userId,
            bank_name: bankData.bankName,
            bank_code: bankData.bankCode,
            branch_name: bankData.branchName,
            branch_code: bankData.branchCode,
            account_type: bankData.accountType,
            account_number: bankData.accountNumber,
            account_holder_name: safeHolderName,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

    if (error) {
        console.error('Bank Reg Error:', error);
        throw new Error(error.message || 'Failed to register bank account.');
    }
    return { success: true };
}

/**
 * Logic C: Request Payout
 */
export async function requestPayout(userId: string, netAmount: number) {
    const supabase = await createClient();

    if (netAmount <= 0) throw new Error('Invalid amount.');

    // 0. Verify Bank Account Exists
    const bankAccount = await getBankAccount(userId);
    if (!bankAccount) {
        throw new Error('Please register a bank account before requesting a payout.');
    }

    // 1. Calculate Fee using tiered system
    const fee = calculateWithdrawalFee(netAmount);
    const grossAmount = netAmount + fee; // Total Deduction from Balance

    // 2. Check Balance against Gross Amount
    const balance = await getAvailableBalance(userId);
    if (balance.available < grossAmount) {
        throw new Error(`Insufficient balance. You need ¥${grossAmount.toLocaleString()} (Amount + Fee) but have ¥${balance.available.toLocaleString()}.`);
    }

    // 3. Create Payout Record
    const { error } = await supabase
        .from('payouts')
        .insert({
            user_id: userId,
            amount: grossAmount,     // Total Balance Deduction
            fee: fee,
            payout_amount: netAmount, // Actual Transfer Amount
            status: 'pending'
        });

    if (error) throw new Error(error.message);

    // 4. Send Notification to Admins
    if (process.env.ADMIN_EMAILS) {
        try {
            const adminEmails = process.env.ADMIN_EMAILS.split(',').map(e => e.trim());
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

            // Fetch User Name for Email
            const { data: profile } = await supabase
                .from('profiles')
                .select('name')
                .eq('id', userId)
                .single();

            const userName = profile?.name || 'Unknown User';

            const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
            await resend.emails.send({
                from: `Stadium Card <${fromEmail}>`,
                to: adminEmails,
                subject: 'New Payout Request',
                react: PayoutRequestEmail({
                    userName,
                    amount: netAmount,
                    payoutId: 'New', // We don't have ID easily unless we select it back. Using generic label.
                    adminUrl: `${baseUrl}/admin/payouts`
                }) as ReactElement
            });
        } catch (emailErr) {
            console.error("Failed to send admin notification:", emailErr);
            // Non-blocking error
        }
    }

    return { success: true };
}

/**
 * Fetch Payout History
 */
export async function getPayoutHistory(userId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('payouts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data as Payout[];
}

/**
 * Fetch Registered Bank Account
 */
export async function getBankAccount(userId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error && error.code !== 'PGRST116') throw new Error(error.message); // Ignore "not found"
    return data;
}

/**
 * Fetch Profile Kana
 */
export async function getProfileKana(userId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('profiles')
        .select('real_name_kana')
        .eq('id', userId)
        .single();

    if (error) return null;
    return data?.real_name_kana;
}

/**
 * フロントエンドに手数料段階テーブルを返す。
 * payouts/page.tsx の初期ロード時に呼び出す。
 */
export async function getWithdrawalFeeTiers() {
    return getFeeTiersForDisplay();
}
