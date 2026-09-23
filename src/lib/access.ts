import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Ensures the current session may view this project; throws 404 otherwise (never leaks existence). */
export async function assertProjectAccess(projectId: string) {
  const session = await auth();
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) notFound();
  if (session?.user?.role === "CLIENT" && session.user.clientId !== project.clientId) {
    notFound();
  }
  return { session, project };
}
