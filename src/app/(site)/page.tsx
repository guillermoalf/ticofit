import type { Metadata } from "next";

import { landing } from "@/content/landing";
import { SiteFooter } from "@/components/site/site-footer";
import {
  ClassesBand,
  Empezar,
  Hero,
  Intro,
  Reviews,
  Sedes,
  Tiles,
  WideCta,
} from "@/components/site/home/sections";

export const metadata: Metadata = {
  title: { absolute: landing.meta.home.title },
  description: landing.meta.home.description,
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <Intro />
      <Tiles />
      <ClassesBand />
      <Sedes />
      <Empezar />
      <WideCta />
      <Reviews />
      <SiteFooter />
    </>
  );
}
