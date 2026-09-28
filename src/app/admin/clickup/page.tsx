import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { TopNav } from "@/components/TopNav";
import {
  getAuthorizedUser,
  getClickupToken,
  listFolderlessLists,
  listFolders,
  listListsInFolder,
  listSpaces,
  listTeams,
  type ClickupList,
} from "@/lib/clickup";
import { TokenForm } from "./TokenForm";
import { disconnectClickupAction } from "./actions";

async function loadHierarchy(token: string) {
  const teams = await listTeams(token);
  const tree = await Promise.all(
    teams.map(async (team) => {
      const spaces = await listSpaces(token, team.id);
      const spacesWithLists = await Promise.all(
        spaces.map(async (space) => {
          const [folders, folderlessLists] = await Promise.all([
            listFolders(token, space.id),
            listFolderlessLists(token, space.id),
          ]);
          const foldersWithLists = await Promise.all(
            folders.map(async (folder) => ({
              ...folder,
              lists: await listListsInFolder(token, folder.id).catch(() => [] as ClickupList[]),
            }))
          );
          return { ...space, folders: foldersWithLists, lists: folderlessLists };
        })
      );
      return { ...team, spaces: spacesWithLists };
    })
  );
  return tree;
}

export default async function ClickupAdminPage() {
  const session = await auth();
  if (session?.user?.role === "CLIENT") redirect("/dashboard");

  const token = await getClickupToken();
  let connectedUser: { username: string; email: string } | null = null;
  let hierarchy: Awaited<ReturnType<typeof loadHierarchy>> = [];
  let connectionError: string | null = null;

  if (token) {
    try {
      connectedUser = await getAuthorizedUser(token);
      hierarchy = await loadHierarchy(token);
    } catch {
      connectionError = "O token salvo não é mais válido. Conecte novamente.";
    }
  }

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-bold text-neutral-900">Conexão com o ClickUp</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Conecte um token pessoal do ClickUp para puxar status e vencimentos ao vivo, e importar
          tarefas de uma lista direto para o Gantt de uma frente.
        </p>

        <section className="mt-6 rounded-lg border border-neutral-200 bg-white p-4">
          {connectedUser ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-700">
                Conectado como <span className="font-semibold">{connectedUser.username}</span> (
                {connectedUser.email})
              </p>
              <form action={disconnectClickupAction}>
                <button
                  type="submit"
                  className="text-xs font-semibold text-red-600 hover:underline"
                >
                  Desconectar
                </button>
              </form>
            </div>
          ) : (
            <>
              {connectionError && (
                <p className="mb-3 text-sm text-red-600">{connectionError}</p>
              )}
              <TokenForm />
              <p className="mt-2 text-xs text-neutral-400">
                Gere o token em ClickUp → avatar → Configurações → Apps → API Token.
              </p>
            </>
          )}
        </section>

        {connectedUser && (
          <section className="mt-8">
            <h2 className="text-sm font-bold text-neutral-700 uppercase">
              Espaços e listas (copie o ID da lista para importar em um projeto)
            </h2>
            <div className="mt-3 space-y-4">
              {hierarchy.map((team) => (
                <div key={team.id} className="rounded-lg border border-neutral-200 bg-white p-4">
                  <p className="text-sm font-bold text-neutral-900">{team.name}</p>
                  <div className="mt-2 space-y-3">
                    {team.spaces.map((space) => (
                      <div key={space.id} className="border-l-2 border-neutral-200 pl-3">
                        <p className="text-sm font-semibold text-neutral-700">{space.name}</p>
                        <ul className="mt-1 space-y-1">
                          {space.lists.map((list) => (
                            <ListRow key={list.id} name={list.name} id={list.id} />
                          ))}
                          {space.folders.map((folder) => (
                            <li key={folder.id}>
                              <p className="text-xs font-medium text-neutral-500">
                                {folder.name}
                              </p>
                              <ul className="ml-3 mt-1 space-y-1">
                                {folder.lists.map((list) => (
                                  <ListRow key={list.id} name={list.name} id={list.id} />
                                ))}
                              </ul>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {hierarchy.length === 0 && (
                <p className="text-sm text-neutral-500">Nenhum espaço encontrado.</p>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function ListRow({ name, id }: { name: string; id: string }) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-md bg-neutral-50 px-2 py-1 text-xs">
      <span className="text-neutral-700">{name}</span>
      <code className="rounded bg-neutral-200 px-1.5 py-0.5 font-mono text-neutral-600 select-all">
        {id}
      </code>
    </li>
  );
}
