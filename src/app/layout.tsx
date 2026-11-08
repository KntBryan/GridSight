import type { Metadata, Viewport } from "next";
import { DM_Sans, Inter, Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });
const body = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const heading = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-heading", weight: ["500", "600", "700", "800"] });
const fontBody = Inter({ subsets: ["latin"], variable: "--font-body", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "GridSight | Power, in perspective",
  description: "Community-powered outage reports for your area.",
  manifest: "/manifest.json",
  applicationName: "GridSight",
};

export const viewport: Viewport = {
  themeColor: "#182126",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} ${heading.variable} ${fontBody.variable}`}>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
