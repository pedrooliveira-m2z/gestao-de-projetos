"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { PanelNoteStatus } from "@prisma/client";

async function assertInternal() {
  const session = await auth();
  if (session?.user?.role === "CLIENT" || !session?.user) {
    throw new Error("Sem permissão.");
  }
}

export async function addPanelNoteAction(projectId: string, formData: FormData) {
  await assertInternal();
  const label = String(formData.get("label") ?? "").trim();
  if (!label) throw new Error("Rótulo é obrigatório.");

  const count = await prisma.panelNote.count({ where: { projectId } });
  await prisma.panelNote.create({
    data: {
      projectId,
      label,
      ruleText: String(formData.get("ruleText") ?? "").trim() || null,
      dateText: String(formData.get("dateText") ?? "").trim() || null,
      statusText: String(formData.get("statusText") ?? "").trim() || null,
      status: (String(formData.get("status") ?? "EM_DIA") as PanelNoteStatus),
      order: count,
    },
  });
  revalidatePath(`/projects/${projectId}`);
}

export async function updatePanelNoteAction(
  projectId: string,
  noteId: string,
  data: {
    label: string;
    ruleText: string | null;
    dateText: string | null;
    statusText: string | null;
    status: PanelNoteStatus;
  }
) {
  await assertInternal();
  if (!data.label.trim()) throw new Error("Rótulo é obrigatório.");
  await prisma.panelNote.update({
    where: { id: noteId },
    data: {
      label: data.label.trim(),
      ruleText: data.ruleText?.trim() || null,
      dateText: data.dateText?.trim() || null,
      statusText: data.statusText?.trim() || null,
      status: data.status,
    },
  });
  revalidatePath(`/projects/${projectId}`);
}

export async function deletePanelNoteAction(projectId: string, noteId: string) {
  await assertInternal();
  await prisma.panelNote.delete({ where: { id: noteId } });
  revalidatePath(`/projects/${projectId}`);
}
