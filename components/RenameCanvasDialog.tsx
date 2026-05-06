"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import { updateCanvas } from "@/lib/canvases";
import type { CanvasOut } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { t } from "@/lib/i18n";

const schema = z.object({
  name: z
    .string()
    .min(1, t.createCanvas.nameRequired)
    .max(255, t.createCanvas.nameTooLong),
});

type FormValues = z.infer<typeof schema>;

interface RenameCanvasDialogProps {
  canvas: CanvasOut | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RenameCanvasDialog({
  canvas,
  open,
  onOpenChange,
}: RenameCanvasDialogProps) {
  const qc = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: canvas?.name ?? "" },
  });

  React.useEffect(() => {
    if (canvas) reset({ name: canvas.name });
  }, [canvas, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      canvas
        ? updateCanvas(canvas.id, { name: values.name })
        : Promise.reject(new Error("No canvas selected")),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["canvases"] });
      qc.invalidateQueries({ queryKey: ["canvas", updated.id] });
      onOpenChange(false);
    },
  });

  const onSubmit = handleSubmit((values) => mutation.mutate(values));

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
          <DialogTitle>{t.renameCanvas.title}</DialogTitle>
          <DialogDescription>
            {t.renameCanvas.sub(canvas?.name ?? "")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rename-canvas-name">
              {t.createCanvas.nameLabel}
            </Label>
            <Input
              id="rename-canvas-name"
              autoFocus
              {...register("name")}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>
          {mutation.error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              {mutation.error instanceof ApiError
                ? mutation.error.detail
                : t.renameCanvas.couldNotRename}
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />{" "}
                  {t.common.saving}
                </>
              ) : (
                t.common.save
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
