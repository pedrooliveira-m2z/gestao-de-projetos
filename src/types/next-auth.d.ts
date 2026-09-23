import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: string;
    clientId: string | null;
  }

  interface Session {
    user: {
      role: string;
      clientId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    clientId?: string | null;
  }
}
