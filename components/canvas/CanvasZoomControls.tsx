"use client";

/**
 * Bottom-left zoom controls + zoom-percentage label, 1:1 from
 * `THE CONTENT-2/chrome.jsx#ZoomControls`.
 */

import * as React from "react";
import { useReactFlow, useStore } from "@xyflow/react";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { t } from "@/lib/i18n";

export function CanvasZoomControls() {
  const rf = useReactFlow();
  const zoom = useStore((s) => s.transform[2]);

  return (
    <div className="co-zoom-controls">
      <button
        type="button"
        className="co-zoom-btn"
        onClick={() => rf.fitView({ padding: 0.2, maxZoom: 1.2 })}
        title={t.toolbar.fitToScreen}
      >
        <Maximize2 size={14} />
      </button>
      <button
        type="button"
        className="co-zoom-btn"
        onClick={() => rf.zoomIn()}
        title={t.toolbar.zoomIn}
      >
        <ZoomIn size={14} />
      </button>
      <button
        type="button"
        className="co-zoom-btn"
        onClick={() => rf.zoomOut()}
        title={t.toolbar.zoomOut}
      >
        <ZoomOut size={14} />
      </button>
      <div className="co-zoom-level">{Math.round(zoom * 100)}%</div>
    </div>
  );
}

export function CanvasSwatches() {
  // Visual decoration only — three accent swatches.
  return (
    <div className="co-swatches">
      <div
        className="co-swatch"
        style={{ background: "#6366f1" }}
        title="Indigo"
      />
      <div
        className="co-swatch"
        style={{ background: "#22c55e" }}
        title="Green"
      />
      <div
        className="co-swatch"
        style={{ background: "#eab308" }}
        title="Amber"
      />
    </div>
  );
}
