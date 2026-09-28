"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  clearClickupToken,
  getAuthorizedUser,
  getClickupToken,
  listTasksInList,
  saveClickupToken,
} from "@/lib/clickup";

async function assertInternal() {
  const session = await auth();
  if (session?.user?.role === "CLIENT" || !session?.user) {
    throw new Error("Sem permissão.");
  }
}

export async function saveClickupTokenAction(
  _prevState: { error: string | null; success: string | null },
  formData: FormData
): Promise<{ error: string | null; success: string | null }> {
  await assertInternal();
  const token = String(formData.get("token") ?? "").trim();
  if (!token) return { error: "Informe o token.", success: null };

  try {
    const user = await getAuthorizedUser(token);
    await saveClickupToken(token);
    revalidatePath("/admin/clickup");
    return { error: null, success: `Conectado como ${user.username} (${user.email}).` };
  } catch {
    return { error: "Token inválido ou sem permissão. Confira em ClickUp → Configurações → Apps.", success: null };
  }
}

export async function disconnectClickupAction() {
  await assertInternal();
  await clearClickupToken();
  revalidatePath("/admin/clickup");
}

export async function importClickupListAction(
  projectId: string,
  frontId: string,
  formData: FormData
) {
  await assertInternal();
  const listId = String(formData.get("listId") ?? "").trim();
  if (!listId) throw new Error("Informe o ID da lista do ClickUp.");

  const token = await getClickupToken();
  if (!token) throw new Error("Conecte o ClickUp antes de importar.");

  const tasks = await listTasksInList(token, listId);
  const existing = await prisma.deliverable.findMany({
    where: { frontId, clickupTaskId: { not: null } },
    select: { id: true, clickupTaskId: true },
  });
  const existingByTaskId = new Map(existing.map((d) => [d.clickupTaskId, d.id]));

  const currentMax = await prisma.deliverable.count({ where: { frontId } });

  await prisma.$transaction([
    prisma.front.update({ where: { id: frontId }, data: { clickupListId: listId } }),
    ...tasks.map((task, index) => {
      const existingId = existingByTaskId.get(task.id);
      if (existingId) {
        return prisma.deliverable.update({
          where: { id: existingId },
          data: { name: task.name },
        });
      }
      return prisma.deliverable.create({
        data: {
          frontId,
          name: task.name,
          kind: "BAR",
          triggerType: "CLICKUP_ONLY",
          clickupTaskId: task.id,
          order: currentMax + index,
        },
      });
    }),
  ]);

  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/gantt`);
}
