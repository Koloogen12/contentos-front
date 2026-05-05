"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { createProject, PROJECT_COLORS, updateProject } from "@/lib/projects";
import type { ProjectContext, ProjectOut } from "@/lib/types";
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
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const schema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Maximum 255 characters"),
  product_description: z.string().max(2000).optional(),
  target_audience: z.string().max(2000).optional(),
  key_themes: z.string().max(2000).optional(),
  tone_notes: z.string().max(2000).optional(),
});

type FormValues = z.infer<typeof schema>;

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the dialog opens in "edit" mode. */
  project?: ProjectOut | null;
  /** Force the title — overrides the auto title for create vs. edit. */
  title?: string;
}

export function ProjectDialog({
  open,
  onOpenChange,
  project,
  title,
}: ProjectDialogProps) {
  const qc = useQueryClient();
  const editing = !!project;
  const [color, setColor] = React.useState<string>(
    project?.color ?? PROJECT_COLORS[0],
  );
  const [advancedOpen, setAdvancedOpen] = React.useState(false);

  const initialKeyThemes = React.useMemo(() => {
    const kt = project?.context?.key_themes;
    if (Array.isArray(kt)) return kt.join(", ");
    if (typeof kt === "string") return kt;
    return "";
  }, [project]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: project?.name ?? "",
      product_description: project?.context?.product_description ?? "",
      target_audience: project?.context?.target_audience ?? "",
      key_themes: initialKeyThemes,
      tone_notes: project?.context?.tone_notes ?? "",
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        name: project?.name ?? "",
        product_description: project?.context?.product_description ?? "",
        target_audience: project?.context?.target_audience ?? "",
        key_themes: initialKeyThemes,
        tone_notes: project?.context?.tone_notes ?? "",
      });
      setColor(project?.color ?? PROJECT_COLORS[0]);
      setAdvancedOpen(false);
    }
  }, [open, project, reset, initialKeyThemes]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const context: ProjectContext = {};
      if (values.product_description?.trim())
        context.product_description = values.product_description.trim();
      if (values.target_audience?.trim())
        context.target_audience = values.target_audience.trim();
      if (values.key_themes?.trim()) {
        const arr = values.key_themes
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
        context.key_themes = arr.length > 0 ? arr : undefined;
      }
      if (values.tone_notes?.trim())
        context.tone_notes = values.tone_notes.trim();

      if (editing && project) {
        return updateProject(project.id, {
          name: values.name,
          color,
          context,
        });
      }
      return createProject({
        name: values.name,
        color,
        context,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success(editing ? "Project updated" : "Project created");
      onOpenChange(false);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : "Could not save project",
      ),
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
          <DialogTitle>
            {title ?? (editing ? "Edit project" : "New project")}
          </DialogTitle>
          <DialogDescription>
            Group canvases and knowledge under a single brand or initiative.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              placeholder="THE MONO"
              autoFocus
              {...register("name")}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-transform",
                    color === c
                      ? "border-foreground scale-110"
                      : "border-transparent hover:scale-105",
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Pick color ${c}`}
                />
              ))}
            </div>
          </div>

          <div className="rounded-md border border-border bg-card/40">
            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Advanced — describe your product/audience/themes for AI context
              {advancedOpen ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
            {advancedOpen && (
              <div className="space-y-3 border-t border-border px-3 py-3">
                <div className="space-y-1.5">
                  <Label htmlFor="project-product">
                    Product description{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Textarea
                    id="project-product"
                    rows={2}
                    placeholder="What's this project building?"
                    {...register("product_description")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="project-audience">
                    Target audience{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Textarea
                    id="project-audience"
                    rows={2}
                    placeholder="Who is the content for?"
                    {...register("target_audience")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="project-themes">
                    Key themes{" "}
                    <span className="text-muted-foreground">
                      (comma-separated)
                    </span>
                  </Label>
                  <Input
                    id="project-themes"
                    placeholder="founders, AI, marketplaces"
                    {...register("key_themes")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="project-tone">
                    Tone notes{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Textarea
                    id="project-tone"
                    rows={2}
                    placeholder="Voice notes specific to this project"
                    {...register("tone_notes")}
                  />
                </div>
              </div>
            )}
          </div>

          {mutation.error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              {mutation.error instanceof ApiError
                ? mutation.error.detail
                : "Could not save project."}
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
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />{" "}
                  {editing ? "Saving…" : "Creating…"}
                </>
              ) : editing ? (
                "Save"
              ) : (
                "Create project"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
