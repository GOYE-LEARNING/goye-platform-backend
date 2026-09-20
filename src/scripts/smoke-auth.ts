/**
 * End-to-end smoke test for the authentication flow.
 *
 *   npm run test:auth          (against a server already running locally)
 *   SMOKE_BASE_URL=https://… npm run test:auth
 *
 * Exercises the real HTTP endpoints — signup, duplicate rejection, login,
 * wrong-password rejection, an authenticated read, logout, token replay after
 * logout, and re-login — then deletes the account it created.
 *
 * It exists because this flow has no other coverage and is the part of the
 * system where a silent failure is worst: the first version of this script
 * caught that logout left the session live, so a token kept working after the
 * user had "logged out".
 *
 * Exits non-zero if any check fails, so it can gate a deploy.
 */
import prisma from "../db";

const B = process.env.SMOKE_BASE_URL || "http://localhost:10000";
const EMAIL = `smoke+${Date.now()}@goye-test.local`;
const PASS = "SmokeTest!2026";
const DEVICE = "smoke-device-" + Date.now();

let pass = 0,
  fail = 0;

function check(label: string, ok: boolean, detail = "") {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  — " + detail : ""}`);
  ok ? pass++ : fail++;
  return ok;
}

async function req(method: string, path: string, body?: any, headers: Record<string, string> = {}) {
  const res = await fetch(B + path, {
    method,
    headers: { "Content-Type": "application/json", "x-device-id": DEVICE, ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON response */
  }
  return { status: res.status, json };
}

const signupBody = (email: string) => ({
  email_address: email,
  password: PASS,
  first_name: "Smoke",
  last_name: "Test",
  country: "Nigeria",
  state: "Lagos",
  phone_number: "+2348000000000",
  role: "student",
  level: "Beginners",
  language: "English",
  languageCode: "en",
});

function tokensFrom(j: any) {
  const src = j || {};
  const access =
    src.accessToken || src.token || src.data?.accessToken || src.tokens?.accessToken;
  const refresh =
    src.refreshToken || src.data?.refreshToken || src.tokens?.refreshToken;
  return { access, refresh };
}

async function main() {
  console.log(`Smoke test — ${EMAIL}\n`);

  console.log("1. SIGNUP");
  const signup = await req("POST", "/api/user/signup", signupBody(EMAIL));
  check(
    "signup returns 2xx",
    signup.status >= 200 && signup.status < 300,
    `HTTP ${signup.status} ${JSON.stringify(signup.json).slice(0, 140)}`,
  );

  const dup = await req("POST", "/api/user/signup", signupBody(EMAIL.toUpperCase()));
  const dupMsg = (dup.json?.message || "").toLowerCase();
  check(
    "duplicate signup refused, case-insensitively",
    dup.status === 400 && dupMsg.includes("already exists"),
    `HTTP ${dup.status} "${dup.json?.message}"`,
  );

  console.log("\n2. LOGIN");
  const login = await req("POST", "/api/user/login", {
    email: EMAIL,
    password: PASS,
    deviceId: DEVICE,
  });
  check("login returns 2xx", login.status >= 200 && login.status < 300, `HTTP ${login.status}`);

  const { access, refresh } = tokensFrom(login.json);
  check("login returns an access token", !!access, access ? "" : `body keys: ${Object.keys(login.json || {}).join(", ")}`);
  check("login returns a refresh token", !!refresh);

  const wrong = await req("POST", "/api/user/login", {
    email: EMAIL,
    password: "definitely-wrong",
    deviceId: DEVICE,
  });
  check("wrong password rejected", wrong.status === 401, `HTTP ${wrong.status}`);

  if (!access) {
    console.log("\n  no token — cannot exercise the authenticated flow");
    return finish();
  }

  const auth: Record<string, string> = { Authorization: `Bearer ${access}` };
  if (refresh) auth["x-refresh-token"] = refresh;

  console.log("\n3. AUTHENTICATED REQUEST");
  const me = await req("GET", "/api/growth/user-summary", undefined, auth);
  check("authenticated request succeeds", me.status === 200, `HTTP ${me.status}`);

  const noTok = await req("GET", "/api/growth/user-summary");
  check("same request without a token is refused", noTok.status === 401 || noTok.status === 403, `HTTP ${noTok.status}`);

  const sess = await prisma.userSession.findUnique({ where: { deviceId: DEVICE } });
  check("a session row exists for this device", !!sess, sess ? `isRevoked=${sess.isRevoked}` : "none");

  console.log("\n4. LOGOUT");
  const out = await req("POST", "/api/user/logout", {}, auth);
  check("logout returns 2xx", out.status >= 200 && out.status < 300, `HTTP ${out.status}`);

  const afterOut = await prisma.userSession.findUnique({ where: { deviceId: DEVICE } });
  check("logout marks the session revoked", afterOut?.isRevoked === true, `isRevoked=${afterOut?.isRevoked}`);

  console.log("\n5. TOKEN REPLAY AFTER LOGOUT");
  const replay = await req("GET", "/api/growth/user-summary", undefined, auth);
  check("token no longer works after logout", replay.status === 401 || replay.status === 403, `HTTP ${replay.status}`);

  console.log("\n6. RE-LOGIN");
  const again = await req("POST", "/api/user/login", {
    email: EMAIL,
    password: PASS,
    deviceId: DEVICE,
  });
  check("can log in again after logout", again.status >= 200 && again.status < 300, `HTTP ${again.status}`);

  const { access: access2 } = tokensFrom(again.json);
  if (access2) {
    const me2 = await req("GET", "/api/growth/user-summary", undefined, {
      Authorization: `Bearer ${access2}`,
    });
    check("the new token works", me2.status === 200, `HTTP ${me2.status}`);
  } else {
    check("re-login returns a token", false, "no token in response");
  }

  await finish();
}

async function finish() {
  console.log(`\n${"=".repeat(54)}\n  ${pass} passed, ${fail} failed`);
  try {
    await prisma.userSession.deleteMany({ where: { deviceId: DEVICE } });
    await prisma.user.deleteMany({ where: { email_address: { contains: "@goye-test.local" } } });
    console.log("  test data cleaned up");
  } catch (e: any) {
    console.log("  cleanup note:", e.message.slice(0, 100));
  }
  await prisma.$disconnect();
}

main()
  .then(() => process.exit(fail === 0 ? 0 : 1))
  .catch(async (e) => {
    console.error("ERROR:", e);
    await finish();
    process.exit(1);
  });
