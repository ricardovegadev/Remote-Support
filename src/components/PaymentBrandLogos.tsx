export type CardNetwork = 'visa' | 'mc' | 'amex';

export function detectCardNetwork(cardNumber: string): CardNetwork | null {
  const digits = cardNumber.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('4')) return 'visa';
  if (digits.startsWith('5')) return 'mc';
  if (digits.startsWith('34') || digits.startsWith('37')) return 'amex';
  return null;
}

interface LogoVariantProps {
  variant?: 'dark' | 'light';
  className?: string;
}

/**
 * Official Google Pay vector mark:
 * Multicolor Google 'G' (#4285F4, #EA4335, #FBBC05, #34A853) + clean 'Pay' typography.
 */
export function GooglePayLogo({
  variant = 'dark',
  className = '',
}: LogoVariantProps) {
  const payTextColor = variant === 'dark' ? '#FFFFFF' : '#3C4043';

  return (
    <svg
      viewBox="0 0 88 28"
      className={`h-6 w-auto ${className}`}
      role="img"
      aria-label="Google Pay"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Google 'G' multicolor paths */}
      <g transform="translate(2, 4)">
        <path
          d="M19.6 10.23c0-.7-.06-1.38-.18-2.03H10v3.84h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.89-1.74 2.99-4.3 2.99-7.33Z"
          fill="#4285F4"
        />
        <path
          d="M10 20c2.7 0 4.96-.9 6.61-2.43l-3.23-2.5c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H1.07v2.59A10 10 0 0 0 10 20Z"
          fill="#34A853"
        />
        <path
          d="M4.41 11.91a6.01 6.01 0 0 1 0-3.82V5.5H1.07a10 10 0 0 0 0 9l3.34-2.59Z"
          fill="#FBBC05"
        />
        <path
          d="M10 3.97c1.47 0 2.79.5 3.83 1.5l2.87-2.87C14.95.98 12.7 0 10 0A10 10 0 0 0 1.07 5.5l3.34 2.59C5.2 5.73 7.4 3.97 10 3.97Z"
          fill="#EA4335"
        />
      </g>
      <text
        x="27"
        y="19.5"
        fill={payTextColor}
        fontFamily="'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif"
        fontSize="16"
        fontWeight="600"
        letterSpacing="-0.3"
      >
        Pay
      </text>
    </svg>
  );
}

/**
 * Official PayPal vector mark:
 * Overlapping double 'P' monogram (#003087 & #0079C1) + italic bold 'PayPal' wordmark.
 */
export function PayPalLogo({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 104 28"
      className={`h-6 w-auto ${className}`}
      role="img"
      aria-label="PayPal"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Overlapping Double 'P' Monogram */}
      <g transform="translate(2, 3)">
        <path
          d="M6.8 1.5h5.7c3 0 4.8 1.5 4.3 4.5-.6 3.7-3 5.7-6.4 5.7H8.5c-.5 0-.9.3-1 .8l-.8 5.2c-.1.4-.4.7-.8.7H2.5c-.4 0-.7-.4-.6-.8L4.6 2.5c.1-.6.6-1 1.2-1Z"
          fill="#003087"
        />
        <path
          d="M10.1 6.2h5.1c2.7 0 4.3 1.4 3.8 4.1-.5 3.3-2.7 5.1-5.8 5.1h-1.6c-.4 0-.8.3-.9.8l-.7 4.6c-.1.4-.4.7-.8.7H6.3c-.4 0-.6-.3-.6-.7l2.2-13.7c.1-.5.5-.9 1.1-.9Z"
          fill="#0079C1"
          fillOpacity="0.92"
        />
      </g>
      {/* Italic Bold Wordmark */}
      <text
        x="26"
        y="20"
        fontFamily="'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif"
        fontSize="16.5"
        fontWeight="800"
        fontStyle="italic"
        letterSpacing="-0.4"
      >
        <tspan fill="#003087">Pay</tspan>
        <tspan fill="#0079C1">Pal</tspan>
      </text>
    </svg>
  );
}

