import NextAuth, { NextAuthOptions, Session, User } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import type { Adapter, AdapterAccount, AdapterUser, AdapterSession } from "next-auth/adapters";
import { turso } from "@/lib/turso";
import { nanoid } from "nanoid";

// Define types for our database models
type DbUser = {
  id: string;
  email: string;
  name: string;
  emailVerified?: string | null;
  created_at: string;
  updated_at: string;
};

type DbAccount = {
  id: string;
  user_id: string;
  provider_id: string;
  provider_type: string;
  provider_account_id: string;
  refresh_token?: string | null;
  access_token?: string | null;
  expires_at?: number | null;
  token_type?: string | null;
  scope?: string | null;
  id_token?: string | null;
  session_state?: string | null;
};

type DbSession = {
  id: string;
  user_id: string;
  session_token: string;
  expires: string;
};

// Custom adapter for Turso database
const TursoAdapter = (): Adapter => {
  return {
    async createUser(user: Partial<AdapterUser>): Promise<AdapterUser> {
      const id = nanoid();
      const now = new Date().toISOString();
      
      await turso.execute(
        'INSERT INTO users (id, email, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [id, user.email || "", user.name || null, now, now]
      );
      
      // Create default user config
      const configId = nanoid();
      await turso.execute(
        'INSERT INTO user_configs (id, user_id, config_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [configId, id, 'default', now, now]
      );
      
      return {
        id,
        email: user.email || "",
        name: user.name || null,
        emailVerified: null,
      };
    },
    
    async getUser(id: string): Promise<AdapterUser | null> {
      const result = await turso.execute(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );
      
      if (!result.rows.length) return null;
      
      const user = result.rows[0];
      const rawId = user.id;
      const rawEmail = user.email;
      const rawName = user.name;
      
      return {
        id: typeof rawId === 'string' ? rawId : String(rawId),
        email: !rawEmail ? "" : typeof rawEmail === 'string' ? rawEmail : String(rawEmail),
        name: !rawName ? null : typeof rawName === 'string' ? rawName : String(rawName),
        emailVerified: null
      };
    },
    
    async getUserByEmail(email: string): Promise<AdapterUser | null> {
      const result = await turso.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      
      if (!result.rows.length) return null;
      
      const user = result.rows[0];
      const rawId = user.id;
      const rawEmail = user.email;
      const rawName = user.name;
      
      return {
        id: typeof rawId === 'string' ? rawId : String(rawId),
        email: !rawEmail ? "" : typeof rawEmail === 'string' ? rawEmail : String(rawEmail),
        name: !rawName ? null : typeof rawName === 'string' ? rawName : String(rawName),
        emailVerified: null
      };
    },
    
    async getUserByAccount({ providerAccountId, provider }: { providerAccountId: string, provider: string }): Promise<AdapterUser | null> {
      const result = await turso.execute(
        `SELECT u.*
          FROM users u
          JOIN user_accounts ua ON u.id = ua.user_id
          WHERE ua.provider_id = ? AND ua.provider_account_id = ?`,
        [provider, providerAccountId]
      );
      
      if (!result.rows.length) return null;
      
      const user = result.rows[0];
      const rawId = user.id;
      const rawEmail = user.email;
      const rawName = user.name;
      
      return {
        id: typeof rawId === 'string' ? rawId : String(rawId),
        email: !rawEmail ? "" : typeof rawEmail === 'string' ? rawEmail : String(rawEmail),
        name: !rawName ? null : typeof rawName === 'string' ? rawName : String(rawName),
        emailVerified: null
      };
    },
    
    async updateUser(user: Partial<AdapterUser> & { id: string }): Promise<AdapterUser> {
      const now = new Date().toISOString();
      
      await turso.execute(
        'UPDATE users SET email = ?, name = ?, updated_at = ? WHERE id = ?',
        [user.email || "", user.name || null, now, user.id]
      );
      
      const rawId = user.id;
      const rawEmail = user.email;
      const rawName = user.name;
      
      return {
        id: typeof rawId === 'string' ? rawId : String(rawId),
        email: !rawEmail ? "" : typeof rawEmail === 'string' ? rawEmail : String(rawEmail),
        name: !rawName ? null : typeof rawName === 'string' ? rawName : String(rawName),
        emailVerified: null
      };
    },
    
    async linkAccount(account: AdapterAccount): Promise<AdapterAccount> {
      await turso.execute(
        `INSERT INTO user_accounts (
          id, user_id, provider_id, provider_type, provider_account_id, refresh_token, access_token, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          nanoid(),
          account.userId, 
          account.provider,
          account.type,
          account.providerAccountId,
          account.refresh_token || null,
          account.access_token || null,
          account.expires_at ? String(account.expires_at) : null
        ]
      );
      
      return account;
    },
    
    async createSession({ sessionToken, userId, expires }: { sessionToken: string, userId: string, expires: Date }): Promise<AdapterSession> {
      await turso.execute(
        `INSERT INTO user_sessions (id, user_id, session_token, expires) VALUES (?, ?, ?, ?)`,
        [nanoid(), userId, sessionToken, expires.toISOString()]
      );
      
      return {
        sessionToken,
        userId,
        expires
      };
    },
    
    async getSessionAndUser(sessionToken: string): Promise<{ session: AdapterSession, user: AdapterUser } | null> {
      const result = await turso.execute(
        `SELECT s.session_token, s.user_id, s.expires, 
                u.id, u.email, u.name
         FROM user_sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.session_token = ?`,
        [sessionToken]
      );
      
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];
      
      const rawToken = row.session_token;
      const rawUserId = row.user_id;
      const rawExpires = row.expires;
      
      const session: AdapterSession = {
        sessionToken: typeof rawToken === 'string' ? rawToken : String(rawToken),
        userId: typeof rawUserId === 'string' ? rawUserId : String(rawUserId),
        expires: new Date(typeof rawExpires === 'string' ? rawExpires : String(rawExpires))
      };
      
      const rawId = row.id;
      const rawEmail = row.email;
      const rawName = row.name;
      
      const user: AdapterUser = {
        id: typeof rawId === 'string' ? rawId : String(rawId),
        email: !rawEmail ? "" : typeof rawEmail === 'string' ? rawEmail : String(rawEmail),
        name: !rawName ? null : typeof rawName === 'string' ? rawName : String(rawName),
        emailVerified: null
      };
      
      return { session, user };
    },
    
    async deleteSession(sessionToken: string): Promise<void> {
      await turso.execute(
        `DELETE FROM user_sessions WHERE session_token = ?`,
        [sessionToken]
      );
    },
    
    // Required for database session strategy
    async createVerificationToken(): Promise<any> {
      // Not implemented as we're using GitHub OAuth
      return null;
    },
    
    async useVerificationToken(): Promise<any> {
      // Not implemented as we're using GitHub OAuth
      return null;
    },
    
    async deleteUser(userId: string): Promise<void> {
      await turso.execute(
        `DELETE FROM users WHERE id = ?`,
        [userId]
      );
    },
    
    async unlinkAccount(account: { providerAccountId: string; provider: string; }): Promise<void> {
      await turso.execute(
        `DELETE FROM user_accounts WHERE provider_id = ? AND provider_account_id = ?`,
        [account.provider, account.providerAccountId]
      );
    },
  };
};

// Augment the built-in session type to include user.id
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    }
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || "",
    }),
  ],
  adapter: TursoAdapter(),
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async session({ session, user }: { session: Session, user: User }): Promise<Session> {
      if (user?.id && session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
