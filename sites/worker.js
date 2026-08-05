const isolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'cross-origin'
};

function withIsolationHeaders(response) {
  const headers = new globalThis.Headers(response.headers);
  for (const [name, value] of Object.entries(isolationHeaders)) headers.set(name, value);
  return new globalThis.Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env) {
    let response = await env.ASSETS.fetch(request);
    const acceptsHtml = request.method === 'GET' && (request.headers.get('Accept') ?? '').includes('text/html');
    if (response.status === 404 && acceptsHtml) {
      response = await env.ASSETS.fetch(new globalThis.Request(new globalThis.URL('/index.html', request.url), request));
    }
    return withIsolationHeaders(response);
  }
};
