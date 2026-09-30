"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import type { DayType, DeliverableKind, TriggerType } from "@prisma/client";

async function assertInternal() {
  const session = await auth();
  if (session?.user?.role === "CLIENT" || !session?.user) {
    throw new Error("Sem permissão.");
  }
}

async function assertAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Só administradores podem fazer isso.");
  }
}

export async function createProjectAction(formData: FormData) {
  await assertInternal();

  let clientId = String(formData.get("clientId") ?? "");
  const newClientName = String(formData.get("newClientName") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const briefingDate = new Date(String(formData.get("briefingDate")));

  if (clientId === "__new__" || (!clientId && newClientName)) {
    if (!newClientName) throw new Error("Informe o nome do novo cliente.");
    const client = await prisma.client.create({
      data: { name: newClientName, slug: slugify(newClientName) },
    });
    clientId = client.id;
  }

  if (!clientId || !name) throw new Error("Cliente e nome do projeto são obrigatórios.");

  const project = await prisma.project.create({
    data: {
      clientId,
      name,
      slug: `${slugify(name)}-${Date.now().toString(36)}`,
      briefingDate,
      cutoffDate: new Date(),
    },
  });

  revalidatePath("/admin");
  redirect(`/admin/projects/${project.id}`);
}

export async function deleteClientAction(clientId: string) {
  await assertAdmin();
  await prisma.client.delete({ where: { id: clientId } });
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

export async function updateCutoffAction(projectId: string, formData: FormData) {
  await assertInternal();
  const cutoffDate = new Date(String(formData.get("cutoffDate")));
  await prisma.project.update({ where: { id: projectId }, data: { cutoffDate } });
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/gantt`);
}

export async function addFrontAction(projectId: string, formData: FormData) {
  await assertInternal();
  const name = String(formData.get("name") ?? "").trim();
  const vendorName = String(formData.get("vendorName") ?? "").trim();
  const colorHex = String(formData.get("colorHex") ?? "#2563eb");
  if (!name || !vendorName) throw new Error("Nome e responsável são obrigatórios.");

  const count = await prisma.front.count({ where: { projectId } });
  await prisma.front.create({
    data: { projectId, name, vendorName, colorHex, order: count },
  });
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/gantt`);
}

export async function deleteFrontAction(projectId: string, frontId: string) {
  await assertInternal();
  await prisma.front.delete({ where: { id: frontId } });
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/gantt`);
}

function parseOptionalDate(value: FormDataEntryValue | null): Date | null {
  const str = String(value ?? "").trim();
  return str ? new Date(str) : null;
}

function parseOptionalInt(value: FormDataEntryValue | null): number | null {
  const str = String(value ?? "").trim();
  return str ? Number(str) : null;
}

export async function addDeliverableAction(projectId: string, frontId: string, formData: FormData) {
  await assertInternal();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Nome da entrega é obrigatório.");

  const count = await prisma.deliverable.count({ where: { frontId } });

  await prisma.deliverable.create({
    data: {
      frontId,
      name,
      ruleLabel: String(formData.get("ruleLabel") ?? "") || null,
      kind: (String(formData.get("kind") ?? "BAR") as DeliverableKind),
      triggerType: (String(formData.get("triggerType") ?? "MANUAL") as TriggerType),
      triggerDate: parseOptionalDate(formData.get("triggerDate")),
      slaDays: parseOptionalInt(formData.get("slaDays")),
      slaDayType: (String(formData.get("slaDayType") ?? "UTEIS") as DayType),
      isEstimated: formData.get("isEstimated") === "on",
      startDateOverride: parseOptionalDate(formData.get("startDateOverride")),
      endDateOverride: parseOptionalDate(formData.get("endDateOverride")),
      clickupTaskId: String(formData.get("clickupTaskId") ?? "") || null,
      manualStatusLabel: String(formData.get("manualStatusLabel") ?? "") || null,
      hasApprovalWindow: formData.get("hasApprovalWindow") === "on",
      approvalDays: parseOptionalInt(formData.get("approvalDays")) ?? 5,
      approvalColorHex:
        formData.get("hasApprovalWindow") === "on"
          ? String(formData.get("approvalColorHex") ?? "") || null
          : null,
      colorHexOverride:
        formData.get("hasColorOverride") === "on"
          ? String(formData.get("colorHexOverride") ?? "") || null
          : null,
      order: count,
    },
  });

  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/gantt`);
}

