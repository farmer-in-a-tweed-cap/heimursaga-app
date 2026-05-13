'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

interface LazyMountProps {
  children: ReactNode;
  /** Pre-load when the placeholder is within this margin of the viewport. */
  rootMargin?: string;
  /** Optional placeholder rendered until the element enters view. */
  placeholder?: ReactNode;
  className?: string;
}

/**
 * Renders `children` only once the wrapping div enters the viewport (with a
 * generous rootMargin for prefetch). Until then, renders `placeholder`. Used
 * to defer expensive client components (Mapbox, video embeds) so they don't
 * block initial paint or contribute to TBT.
 */
export function LazyMount({
  children,
  rootMargin = '400px',
  placeholder = null,
  className,
}: LazyMountProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible || !ref.current) return;
    // If IntersectionObserver isn't available (very old browsers / SSR
    // edge cases), fall back to mounting immediately.
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const el = ref.current;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
            return;
          }
        }
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible, rootMargin]);

  return (
    <div ref={ref} className={className}>
      {visible ? children : placeholder}
    </div>
  );
}
