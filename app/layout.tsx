import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";


export const metadata: Metadata = {
  title: "MinCoach",
  description: "Personlig träningscoach för planering, pass och progression.",
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
