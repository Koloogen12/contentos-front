"use client";

/**
 * EditableText — small inline-edit primitive shared by ExtractNode and
 * FormatNode for Requirement B (editable text everywhere).
 *
 * UX:
 * - Read-mode: renders the value (or placeholder if empty) styled by the
 *   caller via `className` / `as`. Hovering shows a tiny pencil icon in the
 *   top-right corner; double-click swaps in the editor.
 * - Edit-mode: `<textarea>` (multiline) or `<input>` (single-line). Save on
 *   blur or Cmd/Ctrl+Enter; Esc cancels and restores the original value.
 *
 * Behaviour notes:
 * - `onSave` is awaited; while it's pending the editor stays open and the
 *   `co-edit-saving` modifier class is added so callers can tweak styles
 *   if they want.
 * - The ReactFlow node drag handle ignores anything inside `nodrag` — the
 *   wrapper carries that class so dragging doesn't fight the editor.
 * - Keystrokes are stopPropagation'd so canvas-level handlers (e.g.
 *   Backspace = delete node, Esc = reset tool) can't fire while editing.
 */

import * as React from "react";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EditableTextProps {
  value: string;
  onSave: (next: string) => Promise<void> | void;
  /** Render as a textarea instead of a single-line input. */
  multiline?: boolean;
  /** Visual className applied in BOTH read and edit modes (read mode is the
   *  outer span; edit mode is the input/textarea — both get the class so the
   *  swap stays visually consistent). */
  className?: string;
  /** Class for the read-only display only (e.g. line-clamp). */
  readClassName?: string;
  /** Class for the editor only (e.g. min-height for textarea). */
  editClassName?: string;
  /** Optional placeholder when value is empty. */
  placeholder?: string;
  /** Disable editing entirely (read-only flavors / public viewer). */
  disabled?: boolean;
  /** Custom rows for the textarea (multiline only). Default 4. */
  rows?: number;
  /** When true, the editor opens immediately on first render — used when
   *  the parent wants to programmatically pop into edit mode. */
  autoFocus?: boolean;
  /** ARIA label for the editor. */
  ariaLabel?: string;
}

export function EditableText({
  value,
  onSave,
  multiline,
  className,
  readClassName,
  editClassName,
  placeholder,
  disabled,
  rows = 4,
  autoFocus,
  ariaLabel,
}: EditableTextProps) {
  const [editing, setEditing] = React.useState(!!autoFocus);
  const [draft, setDraft] = React.useState(value);
  const [saving, setSaving] = React.useState(false);

  // Re-sync draft if `value` changes externally while we're not editing.
  React.useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const areaRef = React.useRef<HTMLTextAreaElement | null>(null);

  React.useEffect(() => {
    if (!editing) return;
    const el = multiline ? areaRef.current : inputRef.current;
    if (!el) return;
    el.focus();
    // Place caret at end.
    try {
      const len = el.value.length;
      el.setSelectionRange(len, len);
    } catch {
      /* some inputs (e.g. type=number) reject setSelectionRange — ignore */
    }
  }, [editing, multiline]);

  const cancel = React.useCallback(() => {
    setDraft(value);
    setEditing(false);
  }, [value]);

  const commit = React.useCallback(async () => {
    if (saving) return;
    const next = draft;
    if (next === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(next);
      setEditing(false);
    } catch {
      // The caller surfaces toasts on failure; keep the editor open so
      // the user can retry without losing their edits.
    } finally {
      setSaving(false);
    }
  }, [draft, value, onSave, saving]);

  if (disabled) {
    return (
      <span className={cn(className, readClassName)}>
        {value || placeholder || ""}
      </span>
    );
  }

  if (editing) {
    const sharedHandlers = {
      onKeyDown: (
        e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => {
        e.stopPropagation();
        if (e.key === "Escape") {
          e.preventDefault();
          cancel();
          return;
        }
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          void commit();
          return;
        }
        if (e.key === "Enter" && !multiline) {
          e.preventDefault();
          void commit();
        }
      },
      onBlur: () => {
        void commit();
      },
      onMouseDown: (
        e: React.MouseEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => {
        // Prevent ReactFlow node drag from stealing the focus.
        e.stopPropagation();
      },
      onClick: (
        e: React.MouseEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => {
        e.stopPropagation();
      },
    };

    if (multiline) {
      return (
        <textarea
          ref={areaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={rows}
          aria-label={ariaLabel}
          placeholder={placeholder}
          className={cn(
            "co-editable-textarea nodrag",
            saving && "co-edit-saving",
            className,
            editClassName,
          )}
          {...sharedHandlers}
        />
      );
    }
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        aria-label={ariaLabel}
        placeholder={placeholder}
        className={cn(
          "co-editable-input nodrag",
          saving && "co-edit-saving",
          className,
          editClassName,
        )}
        {...sharedHandlers}
      />
    );
  }

  return (
    <span
      className={cn("co-editable-readwrap nodrag", className)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      onMouseDown={(e) => e.stopPropagation()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setEditing(true);
        }
      }}
    >
      <span className={cn(readClassName)}>
        {value.length > 0 ? value : placeholder ?? ""}
      </span>
      <Pencil
        size={11}
        className="co-editable-pencil"
        aria-hidden="true"
      />
    </span>
  );
}
