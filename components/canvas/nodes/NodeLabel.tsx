"use client";

/**
 * Подпись над карточкой ноды с кнопкой удаления.
 *
 * Удалить ноду раньше можно было только клавишей Delete по выделенной
 * карточке. Клавиша осталась, но обнаруживается она не всеми: нода выглядит
 * как форма, а не как выделяемый объект, и попытка нажать Delete внутри
 * поля ввода (справедливо) ничего не делает. Корзина решает это, не
 * занимая место внутри карточки: она живёт в метке и проявляется по
 * наведению на ноду.
 *
 * Оба пути ведут в одно подтверждение — см. requestDeleteNode в редакторе.
 */

import * as React from "react";
import { Trash2 } from "lucide-react";
import { useCanvasNodeContext } from "@/components/canvas/canvasContext";

export function NodeLabel({
  nodeId,
  icon,
  children,
}: {
  nodeId: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const { readOnly, requestDeleteNode } = useCanvasNodeContext();

  return (
    <div className="nlabel">
      {icon}
      <span>{children}</span>
      {!readOnly && (
        <button
          type="button"
          className="nlabel-del nodrag tt"
          data-tt="Удалить ноду"
          aria-label="Удалить ноду"
          onClick={(e) => {
            e.stopPropagation();
            requestDeleteNode(nodeId);
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );
}
