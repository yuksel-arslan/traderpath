// ===========================================
// Database Client
// Uses pg directly (Prisma binary download blocked)
// ===========================================

import { Pool } from 'pg';
import { config } from './config';

// Create connection pool
const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Log pool errors
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

// Prisma-like interface for compatibility
export const prisma = {
  // Raw query support
  $queryRaw: async (strings: TemplateStringsArray, ...values: any[]) => {
    const text = strings.reduce((acc, str, i) => acc + str + (values[i] !== undefined ? `$${i + 1}` : ''), '');
    const { rows } = await pool.query(text, values);
    return rows;
  },

  $queryRawUnsafe: async (query: string, ...values: any[]) => {
    const { rows } = await pool.query(query, values);
    return rows;
  },

  $executeRaw: async (strings: TemplateStringsArray, ...values: any[]) => {
    const text = strings.reduce((acc, str, i) => acc + str + (values[i] !== undefined ? `$${i + 1}` : ''), '');
    const result = await pool.query(text, values);
    return result.rowCount || 0;
  },

  $transaction: async <T>(fn: (tx: typeof prisma) => Promise<T>): Promise<T> => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const txPrisma = {
        ...prisma,
        $queryRaw: async (strings: TemplateStringsArray, ...values: any[]) => {
          const text = strings.reduce((acc, str, i) => acc + str + (values[i] !== undefined ? `$${i + 1}` : ''), '');
          const { rows } = await client.query(text, values);
          return rows;
        },
      };
      const result = await fn(txPrisma as any);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  $connect: async () => {
    // Test connection
    const { rows } = await pool.query('SELECT 1 as ok');
    if (rows[0]?.ok !== 1) {
      throw new Error('Database connection test failed');
    }
  },

  $disconnect: async () => {
    await pool.end();
  },

  // User model
  user: {
    findUnique: async (args: { where: { email?: string; id?: string; googleId?: string; referralCode?: string } }) => {
      const { where } = args;
      let query = 'SELECT * FROM users WHERE ';
      let params: any[] = [];

      if (where.email) {
        query += 'LOWER(email) = LOWER($1)';
        params = [where.email];
      } else if (where.id) {
        query += 'id = $1';
        params = [where.id];
      } else if (where.googleId) {
        query += 'google_id = $1';
        params = [where.googleId];
      } else if (where.referralCode) {
        query += 'UPPER(referral_code) = UPPER($1)';
        params = [where.referralCode];
      }

      const { rows } = await pool.query(query, params);
      return rows[0] || null;
    },

    create: async (args: { data: any }) => {
      const { data } = args;
      const { rows } = await pool.query(
        `INSERT INTO users (email, password_hash, name, google_id, avatar_url, referral_code, referred_by_id)
         VALUES (LOWER($1), $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [data.email, data.passwordHash, data.name, data.googleId, data.avatarUrl, data.referralCode, data.referredById]
      );
      return rows[0];
    },

    update: async (args: { where: { id: string }; data: any }) => {
      const { where, data } = args;
      const sets: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (data.lastLoginAt !== undefined) {
        sets.push(`last_login_at = $${paramIndex++}`);
        params.push(data.lastLoginAt);
      }
      if (data.googleId !== undefined) {
        sets.push(`google_id = $${paramIndex++}`);
        params.push(data.googleId);
      }
      if (data.avatarUrl !== undefined) {
        sets.push(`avatar_url = $${paramIndex++}`);
        params.push(data.avatarUrl);
      }

      sets.push(`updated_at = NOW()`);
      params.push(where.id);

      const { rows } = await pool.query(
        `UPDATE users SET ${sets.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        params
      );
      return rows[0];
    },

    findMany: async (args?: any) => {
      const { rows } = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
      return rows;
    },

    count: async () => {
      const { rows } = await pool.query('SELECT COUNT(*) FROM users');
      return parseInt(rows[0].count);
    },
  },

  // Credit Balance model
  creditBalance: {
    findUnique: async (args: { where: { userId: string } }) => {
      const { rows } = await pool.query('SELECT * FROM credit_balances WHERE user_id = $1', [args.where.userId]);
      return rows[0] || null;
    },

    create: async (args: { data: any }) => {
      const { data } = args;
      const { rows } = await pool.query(
        `INSERT INTO credit_balances (user_id, balance, lifetime_earned)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [data.userId, data.balance, data.lifetimeEarned]
      );
      return rows[0];
    },

    update: async (args: { where: { userId: string }; data: any }) => {
      const { where, data } = args;
      const sets: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (data.balance !== undefined) {
        if (data.balance.increment) {
          sets.push(`balance = balance + $${paramIndex++}`);
          params.push(data.balance.increment);
        } else {
          sets.push(`balance = $${paramIndex++}`);
          params.push(data.balance);
        }
      }
      if (data.lifetimeEarned !== undefined) {
        if (data.lifetimeEarned.increment) {
          sets.push(`lifetime_earned = lifetime_earned + $${paramIndex++}`);
          params.push(data.lifetimeEarned.increment);
        }
      }

      sets.push(`updated_at = NOW()`);
      params.push(where.userId);

      const { rows } = await pool.query(
        `UPDATE credit_balances SET ${sets.join(', ')} WHERE user_id = $${paramIndex} RETURNING *`,
        params
      );
      return rows[0];
    },
  },

  // Referral model
  referral: {
    create: async (args: { data: any }) => {
      const { data } = args;
      const { rows } = await pool.query(
        `INSERT INTO referrals (referrer_id, referred_id, status, referrer_credits_earned, referred_credits_earned)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [data.referrerId, data.referredId, data.status, data.referrerCreditsEarned, data.referredCreditsEarned]
      );
      return rows[0];
    },
  },

  // Analysis model
  analysis: {
    findMany: async (args?: any) => {
      let query = 'SELECT * FROM analyses';
      const params: any[] = [];

      if (args?.where?.userId) {
        query += ' WHERE user_id = $1';
        params.push(args.where.userId);
      }

      query += ' ORDER BY created_at DESC';

      if (args?.take) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(args.take);
      }

      const { rows } = await pool.query(query, params);
      return rows;
    },

    count: async (args?: any) => {
      let query = 'SELECT COUNT(*) FROM analyses';
      const params: any[] = [];

      if (args?.where?.userId) {
        query += ' WHERE user_id = $1';
        params.push(args.where.userId);
      }

      const { rows } = await pool.query(query, params);
      return parseInt(rows[0].count);
    },
  },

  // Report model
  report: {
    findMany: async (args?: any) => {
      let query = 'SELECT * FROM reports';
      const params: any[] = [];

      if (args?.where) {
        const conditions: string[] = [];
        if (args.where.userId) {
          conditions.push(`user_id = $${params.length + 1}`);
          params.push(args.where.userId);
        }
        if (conditions.length > 0) {
          query += ' WHERE ' + conditions.join(' AND ');
        }
      }

      query += ' ORDER BY generated_at DESC';

      if (args?.take) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(args.take);
      }

      const { rows } = await pool.query(query, params);
      return rows;
    },

    count: async () => {
      const { rows } = await pool.query('SELECT COUNT(*) FROM reports');
      return parseInt(rows[0].count);
    },
  },
};

// Connection test
export async function testConnection(): Promise<boolean> {
  try {
    const { rows } = await pool.query('SELECT 1 as ok');
    return rows[0]?.ok === 1;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Close pool (for graceful shutdown)
export async function closeDatabase(): Promise<void> {
  await pool.end();
}
