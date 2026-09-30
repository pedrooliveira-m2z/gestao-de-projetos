import Link from "next/link";

export function ProjectTabs({ projectId, active }: { projectId: string; active: "resumo" | "gantt" }) {
  const tabs = [
    { key: "resumo", label: "Visão executiva", href: `/projects/${projectId}` },
    { key: "gantt", label: "Gantt", href: `/projects/${projectId}/gantt` },
  ] as const;

  return (
    <div className="flex items-center gap-1 border-b border-neutral-200">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
            active === tab.key
              ? "border-[#0b0e14] text-[#0b0e14]"
              : "border-transparent text-neutral-500 hover:text-neutral-800"
          }`}
        >
          {tab.label}
        </Link>
      ))}
      <a
        href={`/projects/${projectId}/report-excel`}
        className="ml-auto mb-1 rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:border-neutral-500"
      >
        Baixar planilha Excel
      </a>
      <a
        href={`/projects/${projectId}/report`}
        className="mb-1 rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:border-neutral-500"
      >
        Baixar relatório PDF
      </a>
    </div>
  );
}
