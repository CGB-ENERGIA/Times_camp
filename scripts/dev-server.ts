// Servidor local leve que executa as funções de api/*.ts (formato Vercel)
// sem precisar de `vercel dev` / login na Vercel. Útil para desenvolvimento.
// Uso: bun run dev:api  (depois: bun run dev, que já faz proxy de /api para cá)

import { readdirSync, statSync } from 'fs';
import { join } from 'path';

interface Route {
  pattern: RegExp;
  paramNames: string[];
  filePath: string;
}

const apiDir = join(import.meta.dir, '..', 'api');

function collectRoutes(dir: string, base = ''): Route[] {
  const routes: Route[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('_') || entry.endsWith('.json')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      routes.push(...collectRoutes(full, `${base}/${entry}`));
      continue;
    }
    if (!entry.endsWith('.ts')) continue;

    const name = entry.replace(/\.ts$/, '');
    const paramNames: string[] = [];
    let routePath: string;
    if (name === 'index') {
      routePath = base || '/';
    } else if (name.startsWith('[') && name.endsWith(']')) {
      const param = name.slice(1, -1);
      paramNames.push(param);
      routePath = `${base}/:${param}`;
    } else {
      routePath = `${base}/${name}`;
    }

    const regexStr = '^' + routePath.replace(/:[^/]+/g, '([^/]+)') + '$';
    routes.push({ pattern: new RegExp(regexStr), paramNames, filePath: full });
  }
  return routes;
}

const routes = collectRoutes(apiDir);
const port = Number(process.env.PORT) || 3001;

Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api/, '') || '/';
    const match = routes.find((r) => r.pattern.test(path));
    if (!match) return new Response('Not found', { status: 404 });

    const m = match.pattern.exec(path)!;
    const query: Record<string, string> = {};
    match.paramNames.forEach((name, i) => {
      const value = m[i + 1];
      if (value !== undefined) query[name] = value;
    });
    url.searchParams.forEach((v, k) => {
      query[k] = v;
    });

    const mod = await import(match.filePath);
    const handler = mod.default;

    let body: unknown;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const text = await req.text();
      try {
        body = text ? JSON.parse(text) : undefined;
      } catch {
        body = undefined;
      }
    }

    const headers: Record<string, string> = {};
    req.headers.forEach((v, k) => {
      headers[k] = v;
    });

    let statusCode = 200;
    const resHeaders = new Headers();
    let resolveResponse!: (r: Response) => void;
    const responsePromise = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });

    const fakeRes = {
      status(code: number) {
        statusCode = code;
        return fakeRes;
      },
      setHeader(name: string, value: string) {
        resHeaders.set(name, value);
        return fakeRes;
      },
      json(obj: unknown) {
        resHeaders.set('content-type', 'application/json');
        resolveResponse(new Response(JSON.stringify(obj), { status: statusCode, headers: resHeaders }));
      },
      end() {
        resolveResponse(new Response(null, { status: statusCode, headers: resHeaders }));
      },
    };

    const fakeReq = { method: req.method, headers, body, query };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await handler(fakeReq as any, fakeRes as any);
    return responsePromise;
  },
});

console.log(`API dev server rodando em http://localhost:${port}`);
