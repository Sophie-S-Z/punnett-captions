import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@/styles/product.css";
import { Toaster } from "sonner";
const sans = Geist({
  variable: "--font-ui",
  subsets: ["latin"],
  display: "swap",
});
const mono = Geist_Mono({
  variable: "--font-code",
  subsets: ["latin"],
  display: "swap",
});
export const metadata: Metadata = {
  title: "Punnett | AI captions & memes",
  description:
    "Turn your photos into funny AI captions. Upload an image, choose a tone, compare captions, and revisit your image and caption history.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="night"
      className={`${sans.variable} ${mono.variable}`}
    >
      <body>
        {children}
        <Toaster theme="dark" position="bottom-center" richColors />
      </body>
    </html>
  );
}
