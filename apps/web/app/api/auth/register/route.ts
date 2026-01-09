// ===========================================
// User Registration API
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, referralCode } = body;

    // Validation
    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: { message: 'Email, password, and name are required' } },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();
    const nameTrimmed = name.trim();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailLower)) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid email format' } },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: { message: 'Password must be at least 8 characters' } },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [emailLower]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: { message: 'An account with this email already exists' } },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate user ID and referral code
    const userId = uuidv4();
    const userReferralCode = generateReferralCode();

    // Check referrer if referral code provided
    let referrerId: string | null = null;
    if (referralCode) {
      const referrer = await pool.query(
        'SELECT id FROM users WHERE referral_code = $1',
        [referralCode.toUpperCase()]
      );
      if (referrer.rows.length > 0) {
        referrerId = referrer.rows[0].id;
      }
    }

    // Create user
    const result = await pool.query(
      `INSERT INTO users (id, email, password_hash, name, referral_code, referred_by_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id, email, name, avatar_url as image`,
      [userId, emailLower, passwordHash, nameTrimmed, userReferralCode, referrerId]
    );

    const user = result.rows[0];

    // Create credit balance with bonus for referral
    const bonusCredits = referrerId ? 45 : 25; // 25 base + 20 referral bonus
    await pool.query(
      `INSERT INTO credit_balances (user_id, balance, daily_free_remaining, daily_reset_at, lifetime_earned, lifetime_spent, lifetime_purchased, updated_at)
       VALUES ($1, $2, 5, NOW(), $2, 0, 0, NOW())`,
      [userId, bonusCredits]
    );

    // Create referral record if applicable
    if (referrerId) {
      await pool.query(
        `INSERT INTO referrals (id, referrer_id, referred_id, status, referrer_credits_earned, referred_credits_earned, created_at, updated_at)
         VALUES ($1, $2, $3, 'REGISTERED', 20, 20, NOW(), NOW())`,
        [uuidv4(), referrerId, userId]
      );

      // Add credits to referrer
      await pool.query(
        `UPDATE credit_balances SET balance = balance + 20, lifetime_earned = lifetime_earned + 20 WHERE user_id = $1`,
        [referrerId]
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        },
        message: 'Account created successfully. Please sign in.',
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Registration failed. Please try again.' } },
      { status: 500 }
    );
  }
}

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
