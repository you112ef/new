// Next.js 15 (App Router) أو Fastify – نقطة تمرير إلى OpenRouter
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const {
    messages,
    model,
    temperature = 0.5,
    max_tokens = 2048,
    stream = true,
    providerOnly,
    providerExclude,
    route,
    userKey,
    metadata
  } = await req.json();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userKey ?? process.env.OPENROUTER_API_KEY!}`
  };
  if (metadata?.referer) headers['HTTP-Referer'] = metadata.referer;
  if (metadata?.title) headers['X-Title'] = metadata.title;

  const provider: any = {};
  if (providerOnly?.length) provider.only = providerOnly;
  if (providerExclude?.length) provider.exclude = providerExclude;
  if (route) provider.route = route;

  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens,
      stream,
      ...(Object.keys(provider).length ? { provider } : {})
    })
  });

  // تمرير SSE كما هو إلى العميل
  return new Response(resp.body, {
    status: resp.status,
    headers: {
      'Content-Type': resp.headers.get('Content-Type') ?? 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
