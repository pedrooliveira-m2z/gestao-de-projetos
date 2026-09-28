"use server";

import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractContractText, analyzeContractText, type ContractSuggestion } from "@/lib/contract-analysis";
import { Prisma } from "@prisma/client";

async function assertInternal() {
  const session = await auth();
  if (session?.user?.role === "CLIENT" || !session?.user) {
    throw new Error("Sem permissão.");
  }
}

const MAX_FILE_BYTES = 15 * 1024 * 1024;

export async function uploadContractAction(
  frontId: string,
  projectId: string,
  _prevState: { error: string | null; success: string | null },
  formData: FormData
): Promise<{ error: string | null; success: string | null }> {
  await assertInternal();

  const file = formData.get("contractFile");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo (PDF ou DOCX).", success: null };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { error: "Arquivo muito grande (máximo 15 MB).", success: null };
  }

  let buffer: Buffer;
  let text: string;
  try {
    buffer = Buffer.from(await file.arrayBuffer());
    text = await extractContractText(buffer, file.type, file.name);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Não foi possível ler o arquivo.",
      success: null,
    };
  }

  const blob = await put(`contracts/${frontId}-${Date.now()}-${file.name}`, buffer, {
    access: "public",
    contentType: file.type || undefined,
  });

  let suggestions: ContractSuggestion[] = [];
  let analysisError: string | null = null;
  try {
    suggestions = await analyzeContractText(text);
  } catch (err) {
    analysisError = err instanceof Error ? err.message : "Falha ao analisar o contrato.";
  }

  await prisma.front.update({
    where: { id: frontId },
    data: {
      contractFileUrl: blob.url,
      contractFileName: file.name,
      contractUploadedAt: new Date(),
      contractAnalysis: suggestions.length > 0 ? (suggestions as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      contractAnalyzedAt: suggestions.length > 0 ? new Date() : null,
    },
  });

  revalidatePath(`/admin/projects/${projectId}`);

  if (analysisError) {
    return {
      error: null,
      success: `Contrato salvo, mas a análise por IA falhou: ${analysisError}`,
    };
  }
  if (suggestions.length === 0) {
    return {
      error: null,
      success: "Contrato salvo. A IA não encontrou regras de prazo claras no texto.",
    };
  }
  return {
    error: null,
    success: `Contrato salvo. A IA sugeriu ${suggestions.length} regra(s) de prazo — revise abaixo antes de aplicar.`,
  };
}

export async function applyContractSuggestionsAction(
  projectId: string,
  frontId: string,
  formData: FormData
) {
  await assertInternal();

  const selectedIndexes = new Set(formData.getAll("selected").map(Number));
  const front = await prisma.front.findUnique({
    where: { id: frontId },
    select: { contractAnalysis: true },
  });
  const suggestions = (front?.contractAnalysis as unknown as ContractSuggestion[] | null) ?? [];
  const toApply = suggestions.filter((_, index) => selectedIndexes.has(index));

  if (toApply.length > 0) {
    const currentMax = await prisma.deliverable.count({ where: { frontId } });
    await prisma.deliverable.createMany({
      data: toApply.map((s, index) => ({
        frontId,
        name: s.name,
        ruleLabel: s.ruleLabel || null,
        kind: "BAR",
        triggerType: s.triggerType,
        slaDays: s.slaDays,
        slaDayType: s.slaDayType,
        isEstimated: s.isEstimated,
        hasApprovalWindow: s.hasApprovalWindow,
        approvalDays: s.approvalDays ?? 5,
        order: currentMax + index,
      })),
    });
  }

  await prisma.front.update({
    where: { id: frontId },
    data: { contractAnalysis: Prisma.JsonNull, contractAnalyzedAt: null },
  });

  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/gantt`);
}

export async function discardContractSuggestionsAction(projectId: string, frontId: string) {
  await assertInternal();
  await prisma.front.update({
    where: { id: frontId },
    data: { contractAnalysis: Prisma.JsonNull, contractAnalyzedAt: null },
  });
  revalidatePath(`/admin/projects/${projectId}`);
}
