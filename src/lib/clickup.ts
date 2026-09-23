// Thin server-side client for the ClickUp REST API (v2).
// Requires CLICKUP_API_TOKEN in the environment (Settings > Apps > API Token in ClickUp).

const CLICKUP_API_BASE = "https://api.clickup.com/api/v2";

export interface ClickupTask {
  id: string;
  name: string;
  status: { status: string; color: string; type: string };
  due_date: string | null;
  url: string;
  list: { id: string; name: string };
}

function getToken(): string {
  const token = process.env.CLICKUP_API_TOKEN;
  if (!token) {
    throw new Error(
      "CLICKUP_API_TOKEN não configurado. Defina essa variável de ambiente com um token pessoal do ClickUp."
    );
  }
  return token;
}

async function clickupFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${CLICKUP_API_BASE}${path}`, {
    headers: { Authorization: getToken() },
    // ClickUp task status changes frequently; never cache stale data.
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ClickUp API ${path} -> ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export async function getTask(taskId: string): Promise<ClickupTask> {
  return clickupFetch<ClickupTask>(`/task/${taskId}`);
}

export async function getTasks(taskIds: string[]): Promise<Map<string, ClickupTask>> {
  const results = await Promise.allSettled(taskIds.map((id) => getTask(id)));
  const map = new Map<string, ClickupTask>();
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      map.set(taskIds[index], result.value);
    }
  });
  return map;
}

export function toDueDate(task: ClickupTask): Date | null {
  return task.due_date ? new Date(Number(task.due_date)) : null;
}
