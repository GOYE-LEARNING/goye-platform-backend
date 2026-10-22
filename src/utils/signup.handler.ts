/** Logs start/end + duration of a step so a hanging step shows up in Render logs. */
export async function timed<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const t = Date.now();
  console.log(`[signup] ${name} start`);
  try {
    return await fn();
  } finally {
    console.log(`[signup] ${name} done in ${Date.now() - t}ms`);
  }
}
 
/** Rejects if a promise takes too long, so one stuck service can't hang signup. */
export function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}
 
// ─────────────────────────────────────────────────────────────────────────────
// Replace your existing CreateUser method inside the controller with this one.
// ─────────────────────────────────────────────────────────────────────────────