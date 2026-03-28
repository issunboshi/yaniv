import type { RequestHandler } from './$types';
import { addConnection, removeConnection } from '$lib/server/sse';

export const GET: RequestHandler = async ({ params }) => {
  const code = params.code;
  const connectionId = crypto.randomUUID();

  const stream = new ReadableStream({
    start(controller) {
      addConnection(code, connectionId, controller);

      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(': connected\n\n'));
    },
    cancel() {
      removeConnection(code, connectionId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
};
