"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight,
  Flame,
  Loader2,
  Sparkles,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ApiError } from "@/lib/api";
import { getWhatToWrite } from "@/lib/content-plan";
import { createCanvas } from "@/lib/canvases";
import { createNode } from "@/lib/nodes";
import type { WhatToWriteRecommendation } from "@/lib/types";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const REC_ICONS: Record<WhatToWriteRecommendation["type"], LucideIcon> = {
  dormant_gem: Sparkles,
  pillar_balance: Target,
  top_score: Flame,
};

export function WhatToWriteWidget() {
  const query = useQuery({
    queryKey: ["plan-what-to-write"],
    queryFn: getWhatToWrite,
  });

  if (query.isPending || query.isError) return null;
  const data = query.data;
  if (!data || data.recommendations.length === 0) return null;

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles size={16} className="text-[color:#a78bfa]" />
        <h2 className="text-[15px] font-semibold">
          {t.plan.whatToWrite.title}
        </h2>
        {data.priority_pillar && (
          <span className={cn("co-plan-pillar", data.priority_pillar)}>
            {data.priority_pillar}
          </span>
        )}
      </div>
      {data.pillar_reason && (
        <p className="mb-3 text-[12px] text-[color:var(--text-muted)]">
          {data.pillar_reason}
        </p>
      )}
      <div className="flex flex-col gap-2">
        {data.recommendations.map((rec, i) => (
          <RecommendationRow key={i} rec={rec} />
        ))}
      </div>
    </section>
  );
}

function RecommendationRow({ rec }: { rec: WhatToWriteRecommendation }) {
  const router = useRouter();
  const qc = useQueryClient();
  const Icon = REC_ICONS[rec.type] ?? Sparkles;

  const openMutation = useMutation({
    mutationFn: async () => {
      const name =
        rec.knowledge_item_title ||
        rec.title ||
        t.common.untitled;
      const canvas = await createCanvas({ name });
      const seed =
        rec.knowledge_item_body || rec.knowledge_item_title || rec.title;
      if (seed) {
        try {
          await createNode(canvas.id, {
            type: "source",
            position_x: 100,
            position_y: 120,
            data: { input_type: "text", content: seed },
          });
        } catch {
          // best-effort
        }
      }
      return canvas;
    },
    onSuccess: (canvas) => {
      qc.invalidateQueries({ queryKey: ["canvases"] });
      router.push(`/canvas/${canvas.id}`);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError
          ? err.detail
          : t.onboarding.couldNotCreateCanvas,
      ),
  });

  return (
    <div className="co-plan-w2w-row">
      <span className="co-plan-w2w-icon">
        <Icon size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-[color:var(--text-tertiary)]">
            {t.plan.whatToWrite.types[rec.type]}
          </span>
          {rec.pillar && (
            <span className={cn("co-plan-pillar", rec.pillar)}>
              {rec.pillar}
            </span>
          )}
          {rec.viral_score !== null && (
            <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--text-secondary)]">
              {rec.viral_score}/20
            </span>
          )}
        </div>
        <div className="mt-0.5 text-[13px] font-medium leading-snug">
          {rec.knowledge_item_title || rec.title}
        </div>
        {rec.knowledge_item_body && (
          <p className="mt-1 line-clamp-2 text-[12px] text-[color:var(--text-muted)]">
            {rec.knowledge_item_body}
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => openMutation.mutate()}
        disabled={openMutation.isPending}
      >
        {openMutation.isPending ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <ArrowRight size={12} />
        )}
        {t.plan.whatToWrite.open}
      </Button>
    </div>
  );
}