export async function deleteDeliverableAction(projectId: string, deliverableId: string) {
  await assertInternal();
  await prisma.deliverable.delete({ where: { id: deliverableId } });
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/gantt`);
}

export async function updateDeliverableNameAction(
  projectId: string,
  deliverableId: string,
  name: string
) {
  await assertInternal();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Nome da entrega não pode ficar vazio.");
  await prisma.deliverable.update({ where: { id: deliverableId }, data: { name: trimmed } });
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/gantt`);
}

export async function updateDeliverableRuleLabelAction(
  projectId: string,
  deliverableId: string,
  ruleLabel: string | null
) {
  await assertInternal();
  await prisma.deliverable.update({
    where: { id: deliverableId },
    data: { ruleLabel: ruleLabel?.trim() || null },
  });
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/gantt`);
}

export async function addDeliverableMarkAction(projectId: string, deliverableId: string, date: string) {
  await assertInternal();
  const start = new Date(date);
  const end = new Date(date);
  end.setUTCDate(end.getUTCDate() + 1);
  await prisma.deliverableMark.create({ data: { deliverableId, startDate: start, endDate: end } });
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/gantt`);
}

export async function updateDeliverableMarkDatesAction(
  projectId: string,
  markId: string,
  data: { startDate?: string; endDate?: string }
) {
  await assertInternal();
  const updateData: { startDate?: Date; endDate?: Date } = {};
  if (data.startDate) updateData.startDate = new Date(data.startDate);
  if (data.endDate) updateData.endDate = new Date(data.endDate);
  await prisma.deliverableMark.update({ where: { id: markId }, data: updateData });
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/gantt`);
}

export async function deleteDeliverableMarkAction(projectId: string, markId: string) {
  await assertInternal();
  await prisma.deliverableMark.delete({ where: { id: markId } });
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/gantt`);
}

export async function updateDeliverableStatusLabelAction(
  projectId: string,
  deliverableId: string,
  statusLabel: string | null
) {
  await assertInternal();
  await prisma.deliverable.update({
    where: { id: deliverableId },
    data: { manualStatusLabel: statusLabel?.trim() || null },
  });
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/gantt`);
}

export async function reorderDeliverablesAction(
  projectId: string,
  frontId: string,
  orderedDeliverableIds: string[]
) {
  await assertInternal();
  await prisma.$transaction(
    orderedDeliverableIds.map((id, order) =>
      prisma.deliverable.updateMany({ where: { id, frontId }, data: { order } })
    )
  );
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/gantt`);
}

export async function updateDeliverableDatesAction(
  projectId: string,
  deliverableId: string,
  data: { startDateOverride?: string | null; endDateOverride?: string | null }
) {
  await assertInternal();
  const updateData: { startDateOverride?: Date | null; endDateOverride?: Date | null } = {};
  if ("startDateOverride" in data) {
    updateData.startDateOverride = data.startDateOverride ? new Date(data.startDateOverride) : null;
  }
  if ("endDateOverride" in data) {
    updateData.endDateOverride = data.endDateOverride ? new Date(data.endDateOverride) : null;
  }
  await prisma.deliverable.update({ where: { id: deliverableId }, data: updateData });
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/gantt`);
}

export async function updateDeliverableApprovalWindowAction(
  projectId: string,
  deliverableId: string,
  data: { approvalStartOverride?: string | null; approvalEndOverride?: string | null }
) {
  await assertInternal();
  const updateData: { approvalStartOverride?: Date | null; approvalEndOverride?: Date | null } = {};
  if ("approvalStartOverride" in data) {
    updateData.approvalStartOverride = data.approvalStartOverride
      ? new Date(data.approvalStartOverride)
      : null;
  }
  if ("approvalEndOverride" in data) {
    updateData.approvalEndOverride = data.approvalEndOverride ? new Date(data.approvalEndOverride) : null;
  }
  await prisma.deliverable.update({ where: { id: deliverableId }, data: updateData });
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/gantt`);
}

export async function updateDeliverableApprovalColorAction(
  projectId: string,
  deliverableId: string,
  formData: FormData
) {
  await assertInternal();
  const approvalColorHex = String(formData.get("approvalColorHex") ?? "").trim();
  await prisma.deliverable.update({
    where: { id: deliverableId },
    data: { approvalColorHex: approvalColorHex || null },
  });
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/gantt`);
}

export async function updateDeliverableColorAction(
  projectId: string,
  deliverableId: string,
  formData: FormData
) {
  await assertInternal();
  const colorHexOverride = String(formData.get("colorHexOverride") ?? "").trim();
  await prisma.deliverable.update({
    where: { id: deliverableId },
    // Empty string means "clear the override and fall back to the front's color".
    data: { colorHexOverride: colorHexOverride || null },
  });
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/gantt`);
}
