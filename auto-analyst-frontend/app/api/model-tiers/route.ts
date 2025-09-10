import { NextResponse } from 'next/server'
import { MODEL_TIERS } from '@/lib/model-tiers'

export async function GET() {
  return NextResponse.json({ 
    tiers: MODEL_TIERS
  })
} 