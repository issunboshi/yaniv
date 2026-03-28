import type { GameEvent } from '$lib/types';

interface Connection {
  id: string;
  controller: ReadableStreamDefaultController;
}

const gameConnections = new Map<string, Connection[]>();

export function addConnection(gameCode: string, id: string, controller: ReadableStreamDefaultController) {
  const connections = gameConnections.get(gameCode) ?? [];
  connections.push({ id, controller });
  gameConnections.set(gameCode, connections);
}

export function removeConnection(gameCode: string, id: string) {
  const connections = gameConnections.get(gameCode) ?? [];
  const filtered = connections.filter(c => c.id !== id);
  if (filtered.length === 0) {
    gameConnections.delete(gameCode);
  } else {
    gameConnections.set(gameCode, filtered);
  }
}

export function broadcast(gameCode: string, event: GameEvent) {
  const connections = gameConnections.get(gameCode) ?? [];
  const data = `data: ${JSON.stringify(event)}\n\n`;
  const encoder = new TextEncoder();
  const encoded = encoder.encode(data);

  for (const conn of connections) {
    try {
      conn.controller.enqueue(encoded);
    } catch {
      removeConnection(gameCode, conn.id);
    }
  }
}

export function getConnectionCount(gameCode: string): number {
  return (gameConnections.get(gameCode) ?? []).length;
}
