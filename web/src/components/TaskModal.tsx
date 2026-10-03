"use client";

import { useState, type FormEvent } from "react";
import { dateInputToUnix, unixToDateInput } from "@/lib/date";
import {
  STATUS_LABELS,
  TASK_STATUSES,
  taskFormSchema,
  toFieldErrors,
  type CreateTaskInput,
  type FieldErrors,
  type Task,
  type TaskStatus,
} from "@/lib/schemas";

type FormValues = { title: string; description: string; status: TaskStatus; dueDate: string };

type Props = {
  /** null = create mode, Task = edit mode */
  task: Task | null;
  onClose: () => void;
  onSubmit: (input: CreateTaskInput) => Promise<void>;
};

export function TaskModal({ task, onClose, onSubmit }: Props) {
  const [values, setValues] = useState<FormValues>({
    title: task?.title ?? "",
    description: task?.description ?? "",
    status: task?.status ?? "todo",
    dueDate: unixToDateInput(task?.due_date ?? null),
  });
  const [errors, setErrors] = useState<FieldErrors<FormValues>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const parsed = taskFormSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      return;
    }
    setErrors({});

    const { title, description, status, dueDate } = parsed.data;
    setSubmitting(true);
    try {
      await onSubmit({
        title,
        description: description === "" ? null : description,
        status,
        due_date: dueDate === "" ? null : dateInputToUnix(dueDate),
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <div className="overlay" role="presentation" onClick={submitting ? undefined : onClose}>
      <form
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        noValidate
      >
        <h2 id="task-modal-title">{task ? "Edit task" : "New task"}</h2>

        {submitError && <div className="alert alert-error" role="alert">{submitError}</div>}

        <label className="field">
          <span>Title</span>
          <input
            type="text"
            value={values.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="What needs to be done?"
            autoFocus
          />
          {errors.title && <small className="field-error">{errors.title}</small>}
        </label>

        <label className="field">
          <span>Description <em>(optional)</em></span>
          <textarea
            rows={3}
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Add some details…"
          />
          {errors.description && <small className="field-error">{errors.description}</small>}
        </label>

        <div className="field-row">
          <label className="field">
            <span>Status</span>
            <select value={values.status} onChange={(e) => set("status", e.target.value as TaskStatus)}>
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Due date <em>(optional)</em></span>
            <input type="date" value={values.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
            {errors.dueDate && <small className="field-error">{errors.dueDate}</small>}
          </label>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Saving…" : task ? "Save changes" : "Create task"}
          </button>
        </div>
      </form>
    </div>
  );
}
