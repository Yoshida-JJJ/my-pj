'use client';

import { CameraGuideState } from '@/types/authenticity';

interface CameraGuideOverlayProps {
  guideState: CameraGuideState;
  cardType: 'standard' | 'small';
}

const CARD_RATIOS = {
  standard: 63 / 88,
  small: 59 / 86,
};

export default function CameraGuideOverlay({ guideState, cardType }: CameraGuideOverlayProps) {
  const ratio = CARD_RATIOS[cardType];

  let strokeColor: string;
  if (guideState.readyToCapture) {
    strokeColor = '#22c55e';
  } else if (guideState.cardDetected) {
    strokeColor = '#eab308';
  } else {
    strokeColor = '#ffffff';
  }

  const strokeStyle = guideState.cardDetected ? 'solid' : 'dashed';

  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <mask id="cardMask">
            <rect x="0" y="0" width="100" height="100" fill="white" />
            <rect
              x="20"
              y={50 - (30 / ratio)}
              width="60"
              height={60 / ratio}
              rx="2"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100"
          height="100"
          fill="rgba(0,0,0,0.5)"
          mask="url(#cardMask)"
        />
      </svg>

      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: '60%',
          aspectRatio: ratio,
        }}
      >
        <div className="absolute inset-0">
          <div
            className="absolute top-0 left-0 w-8 h-8"
            style={{
              borderTop: `3px ${strokeStyle} ${strokeColor}`,
              borderLeft: `3px ${strokeStyle} ${strokeColor}`,
              borderTopLeftRadius: '8px',
            }}
          />
          <div
            className="absolute top-0 right-0 w-8 h-8"
            style={{
              borderTop: `3px ${strokeStyle} ${strokeColor}`,
              borderRight: `3px ${strokeStyle} ${strokeColor}`,
              borderTopRightRadius: '8px',
            }}
          />
          <div
            className="absolute bottom-0 left-0 w-8 h-8"
            style={{
              borderBottom: `3px ${strokeStyle} ${strokeColor}`,
              borderLeft: `3px ${strokeStyle} ${strokeColor}`,
              borderBottomLeftRadius: '8px',
            }}
          />
          <div
            className="absolute bottom-0 right-0 w-8 h-8"
            style={{
              borderBottom: `3px ${strokeStyle} ${strokeColor}`,
              borderRight: `3px ${strokeStyle} ${strokeColor}`,
              borderBottomRightRadius: '8px',
            }}
          />
        </div>
      </div>

      <div className="absolute top-20 right-4 flex flex-col items-center gap-1">
        <div className="text-xs text-white/70">明るさ</div>
        <div className={`w-3 h-8 rounded-full ${
          guideState.brightness === 'too_dark' ? 'bg-red-500' :
          guideState.brightness === 'too_bright' ? 'bg-yellow-500' :
          'bg-green-500'
        }`} />
      </div>
    </div>
  );
}
