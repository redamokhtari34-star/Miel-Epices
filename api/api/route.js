import { NextResponse } from 'next/server';

export async function POST(req) {
  // On répond 200 pour dire à Stripe que le serveur est bien là
  return NextResponse.json({ received: true }, { status: 200 });
}
