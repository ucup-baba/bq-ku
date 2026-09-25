import { AppShell } from '@/components/layout/AppShell';
import { ModeRuangProvider } from '@/components/ruang/ModeRuang';

export default function LembagaRoomLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModeRuangProvider mode="lembaga">
      <AppShell room="lembaga">
        {children}
      </AppShell>
    </ModeRuangProvider>
  );
}
