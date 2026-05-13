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
  // Lazy initializer: if the platform doesn't support IntersectionObserver
  // (ancient browsers — not SSR; this component is client-only), mount
  // immediately from the first render. Avoids a synchronous setState inside
  // an effect, which Next.js's lint forbids.
  const [visible, setVisible] = useState(
    () => typeof IntersectionObserver === 'undefined',
  );

  useEffect(() => {
    if (visible || !ref.current) return;
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
