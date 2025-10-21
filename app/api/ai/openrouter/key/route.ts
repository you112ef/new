import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { code, code_verifier, code_challenge_method = 'S256' } = await req.json();

    const r = await fetch('https://openrouter.ai/api/v1/auth/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, code_verifier, code_challenge_method })
    });

    if (!r.ok) {
      // Forward the error response from OpenRouter
      const errorText = await r.text();
      return new Response(errorText, { status: r.status });
    }

    // Correctly parse and forward the JSON response
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });

  } catch (error) {
    console.error('PKCE key exchange error:', error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}
