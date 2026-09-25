import { AppShell } from '@/components/layout/AppShell';
import { ModeRuangProvider } from '@/components/ruang/ModeRuang';
import { BilahModeBaca } from '@/components/ruang/BilahModeBaca';

export default function LembagaRoomLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModeRuangProvider mode="lembaga">
      <AppShell room="lembaga">
        <BilahModeBaca />
        {children}
      </AppShell>
    </ModeRuangProvider>
  );
}
