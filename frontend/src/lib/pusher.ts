// src/lib/pusher.ts
import Pusher from 'pusher-js';

let pusher: Pusher | null = null;

export const getPusher = () => {
  if (pusher) return pusher;

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!key || !cluster) {
    // Fail loudly in dev so it's obvious why Pusher won't connect
    console.error('[getPusher] Missing NEXT_PUBLIC_PUSHER_KEY or NEXT_PUBLIC_PUSHER_CLUSTER environment variables.');
    throw new Error('Missing Pusher configuration in environment (NEXT_PUBLIC_PUSHER_KEY / NEXT_PUBLIC_PUSHER_CLUSTER)');
  }

  if (!apiUrl) {
    console.warn('[getPusher] NEXT_PUBLIC_API_URL is not set. authEndpoint will be relative.');
  }

  // Enable verbose logging in the browser to help debug connection issues in development
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  if (typeof window !== 'undefined' && (Pusher as any).logToConsole !== undefined) {
    // pusher-js exposes a global flag `logToConsole` to enable debug logs
    // set it to true in dev only
    (Pusher as any).logToConsole = process.env.NODE_ENV !== 'production';
  }

  pusher = new Pusher(key, {
    cluster: cluster,
    forceTLS: true,
    authEndpoint: `${apiUrl ?? ''}/pusher/auth`,
    // Do not override auth headers - allow pusher-js to set the correct
    // Content-Type (it sends urlencoded data). Overriding to JSON causes
    // Nest/Express body-parser to fail to parse the body and `body` becomes undefined.
    //auth: { headers: { 'Content-Type': 'application/json' } },
  });

  // small debug output
  console.debug('[getPusher] initialized', { key: !!key, cluster, authEndpoint: `${apiUrl ?? ''}/pusher/auth` });

  return pusher;
};