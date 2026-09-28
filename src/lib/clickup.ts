// Thin server-side client for the ClickUp REST API (v2).
// The API token is stored in the Setting table (configured from /admin/clickup) so it can be
// managed from the site itself; CLICKUP_API_TOKEN in the environment is used as a fallback for
// local development.

import { prisma } from "./prisma";

const CLICKUP_API_BASE = "https://api.clickup.com/api/v2";
const TOKEN_SETTING_KEY = "clickup_api_token";
const CLIENTS_LIST_SETTING_KEY = "clickup_clients_list_id";

export interface ClickupTask {
  id: string;
  name: string;
  status: { status: string; color: string; type: string };
  due_date: string | null;
  url: string;
  list: { id: string; name: string };
}

export interface ClickupTeam {
  id: string;
  name: string;
}

export interface ClickupSpace {
  id: string;
  name: string;
}

export interface ClickupFolder {
  id: string;
  name: string;
}

export interface ClickupList {
  id: string;
  name: string;
}

export async function getClickupToken(): Promise<string | null> {
  const setting = await prisma.setting.findUnique({ where: { key: TOKEN_SETTING_KEY } });
  return setting?.value || process.env.CLICKUP_API_TOKEN || null;
}

export async function saveClickupToken(token: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key: TOKEN_SETTING_KEY },
    update: { value: token },
    create: { key: TOKEN_SETTING_KEY, value: token },
  });
}

export async function clearClickupToken(): Promise<void> {
  await prisma.setting.deleteMany({ where: { key: TOKEN_SETTING_KEY } });
}

/** ID of a ClickUp list whose task names are used to suggest client names when creating a project. */
export async function getClientsListId(): Promise<string | null> {
  const setting = await prisma.setting.findUnique({ where: { key: CLIENTS_LIST_SETTING_KEY } });
  return setting?.value || null;
}

export async function saveClientsListId(listId: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key: CLIENTS_LIST_SETTING_KEY },
    update: { value: listId },
    create: { key: CLIENTS_LIST_SETTING_KEY, value: listId },
  });
}

/**
 * Names of active clients tracked in the ClickUp clients list, for autocomplete — fetched live,
 * never cached. Only tasks whose ClickUp status is "ativo" count as a client record; everything
 * else in that list is an operational sub-task (ex: "[Cliente] Ajuste site").
 */
export async function listClickupClientNames(): Promise<string[]> {
  const token = await getClickupToken();
  const listId = await getClientsListId();
  if (!token || !listId) return [];
  const tasks = await listTasksInList(token, listId, { statuses: ["ativo"] }).catch(
    () => [] as ClickupTask[]
  );
  const names = tasks
    .filter((t) => t.status.status.toLowerCase() === "ativo")
    .map((t) => t.name);
  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

async function clickupFetch<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${CLICKUP_API_BASE}${path}`, {
    headers: { Authorization: token },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ClickUp API ${path} -> ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export async function getAuthorizedUser(
  token: string
): Promise<{ id: number; username: string; email: string }> {
  const data = await clickupFetch<{ user: { id: number; username: string; email: string } }>(
    "/user",
    token
  );
  return data.user;
}

export async function listTeams(token: string): Promise<ClickupTeam[]> {
  const data = await clickupFetch<{ teams: ClickupTeam[] }>("/team", token);
  return data.teams;
}

export async function listSpaces(token: string, teamId: string): Promise<ClickupSpace[]> {
  const data = await clickupFetch<{ spaces: ClickupSpace[] }>(
    `/team/${teamId}/space?archived=false`,
    token
  );
  return data.spaces;
}

export async function listFolders(token: string, spaceId: string): Promise<ClickupFolder[]> {
  const data = await clickupFetch<{ folders: ClickupFolder[] }>(
    `/space/${spaceId}/folder?archived=false`,
    token
  );
  return data.folders;
}

export async function listFolderlessLists(token: string, spaceId: string): Promise<ClickupList[]> {
  const data = await clickupFetch<{ lists: ClickupList[] }>(
    `/space/${spaceId}/list?archived=false`,
    token
  );
  return data.lists;
}

export async function listListsInFolder(token: string, folderId: string): Promise<ClickupList[]> {
  const data = await clickupFetch<{ lists: ClickupList[] }>(
    `/folder/${folderId}/list?archived=false`,
    token
  );
  return data.lists;
}

export async function listTasksInList(
  token: string,
  listId: string,
  options?: { statuses?: string[] }
): Promise<ClickupTask[]> {
  const all: ClickupTask[] = [];
  let page = 0;
  // ClickUp paginates at 100 tasks per page; keep pulling until the list is exhausted.
  for (;;) {
    const params = new URLSearchParams({
      include_closed: "true",
      subtasks: "false",
      page: String(page),
    });
    for (const status of options?.statuses ?? []) {
      params.append("statuses[]", status);
    }
    const data = await clickupFetch<{ tasks: ClickupTask[] }>(
      `/list/${listId}/task?${params.toString()}`,
      token
    );
    all.push(...data.tasks);
    if (data.tasks.length < 100) break;
    page += 1;
  }
  return all;
}

export async function getTask(taskId: string, token: string): Promise<ClickupTask> {
  return clickupFetch<ClickupTask>(`/task/${taskId}`, token);
}

export async function getTasks(taskIds: string[]): Promise<Map<string, ClickupTask>> {
  const token = await getClickupToken();
  const map = new Map<string, ClickupTask>();
  if (!token || taskIds.length === 0) return map;

  const results = await Promise.allSettled(taskIds.map((id) => getTask(id, token)));
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
