import { AppMapLayout } from '@/layouts';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppMapLayout secure={false}>{children}</AppMapLayout>;
}