/**
 * Official Stripe geometric typographic wordmark:
 * Pure white on #635BFF button (dark) or official #635BFF on light badge.
 */
export function StripeLogo({
  variant = 'dark',
  className = '',
}: LogoVariantProps) {
  const fill = variant === 'dark' ? '#FFFFFF' : '#635BFF';

  return (
    <svg
      viewBox="0 0 74 26"
      className={`h-5 w-auto ${className}`}
      role="img"
      aria-label="Stripe"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Characteristic angled dot on 'i' + geometric bold wordmark */}
      <text
        x="2"
        y="19.5"
        fill={fill}
        fontFamily="'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif"
        fontSize="19"
        fontWeight="800"
        letterSpacing="-0.7"
      >
        stripe
      </text>
    </svg>
  );
}

export function VisaBadgeIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 44 16"
      className={`h-3.5 w-auto ${className}`}
      role="img"
      aria-label="VISA"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Classic gold accent on the top-left of V */}
      <polygon points="1,2 6.8,2 8.2,5.3 3.2,5.3" fill="#F7B600" />
      <text
        x="6.5"
        y="13.5"
        fill="#1A1F71"
        fontFamily="'Plus Jakarta Sans', 'Inter', system-ui, sans-serif"
        fontSize="13.5"
        fontWeight="900"
        fontStyle="italic"
        letterSpacing="-0.5"
      >
        VISA
      </text>
    </svg>
  );
}

export function MastercardBadgeIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 34 20"
      className={`h-4 w-auto ${className}`}
      role="img"
      aria-label="Mastercard"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Left Red Circle */}
      <circle cx="12" cy="10" r="7.5" fill="#EB001B" />
      {/* Right Amber Circle */}
      <circle cx="22" cy="10" r="7.5" fill="#F79E1B" />
      {/* Deterministic #FF5F00 Lens Intersection */}
      <path
        d="M17 4.36a7.5 7.5 0 0 1 0 11.28 7.5 7.5 0 0 1 0-11.28Z"
        fill="#FF5F00"
      />
    </svg>
  );
}

export function AmexBadgeIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 20"
      className={`h-4 w-auto ${className}`}
      role="img"
      aria-label="American Express"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="0" y="1" width="40" height="18" rx="3" fill="#006FCF" />
      <text
        x="20"
        y="13.5"
        textAnchor="middle"
        fill="#FFFFFF"
        fontFamily="'Plus Jakarta Sans', 'Inter', system-ui, sans-serif"
        fontSize="9.5"
        fontWeight="800"
        letterSpacing="0.4"
      >
        AMEX
      </text>
    </svg>
  );
}

interface CardNetworkBadgesProps {
  activeNetwork?: CardNetwork | null;
}

export function CardNetworkBadges({
  activeNetwork = null,
}: CardNetworkBadgesProps) {
  const getBadgeStyle = (network: CardNetwork) => {
    if (!activeNetwork) {
      return 'border-slate-200 bg-white opacity-100';
    }
    if (activeNetwork === network) {
      return 'border-[#2563EB] bg-blue-50/40 ring-1 ring-[#2563EB] opacity-100 scale-[1.03]';
    }
    return 'border-slate-200 bg-white opacity-45';
  };

  return (
    <div
      className="flex items-center gap-1.5"
      aria-label="Redes de tarjeta aceptadas: VISA, Mastercard y American Express"
    >
      <span
        className={`h-7 px-2.5 rounded border flex items-center justify-center shadow-xs transition-all ${getBadgeStyle('visa')}`}
      >
        <VisaBadgeIcon />
      </span>
      <span
        className={`h-7 px-2 rounded border flex items-center justify-center shadow-xs transition-all ${getBadgeStyle('mc')}`}
      >
        <MastercardBadgeIcon />
      </span>
      <span
        className={`h-7 px-2 rounded border flex items-center justify-center shadow-xs transition-all ${getBadgeStyle('amex')}`}
      >
        <AmexBadgeIcon />
      </span>
    </div>
  );
}
