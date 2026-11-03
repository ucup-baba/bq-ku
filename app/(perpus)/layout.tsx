import { AppShell } from '@/components/layout/AppShell';

export default function PerpusRoomLayout({ children }: { children: React.ReactNode }) {
  return <AppShell room="perpus">{children}</AppShell>;
}
