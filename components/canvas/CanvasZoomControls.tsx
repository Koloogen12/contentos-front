"use client";

/**
 * Зум-контрол в левом нижнем углу канваса.
 *
 * Разметка по прототипу THE DRAFT (prime2-canvas.jsx): `.zoomctl` — колонка
 * из трёх `.ib .tt` и подписи `.pct` с текущим масштабом под ними.
 * Миникарта живёт в правом нижнем углу и рендерится внутри <ReactFlow>
 * (см. CanvasEditor.tsx).
 */

import * as React from "react";
import { useReactFlow, useStore } from "@xyflow/react";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { t } from "@/lib/i18n";

const ICON = 15;

export function CanvasZoomControls() {
  const rf = useReactFlow();
  const zoom = useStore((s) => s.transform[2]);

  return (
    <div className="zoomctl">
      <button
        type="button"
        className="ib tt"
        data-tt={`${t.toolbar.fitToScreen} · ⇧1`}
        aria-label={t.toolbar.fitToScreen}
        onClick={() => rf.fitView({ padding: 0.2, maxZoom: 1.2 })}
      >
        <Maximize2 size={ICON} />
      </button>
      <button
        type="button"
        className="ib tt"
        data-tt={t.toolbar.zoomIn}
        aria-label={t.toolbar.zoomIn}
        onClick={() => rf.zoomIn()}
      >
        <ZoomIn size={ICON} />
      </button>
      <button
        type="button"
        className="ib tt"
        data-tt={t.toolbar.zoomOut}
        aria-label={t.toolbar.zoomOut}
        onClick={() => rf.zoomOut()}
      >
        <ZoomOut size={ICON} />
      </button>
      <span className="pct">{Math.round(zoom * 100)}%</span>
    </div>
  );
}
