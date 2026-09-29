import type { Deliverable, DeliverableKind, DayType, TriggerType } from "@prisma/client";
import { addBusinessDays, addCalendarDays } from "./business-days";

export type DeliverableStatus =
  | "CONCLUIDO"
  | "EM_DIA"
  | "ATRASO_OPERACIONAL"
  | "ATRASO_CONTRATUAL"
  | "A_FAZER";

export const STATUS_LABEL: Record<DeliverableStatus, string> = {
  CONCLUIDO: "Concluído",
  EM_DIA: "Em dia",
  ATRASO_OPERACIONAL: "Atraso operacional",
  ATRASO_CONTRATUAL: "Atraso contratual",
  A_FAZER: "A fazer",
};

/** Minimal shape of a live ClickUp task snapshot used to derive real-world status. */
export interface ClickupSnapshot {
  status: string;
  dueDate: Date | null;
  doneStatuses?: string[];
}

export interface DeliverableTimeline {
  triggerDate: Date | null;
  deadline: Date | null;
  /** True when `deadline` comes from an actual SLA rule (gatilho + prazo), not just a manual/ClickUp date. */
  isContractualDeadline: boolean;
  ganttStart: Date | null;
  ganttEnd: Date | null;
  approvalWindowStart: Date | null;
  approvalWindowEnd: Date | null;
  status: DeliverableStatus;
  statusLabel: string;
  isEstimatedDate: boolean;
}

export interface ProjectTriggers {
  briefingDate: Date;
  /** Optional per-front manual trigger dates for KICKOFF / CONDICOES_INICIO / MARCO_CICLO */
  frontTriggerDate?: Date | null;
}

function resolveTriggerDate(
  triggerType: TriggerType,
  manualTriggerDate: Date | null,
  projectTriggers: ProjectTriggers
): Date | null {
  switch (triggerType) {
    case "BRIEFING":
      return projectTriggers.briefingDate;
    case "KICKOFF":
    case "CONDICOES_INICIO":
    case "MARCO_CICLO":
      return manualTriggerDate ?? projectTriggers.frontTriggerDate ?? null;
    case "MANUAL":
      return manualTriggerDate;
    case "CLICKUP_ONLY":
    default:
      return null;
  }
}

function addSlaDays(from: Date, days: number, dayType: DayType): Date {
  return dayType === "UTEIS" ? addBusinessDays(from, days) : addCalendarDays(from, days);
}

export function computeDeliverableTimeline(
  deliverable: Pick<
    Deliverable,
    | "kind"
    | "triggerType"
    | "triggerDate"
    | "slaDays"
    | "slaDayType"
    | "isEstimated"
    | "startDateOverride"
    | "endDateOverride"
    | "hasApprovalWindow"
    | "approvalDays"
    | "approvalStartOverride"
    | "approvalEndOverride"
    | "manualStatusLabel"
  >,
  projectTriggers: ProjectTriggers,
  cutoffDate: Date,
  clickup: ClickupSnapshot | null
): DeliverableTimeline {
  const triggerDate = resolveTriggerDate(
    deliverable.triggerType,
    deliverable.triggerDate,
    projectTriggers
  );

  // Só é "prazo contratual" quando existe uma regra de SLA de verdade (gatilho + nº de dias).
  // Uma data manual (endDateOverride) sem gatilho/SLA é apenas uma referência operacional
  // (ex: vencimento espelhado do ClickUp), e não deve contar como atraso contratual.
  const slaDeadline =
    triggerDate && deliverable.slaDays != null
      ? addSlaDays(triggerDate, deliverable.slaDays, deliverable.slaDayType)
      : null;
  const isContractualDeadline = slaDeadline != null;
  const deadline = deliverable.endDateOverride ?? slaDeadline;

  const ganttStart = deliverable.startDateOverride ?? triggerDate ?? null;
  const ganttEnd = deadline ?? (clickup?.dueDate ?? null) ?? ganttStart;

  const approvalWindowStart = deliverable.hasApprovalWindow
    ? (deliverable.approvalStartOverride ??
      (ganttEnd ? addBusinessDays(ganttEnd, -deliverable.approvalDays) : null))
    : null;
  const approvalWindowEnd = deliverable.hasApprovalWindow
    ? (deliverable.approvalEndOverride ?? ganttEnd)
    : null;

  const doneStatuses = clickup?.doneStatuses ?? ["concluído", "concluido", "done", "closed"];
  // Sem tarefa do ClickUp vinculada, o único sinal de conclusão disponível é a situação manual
  // cadastrada (ex: "concluído"). Com ClickUp vinculado, a situação real do ClickUp manda.
  const isDone = clickup
    ? doneStatuses.includes(clickup.status.toLowerCase())
    : doneStatuses.includes((deliverable.manualStatusLabel ?? "").toLowerCase());

  // Referência operacional: vencimento real no ClickUp, ou (se não há SLA contratual) a data
  // manual cadastrada, que nesse caso só representa um prazo operacional.
  const operationalDueDate =
    clickup?.dueDate ?? (!isContractualDeadline ? deliverable.endDateOverride ?? null : null);

  let status: DeliverableStatus;
  if (isDone) {
    status = "CONCLUIDO";
  } else if (isContractualDeadline && deadline && deadline < cutoffDate) {
    // Passou do prazo contratual calculado a partir do gatilho, sem sinal de conclusão.
    status = "ATRASO_CONTRATUAL";
  } else if (operationalDueDate && operationalDueDate < cutoffDate) {
    // Venceu no ClickUp (ou na data operacional cadastrada) e ainda não foi concluído.
    status = "ATRASO_OPERACIONAL";
  } else if (ganttStart && ganttStart > cutoffDate) {
    status = "A_FAZER";
  } else {
    status = "EM_DIA";
  }

  return {
    triggerDate,
    deadline,
    isContractualDeadline,
    ganttStart,
    ganttEnd,
    approvalWindowStart,
    approvalWindowEnd,
    status,
    statusLabel: deliverable.manualStatusLabel ?? STATUS_LABEL[status],
    isEstimatedDate: deliverable.isEstimated,
  };
}

export function summarizeProjectStatus(timelines: DeliverableTimeline[]) {
  const hasContractualDelay = timelines.some((t) => t.status === "ATRASO_CONTRATUAL");
  const operationalDelays = timelines.filter((t) => t.status === "ATRASO_OPERACIONAL");
  return { hasContractualDelay, operationalDelays };
}

export type { DeliverableKind };
