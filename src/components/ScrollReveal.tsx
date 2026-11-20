import { useEffect, useRef, useState, type ReactNode } from 'react';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  direction?: 'up' | 'left' | 'right' | 'scale';
}

/**
 * Lightweight IntersectionObserver scroll-reveal wrapper using compositor-only
 * `transform` and `opacity` transitions with prefers-reduced-motion fallback.
 */
export function ScrollReveal({
  children,
  className = '',
  delayMs = 0,
  direction = 'up',
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    if (typeof window.IntersectionObserver !== 'function') return true;
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  });

  useEffect(() => {
    if (visible) return;
    const node = ref.current;
    if (!node || typeof IntersectionObserver !== 'function') {
      setVisible(true);
      return;
    }

    // Reveal immediately if already within or above the viewport on mount
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.96) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -32px 0px',
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  const hiddenTransform =
    direction === 'left'
      ? '-translate-x-5'
      : direction === 'right'
      ? 'translate-x-5'
      : direction === 'scale'
      ? 'scale-[0.97]'
      : 'translate-y-6';

  return (
    <div
      ref={ref}
      style={delayMs > 0 ? { transitionDelay: `${delayMs}ms` } : undefined}
      className={`transition-[opacity,transform] duration-700 ease-out-expo will-change-[opacity,transform] ${
        visible ? 'opacity-100 translate-x-0 translate-y-0 scale-100' : `opacity-0 ${hiddenTransform}`
      } ${className}`}
    >
      {children}
    </div>
  );
}
