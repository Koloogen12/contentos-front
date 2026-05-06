"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueue } from "@/lib/content-plan";
import type { PlannedPostOut } from "@/lib/types";
import { t } from "@/lib/i18n";
import { PostCard } from "@/components/plan/PostCard";

interface QueueSidebarProps {
  handle?: string | null;
  onPostClick: (post: PlannedPostOut) => void;
  onAddManual: () => void;
}

export function QueueSidebar({
  handle,
  onPostClick,
  onAddManual,
}: QueueSidebarProps) {
  const queueQuery = useQuery({
    queryKey: ["plan-queue"],
    queryFn: getQueue,
  });

  const items = queueQuery.data ?? [];

  return (
    <aside className="co-plan-queue co-plan-card">
      <div className="co-plan-h">
        {t.plan.queue.title} ({items.length})
      </div>

      {queueQuery.isPending ? (
        <div className="co-plan-queue-empty">{t.common.loading}</div>
      ) : items.length === 0 ? (
        <div className="co-plan-queue-empty">{t.plan.queue.empty}</div>
      ) : (
        <div className="co-plan-queue-list scrollbar-thin">
          {items.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              draggable
              showRelativeDate={false}
              handle={handle ?? null}
              onClick={() => onPostClick(post)}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        className="co-plan-add-manual"
        onClick={onAddManual}
      >
        {t.plan.queue.addManual}
      </button>
    </aside>
  );
}
