// Render's free tier sleeps after inactivity and needs ~50 s to wake up.
// Poll /health until it answers 200 so the test run doesn't start against a cold API.
const api = (process.env.API_URL ?? 'https://bookflow-api-f8qe.onrender.com').replace(/\/$/, '');
const deadline = Date.now() + Number(process.env.WARMUP_TIMEOUT_MS ?? 180_000);
let attempt = 0;

while (Date.now() < deadline) {
  attempt++;
  const started = Date.now();
  try {
    const res = await fetch(`${api}/health`, { signal: AbortSignal.timeout(60_000) });
    if (res.ok) {
      console.log(`API ready after ${attempt} attempt(s) (${Date.now() - started} ms): ${api}`);
      process.exit(0);
    }
    console.log(`Attempt ${attempt}: HTTP ${res.status}`);
  } catch (e) {
    console.log(`Attempt ${attempt}: ${e instanceof Error ? e.message : e}`);
  }
  await new Promise((r) => setTimeout(r, 5_000));
}
console.error(`API did not wake up in time: ${api}`);
process.exit(1);
