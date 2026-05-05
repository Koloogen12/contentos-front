"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import { deleteCanvas } from "@/lib/canvases";
import type { CanvasOut } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteCanvasDialogProps {
  canvas: CanvasOut | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: (id: string) => void;
}

export function DeleteCanvasDialog({
  canvas,
  open,
  onOpenChange,
  onDeleted,
}: DeleteCanvasDialogProps) {
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      canvas
        ? deleteCanvas(canvas.id)
        : Promise.reject(new Error("No canvas selected")),
    onSuccess: () => {
      if (canvas) onDeleted?.(canvas.id);
      qc.invalidateQueries({ queryKey: ["canvases"] });
      onOpenChange(false);
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) mutation.reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete canvas?</DialogTitle>
          <DialogDescription>
            &ldquo;{canvas?.name}&rdquo; and all of its nodes will be removed.
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {mutation.error && (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          >
            {mutation.error instanceof ApiError
              ? mutation.error.detail
              : "Could not delete canvas."}
          </div>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Deleting…
              </>
            ) : (
              "Delete canvas"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
