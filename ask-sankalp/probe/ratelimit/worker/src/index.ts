// ask-sankalp/probe/ratelimit/worker/src/index.ts
// Phase 0 probe: does the ratelimits binding work on the Workers Free plan?
// The docs never state whether the binding is plan-gated, so this settles it empirically.

interface Env {
  ASK_RATE_LIMITER: RateLimit;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { success } = await env.ASK_RATE_LIMITER.limit({ key: 'probe' });

    return Response.json({
      success,
      bindingWorks: true,
      note: success
        ? 'limit() returned success — binding is live'
        : 'limit() returned success:false — binding is live AND the limit was hit',
    });
  },
} satisfies ExportedHandler<Env>;
