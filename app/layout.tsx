import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Inter } from "next/font/google";


export const metadata: Metadata = {
  title: "MinCoach",
  description: "Personlig träningscoach för planering, pass och progression.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
const inter = Inter({
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <body
        className={`${inter.className} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
