import { useId } from 'react';

interface AssistantOrbIconProps {
  size?: 'sm' | 'md' | 'lg';
  state?: 'idle' | 'thinking' | 'ready';
  showOnlineBadge?: boolean;
  className?: string;
}

const SIZE_CLASS_MAP: Record<NonNullable<AssistantOrbIconProps['size']>, string> = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

/**
 * Custom animated interactive assistant core emblem.
 * Uses concentric counter-rotating orbital arcs and live harmonic signal bars
 * instead of a static generic robot/chatbot silhouette.
 */
export function AssistantOrbIcon({
  size = 'md',
  state = 'idle',
  showOnlineBadge = false,
  className = '',
}: AssistantOrbIconProps) {
  const uid = useId().replace(/:/g, '');
  const coreGradId = `orb-core-${uid}`;
  const ringGradId = `orb-ring-${uid}`;
  const isThinking = state === 'thinking';
  const isReady = state === 'ready';

  return (
    <span
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${SIZE_CLASS_MAP[size]} ${className}`}
      aria-hidden="true"
    >
      {/* Subtle outer breathing aura */}
      <span
        className={`absolute inset-0 rounded-full animate-orb-halo ${
          isThinking
            ? 'bg-sky-400/50'
            : isReady
            ? 'bg-emerald-400/45'
            : 'bg-[#2563EB]/35'
        }`}
      />

      <svg
        viewBox="0 0 48 48"
        fill="none"
        className="relative z-10 w-full h-full drop-shadow-sm"
      >
        <defs>
          <radialGradient id={coreGradId} cx="32%" cy="28%" r="72%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="52%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1E3A8A" />
          </radialGradient>
          <linearGradient id={ringGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#93C5FD" />
            <stop offset="55%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
        </defs>

        {/* Outer rotating precision telemetry arc */}
        <g
          className="animate-orb-orbit"
          style={{ animationDuration: isThinking ? '3.4s' : '10s' }}
        >
          <circle
            cx="24"
            cy="24"
            r="21.5"
            stroke={`url(#${ringGradId})`}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="34 18 12 24"
            opacity="0.88"
          />
          <circle cx="24" cy="2.5" r="2.1" fill="#34D399" />
        </g>

        {/* Counter-rotating subtle inner guide ring */}
        <g
          className="animate-orb-orbit-reverse"
          style={{ animationDuration: isThinking ? '4.8s' : '15s' }}
        >
          <circle
            cx="24"
            cy="24"
            r="18"
            stroke="#BFDBFE"
            strokeWidth="1"
            strokeDasharray="8 12"
            opacity="0.7"
          />
        </g>

        {/* Faceted luminous sapphire core */}
        <circle cx="24" cy="24" r="15.2" fill={`url(#${coreGradId})`} />
        <ellipse
          cx="19.5"
          cy="17"
          rx="6"
          ry="3.6"
          transform="rotate(-22 19.5 17)"
          fill="#FFFFFF"
          opacity="0.22"
        />

        {/* Interactive live harmonic signal waveform inside core */}
        <g>
          <rect
            x="16.5"
            y="19.5"
            width="2.4"
            height="9"
            rx="1.2"
            fill="#DBEAFE"
            className="animate-orb-bar"
            style={{
              animationDuration: isThinking ? '0.65s' : '1.65s',
              animationDelay: '0ms',
            }}
          />
          <rect
            x="21.1"
            y="16.5"
            width="2.4"
            height="15"
            rx="1.2"
            fill="#FFFFFF"
            className="animate-orb-bar"
            style={{
              animationDuration: isThinking ? '0.65s' : '1.65s',
              animationDelay: '180ms',
            }}
          />
          <rect
            x="25.7"
            y="18"
            width="2.4"
            height="12"
            rx="1.2"
            fill={isReady ? '#6EE7B7' : '#FFFFFF'}
            className="animate-orb-bar"
            style={{
              animationDuration: isThinking ? '0.65s' : '1.65s',
              animationDelay: '340ms',
            }}
          />
          <rect
            x="30.3"
            y="20.2"
            width="2.4"
            height="7.6"
            rx="1.2"
            fill="#BAE6FD"
            className="animate-orb-bar"
            style={{
              animationDuration: isThinking ? '0.65s' : '1.65s',
              animationDelay: '500ms',
            }}
          />
        </g>
      </svg>

      {showOnlineBadge && (
        <span className="absolute -bottom-0.5 -right-0.5 z-20 w-3 h-3 rounded-full bg-[#10B981] ring-2 ring-white" />
      )}
    </span>
  );
}
