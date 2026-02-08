import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

// Whitelist of allowed email addresses
const ALLOWED_EMAILS = [
  "paul@heth.ca",
];

// Simple local password (for development only)
const LOCAL_PASSWORD = process.env.LOCAL_PASSWORD || "missioncontrol";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    // Credentials provider for local development
    Credentials({
      name: "Local Login",
      credentials: {
        password: { label: "Password", type: "password" }
      },
      authorize: async (credentials) => {
        const pwd = credentials?.password as string;
        if (pwd === LOCAL_PASSWORD) {
          return {
            id: "local-user",
            email: "paul@heth.ca",
            name: "Paul (Local)",
          };
        }
        return null;
      },
    }),
    // Google OAuth (for production)
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Always allow credentials login
      if (account?.provider === "credentials") {
        return true;
      }
      // For OAuth, check email whitelist
      if (!user.email || !ALLOWED_EMAILS.includes(user.email.toLowerCase())) {
        console.log(`Auth denied for: ${user.email}`);
        return false;
      }
      console.log(`Auth granted for: ${user.email}`);
      return true;
    },
    async session({ session }) {
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  trustHost: true,
});
