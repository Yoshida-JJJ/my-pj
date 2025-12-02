import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text", placeholder: "demo@example.com" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials, req) {
                // Mock user for demonstration
                if (credentials?.email === "demo@example.com" && credentials?.password === "password") {
                    return { id: "demo-user-id-123", name: "Demo User", email: "demo@example.com" };
                }
                return null;
            }
        })
    ],
    callbacks: {
        async session({ session, token }) {
            if (session.user && token.sub) {
                session.user.id = token.sub;
            }
            return session;
        }
    },
    pages: {
        signIn: '/login',
    }
});

export { handler as GET, handler as POST };
