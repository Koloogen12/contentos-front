"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CornerDownRight, Loader2, Plus } from "lucide-react";
import { ApiError } from "@/lib/api";
import { createCanvas } from "@/lib/canvases";
import { listProjects } from "@/lib/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { TemplatesPickerDialog } from "@/components/canvas/TemplatesPickerDialog";
import { t } from "@/lib/i18n";

const schema = z.object({
  name: z
    .string()
    .min(1, t.createCanvas.nameRequired)
    .max(255, t.createCanvas.nameTooLong),
  description: z.string().max(2000).optional(),
});

type FormValues = z.infer<typeof schema>;

interface CreateCanvasDialogProps {
  /** Pre-selected project id (e.g. when sidebar has a project filter active). */
  defaultProjectId?: string | null;
  /** Optional controlled open state. When set, parent owns visibility. */
  open?: boolean;
  /** Required when `open` is set: open-state setter. */
  onOpenChange?: (open: boolean) => void;
  /**
   * Custom trigger element. When omitted (and uncontrolled), falls back
   * to the default "+ Новый канвас" pill button.
   */
  trigger?: React.ReactNode;
  /** When true, hides the default trigger entirely. Used when parent
   * fully controls the dialog (e.g. NewCanvasTile). */
  hideTrigger?: boolean;
}

export function CreateCanvasDialog({
  defaultProjectId,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
  hideTrigger,
}: CreateCanvasDialogProps = {}) {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = isControlled ? !!controlledOpen : internalOpen;
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (isControlled) controlledOnOpenChange?.(next);
      else setInternalOpen(next);
    },
    [isControlled, controlledOnOpenChange],
  );

  const [templatesOpen, setTemplatesOpen] = React.useState(false);
  const [projectId, setProjectId] = React.useState<string | null>(
    defaultProjectId ?? null,
  );
  const router = useRouter();
  const qc = useQueryClient();

  React.useEffect(() => {
    if (open) setProjectId(defaultProjectId ?? null);
  }, [open, defaultProjectId]);

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      createCanvas({
        name: values.name,
        description: values.description?.trim() || null,
        project_id: projectId,
      }),
    onSuccess: (canvas) => {
      qc.invalidateQueries({ queryKey: ["canvases"] });
      reset();
      setOpen(false);
      router.push(`/canvas/${canvas.id}`);
    },
  });

  const onSubmit = handleSubmit((values) => mutation.mutate(values));

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            reset();
            mutation.reset();
          }
        }}
      >
        {!hideTrigger && (
          <DialogTrigger asChild>
            {trigger ?? (
              <Button>
                <Plus className="h-4 w-4" /> {t.dash.newCanvas}
              </Button>
            )}
          </DialogTrigger>
        )}
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.createCanvas.title}</DialogTitle>
            <DialogDescription>{t.createCanvas.sub}</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="canvas-name">{t.createCanvas.nameLabel}</Label>
              <Input
                id="canvas-name"
                placeholder={t.createCanvas.namePlaceholder}
                autoFocus
                {...register("name")}
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="canvas-description">
                {t.createCanvas.descriptionLabel}{" "}
                <span className="text-muted-foreground">
                  {t.createCanvas.descriptionOptional}
                </span>
              </Label>
              <Textarea
                id="canvas-description"
                placeholder={t.createCanvas.descriptionPlaceholder}
                rows={3}
                {...register("description")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="canvas-project">
                {t.createCanvas.projectLabel}{" "}
                <span className="text-muted-foreground">
                  {t.createCanvas.projectOptional}
                </span>
              </Label>
              <select
                id="canvas-project"
                value={projectId ?? ""}
                onChange={(e) => setProjectId(e.target.value || null)}
                className={cn(
                  "flex h-10 w-full rounded-md border border-input bg-background/40 px-3 py-2 text-sm shadow-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                )}
              >
                <option value="">{t.createCanvas.projectNone}</option>
                {(projectsQuery.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setTemplatesOpen(true);
              }}
              className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
            >
              <CornerDownRight className="h-3 w-3" />
              {t.createCanvas.fromTemplate}
            </button>

            {mutation.error && (
              <div
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
              >
                {mutation.error instanceof ApiError
                  ? mutation.error.detail
                  : t.createCanvas.couldNotCreate}
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={mutation.isPending}
              >
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />{" "}
                    {t.createCanvas.submitting}
                  </>
                ) : (
                  t.createCanvas.submit
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <TemplatesPickerDialog
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        defaultProjectId={projectId}
      />
    </>
  );
}
