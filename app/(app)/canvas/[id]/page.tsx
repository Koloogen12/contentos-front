"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { ApiError } from "@/lib/api";
import { getCanvas } from "@/lib/canvases";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CanvasEditor } from "@/components/canvas/CanvasEditor";
import { CanvasTopBar } from "@/components/canvas/CanvasTopBar";
import { ShareDialog } from "@/components/canvas/ShareDialog";
import { VersionsDialog } from "@/components/canvas/VersionsDialog";
import { t } from "@/lib/i18n";

export default function CanvasDetailPage() {
  const params = useParams<{ id: string }>();
  const canvasId = params?.id;
  const [versionsOpen, setVersionsOpen] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);

  const query = useQuery({
    queryKey: ["canvas", canvasId],
    queryFn: () => getCanvas(canvasId!),
    enabled: !!canvasId,
  });

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[color:var(--canvas-bg)]">
      {query.data ? (
        <CanvasTopBar
          canvas={query.data}
          onOpenVersions={() => setVersionsOpen(true)}
          onOpenShare={() => setShareOpen(true)}
        />
      ) : (
        <div className="co-canvas-topbar">
          <div className="co-topbar-logo opacity-60">{t.brandName}</div>
          <div className="flex-1 flex justify-center">
            <Skeleton className="h-7 w-48" />
          </div>
          <div className="w-[280px]" />
        </div>
      )}

      {query.isPending ? (
        <div className="flex flex-1 items-center justify-center co-canvas-surface">
          <Skeleton className="h-10 w-72" />
        </div>
      ) : query.isError ? (
        <CanvasError
          detail={
            query.error instanceof ApiError
              ? query.error.detail
              : "Не удалось загрузить канвас."
          }
          onRetry={() => query.refetch()}
        />
      ) : query.data ? (
        <>
          <CanvasEditor canvas={query.data} />
          <VersionsDialog
            canvasId={query.data.id}
            open={versionsOpen}
            onOpenChange={setVersionsOpen}
          />
          <ShareDialog
            canvasId={query.data.id}
            open={shareOpen}
            onOpenChange={setShareOpen}
          />
        </>
      ) : null}
    </div>
  );
}

function CanvasError({
  detail,
  onRetry,
}: {
  detail: string;
  onRetry: () => void;
}) {
  return (
    <div className="mx-auto mt-12 w-full max-w-xl rounded-2xl border border-destructive/30 bg-destructive/5 p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/15 text-destructive">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-medium text-foreground">
            {t.dash.couldNotLoad}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
        </div>
      </div>
      <div className="mt-5">
        <Button onClick={onRetry} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4" /> {t.dash.retry}
        </Button>
      </div>
    </div>
  );
}
