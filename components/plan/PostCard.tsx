"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { PlannedPostOut } from "@/lib/types";
import {
  PLATFORM_TAG,
  postHookPreview,
} from "@/components/plan/planUtils";

interface PostCardProps {
  post: PlannedPostOut;
  onClick: () => void;
  /** Optional handle (e.g. "@kochnefff") rendered next to the pillar. */
  handle?: string | null;
  draggable?: boolean;
  showRelativeDate?: boolean;
  className?: string;
}

export function PostCard({
  post,
  onClick,
  handle,
  draggable,
  showRelativeDate,
  className,
}: PostCardProps) {
  const onDragStart = React.useCallback(
    (e: React.DragEvent<HTMLButtonElement>) => {
      e.dataTransfer.setData("text/plain", post.id);
      e.dataTransfer.effectAllowed = "move";
      e.currentTarget.style.opacity = "0.6";
    },
    [post.id],
  );

  const onDragEnd = React.useCallback(
    (e: React.DragEvent<HTMLButtonElement>) => {
      e.currentTarget.style.opacity = "";
    },
    [],
  );

  return (
    <button
      type="button"
      className={cn("co-plan-post nodrag", className)}
      onClick={onClick}
      draggable={draggable}
      onDragStart={draggable ? onDragStart : undefined}
      onDragEnd={draggable ? onDragEnd : undefined}
      data-post-id={post.id}
    >
      <div className="co-plan-post-row">
        <span className={cn("co-plan-status-dot", post.status)} aria-hidden />
        <span className="co-plan-platform-tag">
          {PLATFORM_TAG[post.platform]}
        </span>
      </div>
      <div className="co-plan-post-hook">{postHookPreview(post)}</div>
      <div className="co-plan-post-meta">
        {post.pillar && (
          <span className={cn("co-plan-pillar", post.pillar)}>
            {post.pillar}
          </span>
        )}
        {handle && <span className="truncate">{handle}</span>}
        {showRelativeDate && post.scheduled_date && (
          <span className="ml-auto truncate text-[10px] text-[color:var(--text-muted)]">
            {post.scheduled_date.slice(5).replace("-", ".")}
          </span>
        )}
      </div>
    </button>
  );
}
