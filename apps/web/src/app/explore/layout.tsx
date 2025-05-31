import { MapLayout } from '@/layouts';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <MapLayout secure={false}>{children}</MapLayout>;
}
