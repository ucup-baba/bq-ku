import { AppShell } from '@/components/layout/AppShell';

export default function SantriRoomLayout({ children }: { children: React.ReactNode }) {
  return <AppShell room="santri">{children}</AppShell>;
}
