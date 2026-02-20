'use client';

import { useState } from 'react';

interface RiskCategory {
    score: number;
    confidence: 'high' | 'medium' | 'low';
    findings: string;
}

interface AuthenticityResult {
    overallRiskScore: number;
    overallVerdict: 'low_risk' | 'moderate_risk' | 'high_risk' | 'inconclusive';
    verdictSummary: string;
    imageQuality: {
        score: number;
        issues: string[];
        sufficientForAnalysis: boolean;
    };
    categories: {
        printQuality: RiskCategory;
        cardStock: RiskCategory;
        edgesCorners: RiskCategory;
        centering: RiskCategory;
        hologramFoil: RiskCategory;
        backDesign: RiskCategory;
    };
    redFlags: string[];
    positiveIndicators: string[];
    disclaimer: string;
}

interface AuthenticityRiskScoreProps {
    imageUrls: string[];
    selectedImageIndices: number[];
}

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
    printQuality: { label: '印刷品質', icon: '🔍' },
    cardStock: { label: 'カード素材', icon: '📄' },
    edgesCorners: { label: 'エッジ・角', icon: '📐' },
    centering: { label: 'センタリング', icon: '⊞' },
    hologramFoil: { label: 'ホログラム/箔', icon: '✦' },
    backDesign: { label: '裏面デザイン', icon: '↩' },
};

