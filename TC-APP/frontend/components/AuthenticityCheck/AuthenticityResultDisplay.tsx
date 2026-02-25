'use client';

import { useState } from 'react';
import { Shield, CheckCircle2, AlertTriangle } from 'lucide-react';
import { AuthenticityResult } from '@/types/authenticity';

interface AuthenticityResultDisplayProps {
    result: AuthenticityResult;
    isDetailPage?: boolean;
}

export default function AuthenticityResultDisplay({
    result,
    isDetailPage = false
}: AuthenticityResultDisplayProps) {
    const [showDisclaimerDetail, setShowDisclaimerDetail] = useState(false);

    return (
        <div className="border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-4 sm:px-6 py-4 bg-brand-dark-light/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-blue/20 flex items-center justify-center flex-shrink-0">
                        <Shield className="w-5 h-5 text-brand-blue" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-white font-medium">AI簡易真贋チェック</h3>
                    </div>
                </div>
                <span className={`text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-full ${
                    result.trustLevel === 'high'
                        ? 'bg-green-500/20 text-green-400'
                        : result.trustLevel === 'medium'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/20 text-red-400'
                }`}>
                    {result.trustLevel === 'high' ? '高信頼' :
                     result.trustLevel === 'medium' ? '中程度' : '低信頼'}
                </span>
            </div>

            <div className="p-4 sm:p-6 border-t border-white/10">
                <div className={`p-4 rounded-xl mb-4 ${
                    result.trustLevel === 'high'
                        ? 'bg-green-500/10 border border-green-500/20'
                        : result.trustLevel === 'medium'
                        ? 'bg-yellow-500/10 border border-yellow-500/20'
                        : 'bg-red-500/10 border border-red-500/20'
                }`}>
                    <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center flex-shrink-0 ${
                            result.trustLevel === 'high'
                                ? 'bg-green-500/20'
                                : result.trustLevel === 'medium'
                                ? 'bg-yellow-500/20'
                                : 'bg-red-500/20'
                        }`}>
                            {result.trustLevel === 'high' ? (
                                <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 text-green-400" />
                            ) : (
                                <AlertTriangle className={`w-7 h-7 sm:w-8 sm:h-8 ${
                                    result.trustLevel === 'medium'
                                        ? 'text-yellow-400'
                                        : 'text-red-400'
                                }`} />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                                <span className={`text-2xl sm:text-3xl font-bold ${
                                    result.trustLevel === 'high'
                                        ? 'text-green-400'
                                        : result.trustLevel === 'medium'
                                        ? 'text-yellow-400'
                                        : 'text-red-400'
                                }`}>
                                    {result.trustScore}
                                </span>
                                <span className="text-brand-platinum/50 text-sm">/ 100</span>
                            </div>
                            <p className={`text-sm ${
                                result.trustLevel === 'high'
                                    ? 'text-green-400'
                                    : result.trustLevel === 'medium'
                                    ? 'text-yellow-400'
                                    : 'text-red-400'
                            }`}>
                                {result.trustLevel === 'high'
                                    ? '明らかな異常は検出されませんでした'
                                    : result.trustLevel === 'medium'
                                    ? '一部確認が必要な点があります'
                                    : '慎重な確認を推奨します'}
                            </p>
                        </div>
                    </div>
                </div>

                {result.overallComment && (
                    <div className="mb-4 p-3 bg-brand-dark rounded-lg">
                        <h4 className="text-brand-platinum/70 text-xs mb-1">総合コメント</h4>
                        <p className="text-brand-platinum/80 text-sm">
                            {result.overallComment}
                        </p>
                    </div>
                )}

                {result.metadataCheck && (
                    <div className="mb-4 p-3 bg-brand-dark rounded-lg">
                        <h4 className="text-brand-platinum/70 text-xs mb-2">画像ソース情報</h4>
                        {result.metadataCheck.imageSource === 'camera' && (
                            <div className="space-y-1">
                                {result.metadataCheck.deviceModel && (
                                    <p className="text-brand-platinum/60 text-sm flex items-center gap-2">
                                        📱 {result.metadataCheck.deviceMake} {result.metadataCheck.deviceModel}
                                    </p>
                                )}
                                {result.metadataCheck.captureDate && (
                                    <p className="text-brand-platinum/60 text-sm flex items-center gap-2">
                                        📅 {new Date(result.metadataCheck.captureDate).toLocaleString('ja-JP')}
                                    </p>
                                )}
                                <p className="text-green-400 text-sm flex items-center gap-2">
                                    ✅ カメラ撮影画像と確認
                                </p>
                            </div>
                        )}
                        {result.metadataCheck.imageSource === 'screenshot' && (
                            <p className="text-yellow-400 text-sm flex items-center gap-2">
                                ⚠️ スクリーンショットまたはデジタル画像の可能性があります
                            </p>
                        )}
                        {result.metadataCheck.imageSource === 'unknown' && (
                            <p className="text-brand-platinum/50 text-sm flex items-center gap-2">
                                ❓ 撮影情報を確認できませんでした
                            </p>
                        )}
                    </div>
                )}

                {result.scoreNote && (
                    <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <p className="text-yellow-300 text-xs flex items-start gap-2">
                            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            {result.scoreNote}
                        </p>
                    </div>
                )}

                {result.factors && result.factors.length > 0 && (
                    <div className="mb-4">
                        <h4 className="text-white text-sm font-medium mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-400" />
                            検出された懸念点
                        </h4>
                        <ul className="space-y-2">
                            {result.factors.map((factor, idx) => (
                                <li
                                    key={idx}
                                    className={`p-3 rounded-lg text-sm ${
                                        factor.severity === 'critical'
                                            ? 'bg-red-500/10 text-red-300'
                                            : factor.severity === 'warning'
                                            ? 'bg-yellow-500/10 text-yellow-300'
                                            : 'bg-blue-500/10 text-blue-300'
                                    }`}
                                >
                                    <span className="font-medium">{factor.category}:</span> {factor.description}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {result.positiveSignals && result.positiveSignals.length > 0 && (
                    <div className="mb-4">
                        <h4 className="text-white text-sm font-medium mb-2 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                            正規品の特徴
                        </h4>
                        <ul className="space-y-1">
                            {result.positiveSignals.slice(0, 3).map((signal, idx) => (
                                <li key={idx} className="text-brand-platinum/70 text-sm flex items-start gap-2">
                                    <span className="text-green-400 mt-0.5">✓</span>
                                    {signal}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="p-3 bg-brand-dark rounded-lg">
                    <p className="text-brand-platinum/50 text-xs flex items-start gap-1.5">
                        <span className="flex-shrink-0">⚠️</span>
                        <span>
                            このスコアはAIによる画像分析の参考情報であり、カードの真贋を保証するものではありません。
                            正確な鑑定が必要な場合は、PSA・BGS等の公式鑑定機関をご利用ください。
                        </span>
                    </p>
                    <button
                        type="button"
                        onClick={() => setShowDisclaimerDetail(!showDisclaimerDetail)}
                        className="text-brand-platinum/40 text-xs mt-2 hover:text-brand-platinum/60 transition-colors underline"
                    >
                        {showDisclaimerDetail ? '閉じる' : '詳しく見る'}
                    </button>
                    {showDisclaimerDetail && (
                        <div className="mt-2 pt-2 border-t border-white/5 text-brand-platinum/40 text-xs space-y-1">
                            <p>・本スコアはAIが画像の内容を分析した参考情報です</p>
                            <p>・実物のカードの真贋（本物/偽物）を判定・保証するものではありません</p>
                            <p>・スコアが高くても偽造品である可能性、スコアが低くても本物である可能性があります</p>
                            <p>・画像の撮影条件（照明、角度、解像度）によりスコアが変動することがあります</p>
                            <p>・デジタル画像やスクリーンショットからの分析には限界があります</p>
                        </div>
                    )}
                </div>

                {!isDetailPage && (
                    <div className="mt-4 p-3 bg-brand-blue/10 border border-brand-blue/20 rounded-lg">
                        <p className="text-brand-blue text-xs flex items-start gap-1.5">
                            <span className="flex-shrink-0">ℹ️</span>
                            <span>このチェック結果は出品情報として購入検討者に表示されます。</span>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export function AuthenticityNoScoreDisplay() {
    return (
        <div className="border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-4 sm:px-6 py-4 bg-brand-dark-light/50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-platinum/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-brand-platinum/40" />
                </div>
                <div>
                    <h3 className="text-brand-platinum/60 font-medium">AI簡易真贋チェック</h3>
                </div>
            </div>
            <div className="p-4 sm:p-6 border-t border-white/10">
                <p className="text-brand-platinum/50 text-sm text-center">
                    画像品質の都合によりスコアを算出できませんでした
                </p>
                <p className="text-brand-platinum/40 text-xs text-center mt-2">
                    ※ スコアが表示されていない場合でも、出品内容の信頼性とは関係ありません
                </p>
            </div>
        </div>
    );
}
