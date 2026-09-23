import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await bcrypt.hash("catalisti123", 10);
  await prisma.user.upsert({
    where: { email: "admin@catalisti.com.br" },
    update: {},
    create: {
      name: "Admin Catalisti",
      email: "admin@catalisti.com.br",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
  });

  const client = await prisma.client.upsert({
    where: { slug: "cliente-demo" },
    update: {},
    create: { name: "Cliente Demo", slug: "cliente-demo" },
  });

  const clientPasswordHash = await bcrypt.hash("clientedemo123", 10);
  await prisma.user.upsert({
    where: { email: "cliente@clientedemo.com.br" },
    update: {},
    create: {
      name: "Cliente Demo",
      email: "cliente@clientedemo.com.br",
      passwordHash: clientPasswordHash,
      role: "CLIENT",
      clientId: client.id,
    },
  });

  const briefingDate = new Date("2026-09-09T00:00:00Z");
  const cutoffDate = new Date("2026-09-23T00:00:00Z");

  const project = await prisma.project.upsert({
    where: { slug: "cliente-demo-painel-geral" },
    update: { briefingDate, cutoffDate },
    create: {
      clientId: client.id,
      name: "Projeto Demo",
      slug: "cliente-demo-painel-geral",
      briefingDate,
      cutoffDate,
    },
  });

  // Limpa frentes/entregas para permitir reseed idempotente.
  await prisma.deliverable.deleteMany({ where: { front: { projectId: project.id } } });
  await prisma.front.deleteMany({ where: { projectId: project.id } });

  const web = await prisma.front.create({
    data: {
      projectId: project.id,
      name: "Web",
      vendorName: "Agência Criativa",
      colorHex: "#2563eb",
      order: 0,
      deliverables: {
        create: [
          {
            name: "Landing Page 1",
            ruleLabel: "Até 20 dias úteis do briefing",
            kind: "BAR",
            triggerType: "BRIEFING",
            slaDays: 20,
            slaDayType: "UTEIS",
            hasApprovalWindow: true,
            approvalDays: 5,
            manualStatusLabel: null,
            order: 0,
          },
          {
            name: "Site institucional",
            ruleLabel: "Até 30 dias úteis do briefing",
            kind: "BAR",
            triggerType: "BRIEFING",
            slaDays: 30,
            slaDayType: "UTEIS",
            hasApprovalWindow: true,
            approvalDays: 5,
            order: 1,
          },
          {
            name: "Landing Page 2",
            ruleLabel: "Até 30 dias úteis do briefing",
            kind: "BAR",
            triggerType: "BRIEFING",
            slaDays: 30,
            slaDayType: "UTEIS",
            hasApprovalWindow: true,
            approvalDays: 5,
            order: 2,
          },
        ],
      },
    },
  });

  const social = await prisma.front.create({
    data: {
      projectId: project.id,
      name: "Social Media",
      vendorName: "Agência Criativa",
      colorHex: "#0d9488",
      order: 1,
      deliverables: {
        create: [
          {
            name: "Implantação estratégica",
            ruleLabel: "Até 21 dias úteis após condições de início",
            kind: "BAR",
            triggerType: "CONDICOES_INICIO",
            triggerDate: briefingDate,
            slaDays: 21,
            slaDayType: "UTEIS",
            isEstimated: true,
            order: 0,
          },
          {
            name: "Planejamento outubro",
            ruleLabel: "ClickUp: concluído; venc. 17/09",
            kind: "BAR",
            triggerType: "MANUAL",
            startDateOverride: briefingDate,
            endDateOverride: new Date("2026-09-17T00:00:00Z"),
            manualStatusLabel: "concluído",
            order: 1,
          },
          {
            name: "Copy outubro",
            ruleLabel: "Prazo operacional ClickUp",
            kind: "BAR",
            triggerType: "MANUAL",
            startDateOverride: new Date("2026-09-16T00:00:00Z"),
            endDateOverride: new Date("2026-09-22T00:00:00Z"),
            manualStatusLabel: "copy",
            order: 2,
          },
          {
            name: "Design outubro",
            ruleLabel: "ClickUp: início 25/09",
            kind: "BAR",
            triggerType: "MANUAL",
            startDateOverride: new Date("2026-09-25T00:00:00Z"),
            endDateOverride: new Date("2026-09-30T00:00:00Z"),
            manualStatusLabel: "design",
            order: 3,
          },
          {
            name: "Aprovação do cliente - ciclo outubro",
            ruleLabel: "Até 5 dias úteis após solicitação",
            kind: "BAR",
            triggerType: "MANUAL",
            startDateOverride: new Date("2026-09-25T00:00:00Z"),
            endDateOverride: new Date("2026-10-08T00:00:00Z"),
            hasApprovalWindow: true,
            approvalDays: 5,
            isEstimated: true,
            order: 4,
          },
          {
            name: "Entrega / publicação outubro",
            ruleLabel: "ClickUp: venc. 30/09",
            kind: "MILESTONE",
            triggerType: "MANUAL",
            endDateOverride: new Date("2026-09-30T00:00:00Z"),
            manualStatusLabel: "gestão criação",
            order: 5,
          },
          {
            name: "Report mensal",
            ruleLabel: "ClickUp: venc. 30/10",
            kind: "MILESTONE",
            triggerType: "MANUAL",
            endDateOverride: new Date("2026-10-30T00:00:00Z"),
            order: 6,
          },
        ],
      },
    },
  });

  const performance = await prisma.front.create({
    data: {
      projectId: project.id,
      name: "Performance & Dados",
      vendorName: "Parceiro de Mídia",
      colorHex: "#ea580c",
      order: 2,
      deliverables: {
        create: [
          {
            name: "Implantação inicial",
            ruleLabel: "Até 21 dias úteis do kickoff",
            kind: "BAR",
            triggerType: "KICKOFF",
            triggerDate: briefingDate,
            slaDays: 21,
            slaDayType: "UTEIS",
            isEstimated: true,
            order: 0,
          },
          {
            name: "Plano de Performance Ads",
            ruleLabel: "ClickUp: 23/09 - 25/09",
            kind: "BAR",
            triggerType: "MANUAL",
            startDateOverride: new Date("2026-09-23T00:00:00Z"),
            endDateOverride: new Date("2026-09-25T00:00:00Z"),
            manualStatusLabel: "em gestão",
            order: 1,
          },
          {
            name: "Aprovação do cliente - plano",
            ruleLabel: "Até 5 dias úteis quando solicitada",
            kind: "BAR",
            triggerType: "MANUAL",
            startDateOverride: new Date("2026-09-25T00:00:00Z"),
            endDateOverride: new Date("2026-10-02T00:00:00Z"),
            hasApprovalWindow: true,
            approvalDays: 5,
            isEstimated: true,
            order: 2,
          },
        ],
      },
    },
  });

  const motin = await prisma.front.create({
    data: {
      projectId: project.id,
      name: "Conteúdo em Vídeo",
      vendorName: "Produtora de Vídeo",
      colorHex: "#7c3aed",
      order: 3,
      deliverables: {
        create: [
          {
            name: "Kickoff",
            ruleLabel: "ClickUp: concluído / 18/09",
            kind: "MILESTONE",
            triggerType: "MANUAL",
            endDateOverride: new Date("2026-09-18T00:00:00Z"),
            manualStatusLabel: "concluído",
            order: 0,
          },
          {
            name: "Planejamento + roteiro",
            ruleLabel: "Planejamento 21/09; roteiro 23/09",
            kind: "BAR",
            triggerType: "MANUAL",
            startDateOverride: new Date("2026-09-21T00:00:00Z"),
            endDateOverride: new Date("2026-09-25T00:00:00Z"),
            manualStatusLabel: "planejamento / roteiro",
            order: 1,
          },
          {
            name: "Aprovação cliente - roteiro",
            ruleLabel: "Até 5 dias úteis; até 2 rodadas por ciclo",
            kind: "BAR",
            triggerType: "MANUAL",
            startDateOverride: new Date("2026-09-25T00:00:00Z"),
            endDateOverride: new Date("2026-10-02T00:00:00Z"),
            hasApprovalWindow: true,
            approvalDays: 5,
            isEstimated: true,
            order: 2,
          },
          {
            name: "Primeiras versões - ciclo 01",
            ruleLabel: "Até 30 dias úteis do marco",
            kind: "BAR",
            triggerType: "MARCO_CICLO",
            triggerDate: briefingDate,
            slaDays: 30,
            slaDayType: "UTEIS",
            isEstimated: true,
            order: 3,
          },
          {
            name: "Aprovação cliente - pós-produção",
            ruleLabel: "Até 5 dias úteis; até 2 rodadas por ciclo",
            kind: "BAR",
            triggerType: "MANUAL",
            startDateOverride: new Date("2026-10-15T00:00:00Z"),
            endDateOverride: new Date("2026-10-22T00:00:00Z"),
            hasApprovalWindow: true,
            approvalDays: 5,
            isEstimated: true,
            order: 4,
          },
          {
            name: "Conclusão planejada - ciclo 01",
            ruleLabel: "Até 40 dias úteis do marco",
            kind: "BAR",
            triggerType: "MARCO_CICLO",
            triggerDate: briefingDate,
            slaDays: 40,
            slaDayType: "UTEIS",
            isEstimated: true,
            order: 5,
          },
        ],
      },
    },
  });

  console.log("Seed concluído:", { client: client.name, project: project.name, fronts: [web.id, social.id, performance.id, motin.id].length });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
