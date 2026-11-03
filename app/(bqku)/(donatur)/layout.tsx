import { AppShell } from '@/components/layout/AppShell';

export default function DonaturRoomLayout({ children }: { children: React.ReactNode }) {
  return <AppShell room="donatur">{children}</AppShell>;
}
