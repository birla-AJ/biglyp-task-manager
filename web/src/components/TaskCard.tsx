"use client";

import { formatDue, isOverdue } from "@/lib/date";
import { STATUS_LABELS, TASK_STATUSES, type Task, type TaskStatus } from "@/lib/schemas";

type Props = {
  task: Task;
  pending: boolean;
  onStatusChange: (task: Task, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
};

export function TaskCard({ task, pending, onStatusChange, onEdit, onDelete }: Props) {
  const overdue = task.due_date !== null && task.status !== "done" && isOverdue(task.due_date);

  return (
    <li className={`task-card ${pending ? "is-pending" : ""}`}>
      <div className="task-main">
        <h3 className={task.status === "done" ? "done-title" : ""}>{task.title}</h3>
        {task.description && <p className="task-desc">{task.description}</p>}
        <div className="task-meta">
          <span className={`badge badge-${task.status}`}>{STATUS_LABELS[task.status]}</span>
          {task.due_date !== null && (
            <span className={`due ${overdue ? "due-overdue" : ""}`}>
              {overdue ? "Overdue · " : "Due "}
              {formatDue(task.due_date)}
            </span>
          )}
        </div>
      </div>

      <div className="task-actions">
        <select
          aria-label={`Change status of ${task.title}`}
          value={task.status}
          disabled={pending}
          onChange={(e) => onStatusChange(task, e.target.value as TaskStatus)}
        >
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onEdit(task)} disabled={pending}>
          Edit
        </button>
        <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => onDelete(task)} disabled={pending}>
          Delete
        </button>
      </div>
    </li>
  );
}
