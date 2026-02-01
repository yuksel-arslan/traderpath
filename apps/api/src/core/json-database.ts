// ===========================================
// JSON-based Database (Temporary Solution)
// No PostgreSQL or Prisma required
// ===========================================

import fs from 'fs';
import path from 'path';
import { logger } from './logger';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize users file if not exists
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify({ users: [], credits: [] }, null, 2));
}

interface User {
  id: string;
  email: string;
  passwordHash: string | null;
  name: string;
  googleId: string | null;
  avatarUrl: string | null;
  referralCode: string;
  referredById: string | null;
  level: number;
  xp: number;
  streakDays: number;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

interface CreditBalance {
  userId: string;
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
}

interface Database {
  users: User[];
  credits: CreditBalance[];
}

function readDb(): Database {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { users: [], credits: [] };
  }
}

function writeDb(db: Database): void {
  fs.writeFileSync(USERS_FILE, JSON.stringify(db, null, 2));
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Prisma-like interface
export const jsonDb = {
  $connect: async () => {
    logger.debug('JSON Database connected');
  },

  $disconnect: async () => {
    logger.debug('JSON Database disconnected');
  },

  $queryRaw: async () => [],
  $executeRaw: async () => 0,

  $transaction: async <T>(fn: (tx: typeof jsonDb) => Promise<T>): Promise<T> => {
    return fn(jsonDb);
  },

  user: {
    findUnique: async (args: { where: { email?: string; id?: string; googleId?: string; referralCode?: string }; include?: any }) => {
      const db = readDb();
      const { where } = args;

      let user: User | undefined;

      if (where.email) {
        user = db.users.find(u => u.email.toLowerCase() === where.email!.toLowerCase());
      } else if (where.id) {
        user = db.users.find(u => u.id === where.id);
      } else if (where.googleId) {
        user = db.users.find(u => u.googleId === where.googleId);
      } else if (where.referralCode) {
        user = db.users.find(u => u.referralCode?.toUpperCase() === where.referralCode!.toUpperCase());
      }

      if (!user) return null;

      // Include credit balance if requested
      if (args.include?.creditBalance) {
        const creditBalance = db.credits.find(c => c.userId === user!.id);
        return { ...user, creditBalance };
      }

      return user;
    },

    create: async (args: { data: any }) => {
      const db = readDb();
      const { data } = args;

      const newUser: User = {
        id: generateUUID(),
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash || null,
        name: data.name,
        googleId: data.googleId || null,
        avatarUrl: data.avatarUrl || null,
        referralCode: data.referralCode,
        referredById: data.referredById || null,
        level: 1,
        xp: 0,
        streakDays: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: null,
      };

      db.users.push(newUser);
      writeDb(db);

      return newUser;
    },

    update: async (args: { where: { id: string }; data: any }) => {
      const db = readDb();
      const { where, data } = args;

      const index = db.users.findIndex(u => u.id === where.id);
      if (index === -1) return null;

      if (data.lastLoginAt !== undefined) {
        db.users[index].lastLoginAt = data.lastLoginAt instanceof Date
          ? data.lastLoginAt.toISOString()
          : data.lastLoginAt;
      }
      if (data.googleId !== undefined) {
        db.users[index].googleId = data.googleId;
      }
      if (data.avatarUrl !== undefined) {
        db.users[index].avatarUrl = data.avatarUrl;
      }

      db.users[index].updatedAt = new Date().toISOString();
      writeDb(db);

      return db.users[index];
    },

    findMany: async () => {
      const db = readDb();
      return db.users;
    },

    count: async () => {
      const db = readDb();
      return db.users.length;
    },
  },

  creditBalance: {
    findUnique: async (args: { where: { userId: string } }) => {
      const db = readDb();
      return db.credits.find(c => c.userId === args.where.userId) || null;
    },

    create: async (args: { data: any }) => {
      const db = readDb();
      const { data } = args;

      const newCredit: CreditBalance = {
        userId: data.userId,
        balance: data.balance,
        lifetimeEarned: data.lifetimeEarned || data.balance,
        lifetimeSpent: 0,
      };

      db.credits.push(newCredit);
      writeDb(db);

      return newCredit;
    },

    update: async (args: { where: { userId: string }; data: any }) => {
      const db = readDb();
      const { where, data } = args;

      const index = db.credits.findIndex(c => c.userId === where.userId);
      if (index === -1) return null;

      if (data.balance !== undefined) {
        if (data.balance.increment) {
          db.credits[index].balance += data.balance.increment;
        } else {
          db.credits[index].balance = data.balance;
        }
      }
      if (data.lifetimeEarned?.increment) {
        db.credits[index].lifetimeEarned += data.lifetimeEarned.increment;
      }

      writeDb(db);
      return db.credits[index];
    },
  },

  referral: {
    create: async (args: { data: any }) => {
      // Simplified - just return the data
      return { id: generateUUID(), ...args.data };
    },
  },

  analysis: {
    findMany: async () => [],
    count: async () => 0,
  },

  report: {
    findMany: async () => [],
    count: async () => 0,
  },
};

// Export as prisma for compatibility
export const prisma = jsonDb;
