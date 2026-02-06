import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Whitelist of allowed email addresses
const ALLOWED_EMAILS = [
  "paul@heth.ca",
];

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Only allow whitelisted emails
      if (!user.email || !ALLOWED_EMAILS.includes(user.email.toLowerCase())) {
        console.log(`Auth denied for: ${user.email}`);
        return false;
      }
      console.log(`Auth granted for: ${user.email}`);
      return true;
    },
    async session({ session }) {
      // Session is valid, user was already verified in signIn callback
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  trustHost: true,
});
