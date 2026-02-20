'use client';

import { motion } from 'framer-motion';
import {
  ShieldCheck, ShieldAlert, ShieldX,
  AlertTriangle, CheckCircle2,
  ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react';
import { useState } from 'react';
import { AuthenticityResult, RiskFactor } from '@/types/authenticity';
import ProgressRing from '../ui/ProgressRing';

interface RiskScoreResultProps {
  result: AuthenticityResult;
  onRetry: () => void;
  onClose: () => void;
}

export default function RiskScoreResult({ result, onRetry, onClose }: RiskScoreResultProps) {
  const [showDetails, setShowDetails] = useState(false);

  const levelConfig = {
    low: {
      icon: ShieldCheck,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/30',
      ringColor: '#22c55e',
      title: '低リスク',
      description: '明らかな異常は検出されませんでした',
    },
    medium: {
      icon: ShieldAlert,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-500/30',
      ringColor: '#eab308',
      title: '中リスク',
      description: '一部確認が必要な点があります',
    },
    high: {
      icon: ShieldX,
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/30',
      ringColor: '#ef4444',
      title: '高リスク',
      description: '慎重な確認を推奨します',
    },
  };

  const config = levelConfig[result.riskLevel];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto"
    >
      <div className={`rounded-2xl border ${config.borderColor} ${config.bgColor} p-6`}>
        <div className="flex items-center justify-center mb-6">
          <div className="relative">
            <ProgressRing
              progress={100 - result.riskScore}
              size={140}
              strokeWidth={10}
              color={config.ringColor}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Icon className={`w-10 h-10 ${config.color}`} />
              <span className="text-2xl font-bold text-white mt-1">
                {result.riskScore}
              </span>
            </div>
          </div>
        </div>

        <div className="text-center mb-6">
          <h2 className={`text-2xl font-bold ${config.color}`}>
            {config.title}
          </h2>
          <p className="text-brand-platinum/70 mt-1">
            {config.description}
          </p>
          <div className="flex items-center justify-center gap-2 mt-2 text-sm text-brand-platinum/50">
            <span>判定信頼度:</span>
            <span className={
              result.confidence === 'high' ? 'text-green-400' :
              result.confidence === 'medium' ? 'text-yellow-400' :
              'text-red-400'
            }>
              {result.confidence === 'high' ? '高' :
               result.confidence === 'medium' ? '中' : '低'}
            </span>
          </div>
        </div>

        {result.factors.length > 0 && (
          <div className="mb-6">
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              検出された懸念点
            </h3>
            <div className="space-y-2">
              {result.factors.map((factor, idx) => (
                <FactorItem key={idx} factor={factor} />
              ))}
            </div>
          </div>
        )}

        {result.positiveSignals && result.positiveSignals.length > 0 && (
          <div className="mb-6">
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              正規品の特徴
            </h3>
            <ul className="space-y-1">
              {result.positiveSignals.map((signal, idx) => (
                <li key={idx} className="text-brand-platinum/70 text-sm flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">・</span>
                  {signal}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full py-2 text-brand-platinum/70 text-sm flex items-center justify-center gap-1 hover:text-white transition-colors"
        >
          {showDetails ? (
            <>詳細を閉じる <ChevronUp className="w-4 h-4" /></>
          ) : (
            <>詳細を表示 <ChevronDown className="w-4 h-4" /></>
          )}
        </button>

        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 pt-4 border-t border-white/10"
          >
            {result.imageQuality && (
              <div className="mb-4">
                <h4 className="text-white text-sm font-medium mb-2">画像品質</h4>
                <div className="grid grid-cols-2 gap-2">
                  <QualityBadge
                    label="解像度"
                    passed={result.imageQuality.checks.resolution.passed}
                  />
                  <QualityBadge
                    label="明るさ"
                    passed={result.imageQuality.checks.brightness.passed}
                  />
                  <QualityBadge
                    label="ピント"
                    passed={result.imageQuality.checks.focus.passed}
                  />
                  <QualityBadge
                    label="カード検出"
                    passed={result.imageQuality.checks.cardDetection.passed}
                  />
                </div>
              </div>
            )}

            <div>
              <h4 className="text-white text-sm font-medium mb-2">制限事項</h4>
              <ul className="space-y-1">
                {result.limitations.map((limitation, idx) => (
                  <li key={idx} className="text-brand-platinum/50 text-xs flex items-start gap-2">
                    <span className="mt-0.5">•</span>
                    {limitation}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </div>

      <div className="mt-4 p-4 bg-brand-dark-light/50 rounded-xl border border-white/5">
        <p className="text-brand-platinum/50 text-xs text-center">
          この判定はAIによる参考情報です。確定的な真贋判定ではありません。
          高額カードは公式鑑定機関（PSA, BGS等）の利用を推奨します。
        </p>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={onRetry}
          className="flex-1 py-3 border border-white/20 text-white rounded-xl flex items-center justify-center gap-2 hover:bg-white/5 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          別の画像で再判定
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-3 bg-brand-blue hover:bg-brand-blue-glow text-white rounded-xl font-medium transition-colors"
        >
          閉じる
        </button>
      </div>
    </motion.div>
  );
}

function FactorItem({ factor }: { factor: RiskFactor }) {
  const severityConfig = {
    info: { color: 'text-blue-400', bg: 'bg-blue-500/10' },
    warning: { color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    critical: { color: 'text-red-400', bg: 'bg-red-500/10' },
  };
  const config = severityConfig[factor.severity];

  return (
    <div className={`p-3 rounded-lg ${config.bg}`}>
      <div className="flex items-start justify-between">
        <div>
          <span className={`text-xs font-medium ${config.color}`}>
            {factor.category}
          </span>
          <p className="text-white text-sm mt-1">{factor.description}</p>
        </div>
        <span className="text-brand-platinum/50 text-xs">
          {factor.confidence}%
        </span>
      </div>
    </div>
  );
}

function QualityBadge({ label, passed }: { label: string; passed?: boolean }) {
  return (
    <div className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 ${
      passed ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
    }`}>
      {passed ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
      {label}
    </div>
  );
}
