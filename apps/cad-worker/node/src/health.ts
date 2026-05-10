import * as http from 'http';

let activeJobs = 0;

export function incrementActive() { activeJobs++; }
export function decrementActive() { activeJobs = Math.max(0, activeJobs - 1); }

export function startHealthServer(port: number): http.Server {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', activeJobs }));
  });
  server.listen(port, () => {
    console.log(`Health server listening on port ${port}`);
  });
  return server;
}
