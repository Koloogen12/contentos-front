"use client";

/**
 * THE DRAFT landing — сборка страницы. Порт `prototype/landing-v2-app.jsx`.
 *
 * Порядок секций обязателен: он выстроен как воронка (см. README хендоффа).
 * Опциональные блоки (6, 7, 11, 13) — под флагами в `lib/landing/config.ts`,
 * это кандидаты на A/B «короткая версия против полной». Служебную панель
 * Tweaks из прототипа не переносим.
 */

import * as React from "react";
import { LandingFooter, LandingNav, XRow } from "./Chrome";
import {
  AlsoForBlock,
  HeroBlock,
  ProofBlock,
  RolesBlock,
  VoiceBlock,
} from "./blocks/BlocksTop";
import {
  FeaturesBlock,
  HowBlock,
  RecognizeBlock,
  StartBlock,
  WhyNowBlock,
} from "./blocks/BlocksMid";
import {
  AuthorBlock,
  ChangeBlock,
  FaqBlock,
  ObjectionsBlock,
  PricingBlock,
} from "./blocks/BlocksBottom";
import { LANDING_BLOCKS } from "@/lib/landing/config";
import { initScrollDepth, track } from "@/lib/landing/analytics";

export function LandingPage() {
  React.useEffect(() => {
    track("landing_view", { path: "/" });
    return initScrollDepth();
  }, []);

  return (
    <>
      <LandingNav />
      <HeroBlock />
      <XRow />
      <RolesBlock />
      <AlsoForBlock />
      <div className="wrap">
        <div className="hair" />
      </div>
      <ProofBlock />
      <VoiceBlock />
      {LANDING_BLOCKS.recognize && <RecognizeBlock />}
      {LANDING_BLOCKS.whyNow && <WhyNowBlock />}
      <FeaturesBlock />
      <StartBlock />
      <HowBlock />
      {LANDING_BLOCKS.change && <ChangeBlock />}
      <ObjectionsBlock />
      {LANDING_BLOCKS.author && <AuthorBlock />}
      <PricingBlock />
      <FaqBlock />
      <LandingFooter />
    </>
  );
}