function getVerdictConfig(verdict: AuthenticityResult['overallVerdict']) {
    switch (verdict) {
        case 'low_risk':
            return { label: '低リスク', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', barColor: 'bg-green-500' };
        case 'moderate_risk':
            return { label: '中リスク', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', barColor: 'bg-yellow-500' };
        case 'high_risk':
            return { label: '高リスク', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', barColor: 'bg-red-500' };
        case 'inconclusive':
            return { label: '判定不能', color: 'text-brand-platinum/60', bg: 'bg-brand-platinum/5', border: 'border-brand-platinum/20', barColor: 'bg-brand-platinum/40' };
    }
}

function getScoreColor(score: number): string {
    if (score <= 25) return 'text-green-400';
    if (score <= 50) return 'text-yellow-400';
    if (score <= 75) return 'text-orange-400';
    return 'text-red-400';
}

function getScoreBarColor(score: number): string {
    if (score <= 25) return 'bg-green-500';
    if (score <= 50) return 'bg-yellow-500';
    if (score <= 75) return 'bg-orange-500';
    return 'bg-red-500';
}

function getConfidenceBadge(confidence: 'high' | 'medium' | 'low') {
    switch (confidence) {
        case 'high':
            return { label: '高', className: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
        case 'medium':
            return { label: '中', className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' };
        case 'low':
            return { label: '低', className: 'bg-red-500/20 text-red-300 border-red-500/30' };
    }
}

export default function AuthenticityRiskScore({ imageUrls, selectedImageIndices }: AuthenticityRiskScoreProps) {
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<AuthenticityResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

    const toggleCategory = (key: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const runAuthentication = async () => {
        if (!imageUrls || imageUrls.length === 0) return;

        setAnalyzing(true);
        setError(null);
        setResult(null);

        try {
            const selectedUrls = selectedImageIndices
                .filter(idx => idx < imageUrls.length)
                .map(idx => imageUrls[idx]);

            if (selectedUrls.length === 0) {
                throw new Error('解析する画像を選択してください。');
            }

            const toBase64 = async (url: string): Promise<string> => {
                const res = await fetch(url);
                if (!res.ok) throw new Error(`画像の取得に失敗しました (${res.status})`);
                const blob = await res.blob();
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = () => reject(new Error('画像の読み込みに失敗しました。'));
                    reader.readAsDataURL(blob);
                });
            };

            const frontBase64 = selectedUrls[0] ? await toBase64(selectedUrls[0]) : undefined;
            const backBase64 = selectedUrls[1] ? await toBase64(selectedUrls[1]) : undefined;

            const apiRes = await fetch('/api/authenticate-card', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    frontImage: frontBase64,
                    backImage: backBase64,
                }),
            });

            if (!apiRes.ok) {
                const errorData = await apiRes.json().catch(() => ({}));
                throw new Error(errorData.error || `真贋分析に失敗しました (${apiRes.status})`);
            }

            const data = await apiRes.json();
            if (!data.success || !data.result) {
                throw new Error('分析結果の取得に失敗しました。');
            }

            setResult(data.result);
        } catch (err) {
            console.error('Authentication Error:', err);
            setError(err instanceof Error ? err.message : '真贋分析に失敗しました。もう一度お試しください。');
        } finally {
            setAnalyzing(false);
        }
    };

    const renderCategoryRow = (key: string, category: RiskCategory) => {
        const meta = CATEGORY_LABELS[key];
        if (!meta) return null;
        const confidenceBadge = getConfidenceBadge(category.confidence);
        const isExpanded = expandedCategories.has(key);

        return (
            <div key={key} className="border-b border-white/5 last:border-b-0">
                <button
                    type="button"
                    onClick={() => toggleCategory(key)}
                    className="w-full flex items-center gap-3 py-3 px-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                    <span className="text-sm w-5 text-center">{meta.icon}</span>
                    <span className="text-sm text-brand-platinum flex-1 text-left">{meta.label}</span>
                    <span className={`text-sm font-bold tabular-nums w-8 text-right ${getScoreColor(category.score)}`}>
                        {category.score}
                    </span>
                    <div className="w-20 h-1.5 bg-brand-dark-light/50 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${getScoreBarColor(category.score)}`}
                            style={{ width: `${category.score}%` }}
                        />
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${confidenceBadge.className}`}>
                        {confidenceBadge.label}
                    </span>
                    <svg
                        className={`w-4 h-4 text-brand-platinum/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
                {isExpanded && (
                    <div className="px-2 pb-3 pl-10">
                        <p className="text-xs text-brand-platinum/60 leading-relaxed">{category.findings}</p>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-4">
            <button
                type="button"
                onClick={runAuthentication}
                disabled={analyzing || imageUrls.length === 0}
                className={`flex items-center gap-2 px-5 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap ${
                    analyzing || imageUrls.length === 0
                        ? 'bg-brand-platinum/10 text-brand-platinum/30 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-600 to-purple-500 text-white hover:scale-105 shadow-lg shadow-purple-500/20'
                }`}
            >
                {analyzing ? (
                    <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        真贋分析中...
                    </>
                ) : (
                    <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        AI真贋チェック
                    </>
                )}
            </button>

            {error && (
                <div className="rounded-xl bg-red-500/10 p-4 border border-red-500/20 flex items-center gap-3">
                    <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-red-300">{error}</p>
                </div>
            )}

            {result && (
                <div className={`rounded-2xl ${getVerdictConfig(result.overallVerdict).bg} border ${getVerdictConfig(result.overallVerdict).border} overflow-hidden`}>
                    {!result.imageQuality.sufficientForAnalysis && (
                        <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-5 py-3 flex items-start gap-3">
                            <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <div>
                                <p className="text-sm text-yellow-300 font-medium">画像品質に関する注意</p>
                                <p className="text-xs text-yellow-300/70 mt-1">
                                    撮影品質が十分でないため、分析精度が低下している可能性があります。
                                    {result.imageQuality.issues.length > 0 && (
                                        <span> 問題点: {result.imageQuality.issues.join('、')}</span>
                                    )}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${getVerdictConfig(result.overallVerdict).bg} border-2 ${getVerdictConfig(result.overallVerdict).border}`}>
                                    <span className={`text-xl font-bold tabular-nums ${getVerdictConfig(result.overallVerdict).color}`}>
                                        {result.overallRiskScore}
                                    </span>
                                </div>
                                <div>
                                    <p className={`text-lg font-bold ${getVerdictConfig(result.overallVerdict).color}`}>
                                        {getVerdictConfig(result.overallVerdict).label}
                                    </p>
                                    <p className="text-xs text-brand-platinum/60">リスクスコア (0=安全 〜 100=危険)</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-brand-platinum/40 uppercase tracking-wider">画像品質</p>
                                <p className={`text-sm font-bold ${getScoreColor(100 - result.imageQuality.score)}`}>
                                    {result.imageQuality.score}/100
                                </p>
                            </div>
                        </div>

                        <div className="w-full h-2 bg-brand-dark-light/50 rounded-full overflow-hidden mb-4">
                            <div
                                className={`h-full rounded-full transition-all duration-700 ${getVerdictConfig(result.overallVerdict).barColor}`}
                                style={{ width: `${result.overallRiskScore}%` }}
                            />
                        </div>

                        <p className="text-sm text-brand-platinum/80 mb-5">{result.verdictSummary}</p>

                        {result.redFlags.length > 0 && (
                            <div className="mb-4 p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                                <p className="text-xs font-bold text-red-400 mb-2">検出された懸念点</p>
                                <ul className="space-y-1">
                                    {result.redFlags.map((flag, i) => (
                                        <li key={i} className="text-xs text-red-300/80 flex items-start gap-2">
                                            <span className="text-red-400 mt-0.5">•</span>
                                            <span>{flag}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {result.positiveIndicators.length > 0 && (
                            <div className="mb-4 p-3 rounded-xl bg-green-500/5 border border-green-500/10">
                                <p className="text-xs font-bold text-green-400 mb-2">真正品の指標</p>
                                <ul className="space-y-1">
                                    {result.positiveIndicators.map((indicator, i) => (
                                        <li key={i} className="text-xs text-green-300/80 flex items-start gap-2">
                                            <span className="text-green-400 mt-0.5">•</span>
                                            <span>{indicator}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="mb-4">
                            <p className="text-xs font-bold text-brand-platinum/60 mb-2 uppercase tracking-wider">カテゴリ別分析</p>
                            <div className="rounded-xl bg-brand-dark-light/20 border border-white/5">
                                {Object.entries(result.categories).map(([key, category]) =>
                                    renderCategoryRow(key, category)
                                )}
                            </div>
                        </div>

                        <div className="p-3 rounded-xl bg-brand-dark-light/30 border border-white/5">
                            <p className="text-[10px] text-brand-platinum/40 leading-relaxed">{result.disclaimer}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
