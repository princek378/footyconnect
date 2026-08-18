import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "FootyConnect | Squad Hub",
  description:
    "The ultimate platform for football players – profiles, match stats, squad chat & more.",
  keywords: ["football", "soccer", "team", "players", "match stats", "chat"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-body antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
