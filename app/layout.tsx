import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Caveat } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { PendingGate } from "@/components/auth/PendingGate";
import { getSessionState } from "@/lib/auth/session";
import { PwaKlien } from "@/components/pwa/PwaKlien";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const caveat = Caveat({
  variable: "--font-handwriting",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Administrasi Berkas & Profil Santri - Baitul Qowwam",
  description: "Sistem Administrasi Berkas Santri & Digital CV Profiler",
  applicationName: "BQ-ku",
  appleWebApp: { capable: true, title: "BQ-ku", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0F231F",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, pending } = await getSessionState();
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${plusJakartaSans.variable} ${caveat.variable} font-sans antialiased bg-background text-foreground`}
      >
        <ThemeProvider>
          <AuthProvider user={user}>
            {pending ? <PendingGate email={pending.email} /> : children}
            <PwaKlien />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
