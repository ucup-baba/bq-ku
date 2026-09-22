import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Caveat } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AppShell } from "@/components/layout/AppShell";
import { getSessionUser } from "@/lib/auth/session";

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
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${plusJakartaSans.variable} ${caveat.variable} font-sans antialiased bg-background text-foreground`}
      >
        <ThemeProvider>
          <AppShell user={user}>
            {children}
          </AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
