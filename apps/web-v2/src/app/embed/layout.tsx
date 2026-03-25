import '@/styles/index.css';
import 'mapbox-gl/dist/mapbox-gl.css';

/** Minimal layout for embed pages — no nav, no footer, no providers. */
export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
