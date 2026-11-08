/** Talk to Qwen on the Spark through the Vite proxy (which adds the API key). Streams the reply as it is written. */
export async function streamChat(
  system: string,
  user: string,
  opts: { maxTokens: number; onText?: (textSoFar: string) => void; timeoutMs?: number },
): Promise<string> {
  const res = await fetch('/api/llm/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
    body: JSON.stringify({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.2,
      max_tokens: opts.maxTokens,
      stream: true,
      chat_template_kwargs: { enable_thinking: false },
    }),
  })
  if (!res.ok || !res.body) throw new Error(`llm ${res.status}`)
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let sse = ''
  let reply = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    sse += dec.decode(value, { stream: true })
    const events = sse.split('\n')
    sse = events.pop() ?? ''
    for (const ev of events) {
      if (!ev.startsWith('data:') || ev.includes('[DONE]')) continue
      try {
        const delta = (JSON.parse(ev.slice(5)) as { choices?: { delta?: { content?: string } }[] }).choices?.[0]?.delta?.content
        if (delta) reply += delta
      } catch {
        /* a partial event: the rest arrives in the next chunk */
      }
    }
    opts.onText?.(reply)
  }
  return reply.trim()
}
