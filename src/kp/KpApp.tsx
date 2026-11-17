import { useMemo } from "react";
import { Header } from "../components/Header/Header";
import { kpText, type Region } from "../content/kp";
import { Pager, type Page } from "../pager/Pager";
import { Channels } from "../sections/Channels/Channels";
import { Footer } from "../components/Footer/Footer";
import {
  KpBreakdown, KpGuarantees, KpIncluded, KpPayment, KpPrices, KpPromotion,
  KpRevisions, KpServices, KpStart, KpSteps, KpTitle,
} from "./Slides";

/**
 * Коммерческое предложение — те же полноэкранные секции, что на главной (Pager),
 * 12 слайдов и футер. Порядок, якоря (#id), фоны и темы — здесь; тексты — content/kp.ts.
 */
export function KpApp({ region }: { region: Region }) {
  const t = useMemo(() => kpText(region), [region]);
  const pages = useMemo<Page[]>(() => [
    { id: "top", label: "Титул", bg: "ink", theme: "dark", node: <KpTitle t={t.title} /> },
    { id: "services", label: "Что мы делаем", bg: "red", theme: "accent", node: <KpServices t={t.services} /> },
    { id: "included", label: "Что входит в сайт", bg: "smoke", theme: "light", node: <KpIncluded t={t.included} /> },
    { id: "prices", label: "Стоимость сайта", bg: "white", theme: "light", node: <KpPrices t={t.prices} /> },
    { id: "breakdown", label: "Из чего складывается цена", bg: "mist", theme: "light", node: <KpBreakdown t={t.breakdown} /> },
    { id: "channels", label: "Каналы продвижения", bg: "red", theme: "accent", node: <Channels data={t.channels} /> },
    { id: "promotion", label: "Стоимость продвижения", bg: "smoke", theme: "light", node: <KpPromotion t={t.promotion} /> },
    { id: "steps", label: "Этапы и сроки", bg: "ink", theme: "dark", node: <KpSteps t={t.steps} /> },
    { id: "revisions", label: "Правки", bg: "white", theme: "light", node: <KpRevisions t={t.revisions} /> },
    { id: "payment", label: "Оплата", bg: "red", theme: "accent", node: <KpPayment t={t.payment} /> },
    { id: "guarantees", label: "Гарантии", bg: "ink", theme: "dark", node: <KpGuarantees t={t.guarantees} /> },
    { id: "start", label: "Как начать", bg: "white", theme: "light", node: <KpStart t={t.start} /> },
    { id: "footer", label: "Связаться", bg: "ink", theme: "dark", node: <Footer />, meter: false },
  ], [t]);

  return (
    <>
      <Header cta={t.cta} menu={t.menu} />
      <Pager pages={pages} />
    </>
  );
}
