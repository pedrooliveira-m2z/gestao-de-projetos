import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TopNav } from "@/components/TopNav";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { formatFullDate } from "@/lib/format";
import { listClickupClientNames } from "@/lib/clickup";
import { createProjectAction, deleteClientAction } from "./actions";

export default async function AdminPage() {
  const session = await auth();
  if (session?.user?.role === "CLIENT") redirect("/dashboard");
  const isAdmin = session?.user?.role === "ADMIN";

  const [projects, clients, clickupClientNames] = await Promise.all([
    prisma.project.findMany({ include: { client: true }, orderBy: { updatedAt: "desc" } }),
    prisma.client.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { projects: true, users: true } } },
    }),
    listClickupClientNames(),
  ]);

  const existingNames = new Set(clients.map((c) => c.name.toLowerCase()));
  const newClientSuggestions = clickupClientNames.filter(
    (name) => !existingNames.has(name.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-bold text-neutral-900">Administração</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Cadastre projetos, frentes, entregas e regras de SLA que alimentam os painéis e o PDF.
        </p>

        <section className="mt-8">
          <h2 className="text-sm font-bold text-neutral-700 uppercase">Projetos</h2>
          <div className="mt-3 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            {projects.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-neutral-900">
                    {p.client.name} — {p.name}
                  </p>
                  <p className="text-xs text-neutral-500">
                    Briefing {formatFullDate(p.briefingDate)}
                  </p>
                </div>
                <Link
                  href={`/admin/projects/${p.id}`}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  Editar frentes e entregas
                </Link>
              </div>
            ))}
            {projects.length === 0 && (
              <p className="px-4 py-3 text-sm text-neutral-500">Nenhum projeto ainda.</p>
            )}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-bold text-neutral-700 uppercase">Clientes</h2>
          <div className="mt-3 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            {clients.map((c) => {
              const deleteClient = deleteClientAction.bind(null, c.id);
              return (
                <div key={c.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{c.name}</p>
                    <p className="text-xs text-neutral-500">
                      {c._count.projects} projeto(s) · {c._count.users} usuário(s)
                    </p>
                  </div>
                  {isAdmin && (
                    <form action={deleteClient}>
                      <ConfirmSubmitButton
                        confirmMessage={`Apagar "${c.name}" de vez? Isso remove todos os projetos, frentes e entregas desse cliente. Não tem como desfazer.`}
                        className="text-xs font-semibold text-red-600 hover:underline"
                      >
                        Apagar cliente
                      </ConfirmSubmitButton>
                    </form>
                  )}
                </div>
              );
            })}
            {clients.length === 0 && (
              <p className="px-4 py-3 text-sm text-neutral-500">Nenhum cliente ainda.</p>
            )}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-bold text-neutral-700 uppercase">Novo projeto</h2>
          <form
            action={createProjectAction}
            className="mt-3 grid gap-3 rounded-lg border border-neutral-200 bg-white p-4 sm:grid-cols-2"
          >
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-600">Cliente</label>
              <select
                name="clientId"
                required
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="">Selecione…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value="__new__">+ Novo cliente</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-600">
                Nome do novo cliente (se aplicável)
              </label>
              <input
                name="newClientName"
                list="clickup-client-suggestions"
                placeholder={
                  newClientSuggestions.length > 0
                    ? "Digite ou escolha da lista do ClickUp"
                    : undefined
                }
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
              <datalist id="clickup-client-suggestions">
                {newClientSuggestions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              {newClientSuggestions.length === 0 && (
                <p className="text-[11px] text-neutral-400">
                  Sem sugestões do ClickUp — configure a lista de clientes em{" "}
                  <Link href="/admin/clickup" className="underline">
                    ClickUp
                  </Link>
                  .
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-600">Nome do projeto</label>
              <input
                name="name"
                required
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-600">
                Data de briefing/referência
              </label>
              <input
                type="date"
                name="briefingDate"
                required
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="rounded-md bg-[#0b0e14] px-4 py-2 text-sm font-semibold text-white hover:bg-black"
              >
                Criar projeto
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
