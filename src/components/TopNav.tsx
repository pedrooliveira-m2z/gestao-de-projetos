import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

export async function TopNav() {
  const session = await auth();
  const role = session?.user?.role;

  return (
    <header className="flex items-center justify-between bg-[#0b0e14] px-6 py-4 text-white">
      <Link href="/dashboard" className="flex items-baseline gap-2">
        <span className="text-lg font-bold tracking-tight">CATALISTI</span>
        <span className="text-xs font-medium text-neutral-400">Gestão de Projetos</span>
      </Link>
      <nav className="flex items-center gap-5 text-sm">
        <Link href="/dashboard" className="text-neutral-300 hover:text-white">
          Painéis
        </Link>
        {(role === "ADMIN" || role === "INTERNAL") && (
          <Link href="/admin" className="text-neutral-300 hover:text-white">
            Administração
          </Link>
        )}
        {session?.user && (
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="text-neutral-300 hover:text-white">
              Sair ({session.user.name})
            </button>
          </form>
        )}
      </nav>
    </header>
  );
}
