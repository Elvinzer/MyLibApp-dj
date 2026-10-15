import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "MyLib — Votre espace musical",
  description:
    "Votre bibliothèque musicale, sur votre Mac. Écoute, BPM et playlists.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
