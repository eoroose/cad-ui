import { createWorker } from './worker.js';
import { startHealthServer } from './health.js';

const port = Number(process.env.WORKER_PORT ?? 3001);
const healthServer = startHealthServer(port);
const worker = createWorker();

console.log('cad-worker started');

async function shutdown(signal: string) {
  console.log(`${signal} received — shutting down...`);
  await worker.close();
  healthServer.close();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
