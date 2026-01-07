// ===========================================
// Direct PostgreSQL Database Connection
// Used as fallback when Prisma binaries unavailable
// ===========================================

import { Pool, PoolClient } from 'pg';
import { config } from './config';

// Create connection pool
const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Log pool errors
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

// Query helper with automatic connection management
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number }> {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 100) {
      console.log('Slow query:', { text, duration, rows: result.rowCount });
    }
    return { rows: result.rows as T[], rowCount: result.rowCount || 0 };
  } catch (error) {
    console.error('Database query error:', { text, error });
    throw error;
  }
}

// Get a client for transactions
export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

// Transaction helper
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// User-related queries
export const userQueries = {
  findByEmail: async (email: string) => {
    const { rows } = await query(
      `SELECT u.*, cb.balance as credit_balance
       FROM users u
       LEFT JOIN credit_balances cb ON cb.user_id = u.id
       WHERE LOWER(u.email) = LOWER($1)`,
      [email]
    );
    return rows[0] || null;
  },

  findByGoogleId: async (googleId: string) => {
    const { rows } = await query(
      `SELECT u.*, cb.balance as credit_balance
       FROM users u
       LEFT JOIN credit_balances cb ON cb.user_id = u.id
       WHERE u.google_id = $1`,
      [googleId]
    );
    return rows[0] || null;
  },

  findById: async (id: string) => {
    const { rows } = await query(
      `SELECT u.*, cb.balance as credit_balance
       FROM users u
       LEFT JOIN credit_balances cb ON cb.user_id = u.id
       WHERE u.id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  create: async (data: {
    email: string;
    passwordHash?: string;
    name: string;
    googleId?: string;
    avatarUrl?: string;
    referralCode: string;
    referredById?: string;
  }) => {
    const { rows } = await query(
      `INSERT INTO users (email, password_hash, name, google_id, avatar_url, referral_code, referred_by_id)
       VALUES (LOWER($1), $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.email,
        data.passwordHash || null,
        data.name,
        data.googleId || null,
        data.avatarUrl || null,
        data.referralCode,
        data.referredById || null,
      ]
    );
    return rows[0];
  },

  updateLastLogin: async (id: string) => {
    await query(
      `UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [id]
    );
  },

  findByReferralCode: async (code: string) => {
    const { rows } = await query(
      `SELECT * FROM users WHERE UPPER(referral_code) = UPPER($1)`,
      [code]
    );
    return rows[0] || null;
  },
};

// Credit balance queries
export const creditQueries = {
  create: async (userId: string, initialBalance: number) => {
    const { rows } = await query(
      `INSERT INTO credit_balances (user_id, balance, lifetime_earned)
       VALUES ($1, $2, $2)
       RETURNING *`,
      [userId, initialBalance]
    );
    return rows[0];
  },

  getBalance: async (userId: string) => {
    const { rows } = await query(
      `SELECT * FROM credit_balances WHERE user_id = $1`,
      [userId]
    );
    return rows[0] || null;
  },

  addCredits: async (userId: string, amount: number) => {
    const { rows } = await query(
      `UPDATE credit_balances
       SET balance = balance + $2,
           lifetime_earned = lifetime_earned + $2,
           updated_at = NOW()
       WHERE user_id = $1
       RETURNING *`,
      [userId, amount]
    );
    return rows[0];
  },
};

// Referral queries
export const referralQueries = {
  create: async (data: {
    referrerId: string;
    referredId: string;
    status: string;
    referrerCreditsEarned: number;
    referredCreditsEarned: number;
  }) => {
    const { rows } = await query(
      `INSERT INTO referrals (referrer_id, referred_id, status, referrer_credits_earned, referred_credits_earned)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        data.referrerId,
        data.referredId,
        data.status,
        data.referrerCreditsEarned,
        data.referredCreditsEarned,
      ]
    );
    return rows[0];
  },
};

// Health check
export async function healthCheck(): Promise<boolean> {
  try {
    const { rows } = await query('SELECT 1 as ok');
    return rows[0]?.ok === 1;
  } catch {
    return false;
  }
}

// Close pool (for graceful shutdown)
export async function closePool(): Promise<void> {
  await pool.end();
}

export const pgDb = {
  query,
  getClient,
  transaction,
  users: userQueries,
  credits: creditQueries,
  referrals: referralQueries,
  healthCheck,
  closePool,
};
