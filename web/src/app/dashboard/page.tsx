"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Spinner } from "@/components/Spinner";
import { TaskCard } from "@/components/TaskCard";
import { TaskModal } from "@/components/TaskModal";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  STATUS_LABELS,
  TASK_STATUSES,
  type CreateTaskInput,
  type Task,
  type TaskStatus,
  type User,
} from "@/lib/schemas";

type Filter = "all" | TaskStatus;
type ModalState = { mode: "create" } | { mode: "edit"; task: Task } | null;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  ...TASK_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
];

export default function DashboardPage() {
  const { state, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (state.status === "anonymous") router.replace("/login");
  }, [state.status, router]);

  if (state.status !== "authenticated") return <Spinner />;
  return <Dashboard user={state.user} token={state.token} onLogout={logout} />;
}

function Dashboard({ user, token, onLogout }: { user: User; token: string; onLogout: () => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [toDelete, setToDelete] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Expired / invalid token -> log out; anything else -> readable message.
  const describeError = useCallback(
    (err: unknown): string => {
      if (err instanceof ApiError && err.status === 401) {
        onLogout();
        return "Your session has expired. Please log in again.";
      }
      return err instanceof Error ? err.message : "Something went wrong";
    },
    [onLogout],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    api
      .listTasks(token, filter === "all" ? undefined : filter)
      .then((list) => {
        if (!cancelled) setTasks(list);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(describeError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, filter, reloadKey, describeError]);

  async function handleSubmitTask(input: CreateTaskInput) {
    try {
      if (modal?.mode === "edit") {
        await api.updateTask(token, modal.task.id, input);
      } else {
        await api.createTask(token, input);
      }
      setModal(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      // Keep the modal open so it can display the error, while ensuring an
      // expired session is consistently cleared for every task mutation.
      describeError(err);
      throw err;
    }
  }

  async function handleStatusChange(task: Task, status: TaskStatus) {
    if (status === task.status) return;
    setActionError(null);
    setPendingId(task.id);
    try {
      const updated = await api.updateTask(token, task.id, { status });
      setTasks((prev) =>
        filter !== "all" && updated.status !== filter
          ? prev.filter((t) => t.id !== updated.id)
          : prev.map((t) => (t.id === updated.id ? updated : t)),
      );
    } catch (err) {
      setActionError(describeError(err));
    } finally {
      setPendingId(null);
    }
  }

  async function handleConfirmDelete() {
    if (!toDelete) return;
    setActionError(null);
    setDeleting(true);
    try {
      await api.deleteTask(token, toDelete.id);
      setTasks((prev) => prev.filter((t) => t.id !== toDelete.id));
      setToDelete(null);
    } catch (err) {
      setActionError(describeError(err));
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">BigLyp <span>Tasks</span></div>
          <div className="topbar-user">
            <span className="muted hide-sm">{user.name}</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onLogout}>
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="container">
        <div className="page-head">
          <div>
            <h1>Your tasks</h1>
            <p className="muted">Hi {user.name}, here&apos;s what&apos;s on your plate.</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setModal({ mode: "create" })}>
            + New task
          </button>
        </div>

        <div className="tabs" role="tablist" aria-label="Filter tasks by status">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={filter === f.value}
              className={`tab ${filter === f.value ? "tab-active" : ""}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {actionError && (
          <div className="alert alert-error" role="alert">
            {actionError}
            <button type="button" className="alert-close" aria-label="Dismiss" onClick={() => setActionError(null)}>
              ×
            </button>
          </div>
        )}

        {loading ? (
          <Spinner label="Loading tasks…" />
        ) : loadError ? (
          <div className="empty-state">
            <p className="alert alert-error">{loadError}</p>
            <button type="button" className="btn btn-primary" onClick={() => setReloadKey((k) => k + 1)}>
              Try again
            </button>
          </div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon" aria-hidden="true">📝</div>
            <h2>{filter === "all" ? "No tasks yet" : `No ${STATUS_LABELS[filter].toLowerCase()} tasks`}</h2>
            <p className="muted">
              {filter === "all"
                ? "Create your first task to get started."
                : "Nothing here right now. Try another filter or add a task."}
            </p>
            <button type="button" className="btn btn-primary" onClick={() => setModal({ mode: "create" })}>
              + New task
            </button>
          </div>
        ) : (
          <ul className="task-list">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                pending={pendingId === task.id}
                onStatusChange={handleStatusChange}
                onEdit={(t) => setModal({ mode: "edit", task: t })}
                onDelete={setToDelete}
              />
            ))}
          </ul>
        )}
      </main>

      {modal && (
        <TaskModal
          task={modal.mode === "edit" ? modal.task : null}
          onClose={() => setModal(null)}
          onSubmit={handleSubmitTask}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title="Delete this task?"
          message={`"${toDelete.title}" will be permanently deleted. This can't be undone.`}
          busy={deleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
