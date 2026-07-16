import type { Metadata } from "next";
import { latestNews } from "@/lib/news";
import { NewsDesk } from "@/components/news/news-desk";

export const metadata: Metadata = {
  title: "Actualités",
  description:
    "Toute l'actualité des marchés BRVM/UEMOA agrégée depuis Sika Finance et Financial Afrik, rattachée aux sociétés cotées. Liens vers les articles originaux.",
};

export default function NewsPage() {
  const news = latestNews(120);
  return <NewsDesk news={news} />;
}
