import type { Metadata } from "next";

import { landing } from "@/content/landing";
import { SiteFooter } from "@/components/site/site-footer";
import {
  Empezar,
  Hero,
  HorarioSection,
  ResenasSection,
} from "@/components/site/home/sections";

export const metadata: Metadata = {
  title: { absolute: landing.meta.home.title },
  description: landing.meta.home.description,
};

export default function HomePage() {
  return (
    <>
      <Hero />
      {/* Kept off the cream canvas while the intro logo writes itself. */}
      <div className="tf-intro-rest">
        <HorarioSection />
        <ResenasSection />
        <Empezar />
        <SiteFooter />
      </div>
    </>
  );
}
