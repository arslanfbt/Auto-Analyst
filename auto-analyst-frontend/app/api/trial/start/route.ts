import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import Stripe from 'stripe'
import redis, { creditUtils, KEYS } from '@/lib/redis'
import { CreditConfig, CREDIT_THRESHOLDS } from './credits-config'

export const dynamic = 'force-dynamic'

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    })
  : null

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Trial functionality has been disabled' },
    { status: 410 }
  )
} 
