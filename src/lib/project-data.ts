import { prisma } from "./prisma";
import { getTasks, toDueDate, type ClickupTask } from "./clickup";
import {
  computeDeliverableTimeline,
  type ClickupSnapshot,
  type DeliverableStatus,
} from "./sla";

export interface DeliverableView {
  id: string;
  name: string;
  ruleLabel: string | null;
  kind: "BAR" | "MILESTONE";
  colorHex: string;
  colorHexOverride: string | null;
  status: DeliverableStatus;
  statusLabel: string;
  situacaoClickup: string | null;
  triggerDate: Date | null;
  deadline: Date | null;
  isContractualDeadline: boolean;
  ganttStart: Date | null;
  ganttEnd: Date | null;
  approvalWindowStart: Date | null;
  approvalWindowEnd: Date | null;
  hasApprovalWindow: boolean;
  approvalColorHex: string;
  isEstimated: boolean;
  clickupUrl: string | null;
}

export interface FrontView {
  id: string;
  name: string;
  vendorName: string;
  colorHex: string;
  deliverables: DeliverableView[];
}

export interface ProjectView {
  id: string;
  name: string;
  slug: string;
  clientName: string;
  briefingDate: Date;
  cutoffDate: Date;
  fronts: FrontView[];
}

export async function loadProjectView(projectId: string): Promise<ProjectView | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client: true,
      fronts: {
        orderBy: { order: "asc" },
        include: { deliverables: { orderBy: { order: "asc" } } },
      },
    },
  });
  if (!project) return null;

  const cutoffDate = project.cutoffDate ?? new Date();

  const taskIds = project.fronts
    .flatMap((f) => f.deliverables)
    .map((d) => d.clickupTaskId)
    .filter((id): id is string => !!id);

  const clickupTasksRaw =
    taskIds.length > 0
      ? await getTasks(taskIds).catch(() => new Map<string, ClickupTask>())
      : new Map<string, ClickupTask>();
  const clickupMap: Map<string, ClickupSnapshot> = new Map(
    Array.from(clickupTasksRaw.entries()).map(([id, task]) => [
      id,
      { status: task.status.status, dueDate: toDueDate(task) },
    ])
  );

  const fronts: FrontView[] = project.fronts.map((front) => ({
    id: front.id,
    name: front.name,
    vendorName: front.vendorName,
    colorHex: front.colorHex,
    deliverables: front.deliverables.map((d) => {
      const clickupSnapshot = d.clickupTaskId ? clickupMap.get(d.clickupTaskId) ?? null : null;
      const timeline = computeDeliverableTimeline(
        d,
        { briefingDate: project.briefingDate },
        cutoffDate,
        clickupSnapshot
      );
      const rawTask = d.clickupTaskId ? clickupTasksRaw.get(d.clickupTaskId) : undefined;
      return {
        id: d.id,
        name: d.name,
        ruleLabel: d.ruleLabel,
        kind: d.kind,
        colorHex: d.colorHexOverride ?? front.colorHex,
        colorHexOverride: d.colorHexOverride,
        status: timeline.status,
        statusLabel: timeline.statusLabel,
        situacaoClickup: clickupSnapshot?.status ?? d.manualStatusLabel ?? null,
        triggerDate: timeline.triggerDate,
        deadline: timeline.deadline,
        isContractualDeadline: timeline.isContractualDeadline,
        ganttStart: timeline.ganttStart,
        ganttEnd: timeline.ganttEnd,
        approvalWindowStart: timeline.approvalWindowStart,
        approvalWindowEnd: timeline.approvalWindowEnd,
        hasApprovalWindow: d.hasApprovalWindow,
        approvalColorHex: d.approvalColorHex ?? "#9ca3af",
        isEstimated: timeline.isEstimatedDate,
        clickupUrl: rawTask?.url ?? null,
      };
    }),
  }));

  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    clientName: project.client.name,
    briefingDate: project.briefingDate,
    cutoffDate,
    fronts,
  };
}

export function nextOperationalDeadline(view: ProjectView) {
  const all = view.fronts.flatMap((f) => f.deliverables);
  const upcoming = all
    .filter((d) => d.ganttEnd && d.ganttEnd >= view.cutoffDate && d.status !== "CONCLUIDO")
    .sort((a, b) => a.ganttEnd!.getTime() - b.ganttEnd!.getTime());
  return upcoming[0] ?? null;
}

export function nextContractualDeadline(view: ProjectView) {
  const all = view.fronts.flatMap((f) => f.deliverables);
  const upcoming = all
    .filter(
      (d) =>
        d.isContractualDeadline &&
        d.deadline &&
        d.deadline >= view.cutoffDate &&
        d.status !== "CONCLUIDO"
    )
    .sort((a, b) => a.deadline!.getTime() - b.deadline!.getTime());
  return upcoming[0] ?? null;
}

export function listOperationalAttention(view: ProjectView) {
  return view.fronts
    .flatMap((f) => f.deliverables)
    .filter((d) => d.status === "ATRASO_OPERACIONAL" || d.status === "ATRASO_CONTRATUAL");
}
