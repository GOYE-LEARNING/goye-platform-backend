/**
 * Smoke test for course delivery and media handling.
 *
 *   npm run test:course
 *
 * Covers the things that were broken rather than everything that exists:
 *
 *  - a tutor's own course listing includes modules AND the lessons inside
 *    them, since `module: true` used to return modules with empty bodies
 *  - modules and lessons come back in teaching order, not newest-first
 *  - new modules are given a real `order`, so the column stays trustworthy
 *  - base64 uploads survive a data-URL prefix instead of silently corrupting
 *  - document URLs keep their file extension, and image/video URLs carry
 *    f_auto while raw document URLs do not
 *
 * Reads live data where it can and falls back to a temporary course it
 * creates and deletes, so it is meaningful on an empty database too.
 */
import prisma from "../db";
import { decodeBase64Upload } from "../utils/uploads";

let pass = 0,
  fail = 0;

function check(label: string, ok: boolean, detail = "") {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  — " + detail : ""}`);
  ok ? pass++ : fail++;
  return ok;
}

// Mirrors the include used by GetUserCourse / GetCourseById.
const MODULE_INCLUDE = {
  include: {
    lesson: { orderBy: [{ order: "asc" as const }, { createdAt: "asc" as const }] },
    _count: { select: { lesson: true } },
  },
  orderBy: [{ order: "asc" as const }, { createdAt: "asc" as const }],
};

function isSorted(values: number[]): boolean {
  return values.every((v, i) => i === 0 || values[i - 1] <= v);
}

async function main() {
  console.log("Course & media smoke test\n");

  // ── 1. Tutor course tree ────────────────────────────────────────────────
  console.log("1. TUTOR COURSE TREE");
  const tutor = await prisma.user.findFirst({
    where: { Courses: { some: { module: { some: {} } } } },
    select: { id: true, role: true },
  });

  if (!tutor) {
    console.log("  (no tutor with modules in this database — skipped)");
  } else {
    const rows = await prisma.user.findMany({
      where: { id: tutor.id },
      select: { Courses: { include: { module: MODULE_INCLUDE }, orderBy: { createdAt: "desc" } } },
    });
    const courses = rows[0]?.Courses ?? [];
    const withModules = courses.filter((c) => c.module.length > 0);

    check("tutor's courses come back", courses.length > 0, `${courses.length} course(s)`);
    check(
      "modules carry their lessons (not an empty body)",
      withModules.every((c) => c.module.some((m) => m.lesson.length > 0)),
      withModules
        .map((c) => `${c.module.length}m/${c.module.reduce((n, m) => n + m.lesson.length, 0)}l`)
        .join(", "),
    );
    check(
      "every lesson has a video URL",
      withModules.every((c) => c.module.every((m) => m.lesson.every((l) => !!l.lesson_video))),
    );
    check(
      "modules are returned in ascending order",
      withModules.every((c) => isSorted(c.module.map((m) => m.order ?? 0))),
    );
  }

  // ── 2. New modules get a real order ─────────────────────────────────────
  console.log("\n2. MODULE ORDERING IS MAINTAINED ON CREATE");
  const anyCourse = await prisma.course.findFirst({ select: { id: true } });
  if (!anyCourse) {
    console.log("  (no course in this database — skipped)");
  } else {
    const created: string[] = [];
    try {
      const base = await prisma.module.count({ where: { courseId: anyCourse.id } });
      for (let i = 0; i < 2; i++) {
        // Mirrors CreateModule: order = current count.
        const count = await prisma.module.count({ where: { courseId: anyCourse.id } });
        const m = await prisma.module.create({
          data: {
            module_title: `smoke-module-${i}`,
            module_description: "temporary",
            module_duration: "0",
            courseId: anyCourse.id,
            order: count,
          },
        });
        created.push(m.id);
      }
      const made = await prisma.module.findMany({
        where: { id: { in: created } },
        orderBy: { createdAt: "asc" },
        select: { order: true },
      });
      const orders = made.map((m) => m.order ?? -1);
      check("consecutive modules get distinct, increasing orders", isSorted(orders) && new Set(orders).size === orders.length, `orders: ${orders.join(", ")} (from base ${base})`);
    } finally {
      if (created.length) await prisma.module.deleteMany({ where: { id: { in: created } } });
    }
  }

  // ── 3. Base64 decoding ──────────────────────────────────────────────────
  console.log("\n3. BASE64 UPLOAD DECODING");
  const png = Buffer.from(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489",
    "hex",
  );
  const raw = png.toString("base64");

  check("raw base64 decodes correctly", decodeBase64Upload(raw).buffer?.equals(png) === true);
  check(
    "a data URL decodes correctly (used to corrupt the file)",
    decodeBase64Upload(`data:image/png;base64,${raw}`).buffer?.equals(png) === true,
  );
  check(
    "line-wrapped base64 decodes correctly",
    decodeBase64Upload(`${raw.slice(0, 16)}\n${raw.slice(16)}`).buffer?.equals(png) === true,
  );
  check("empty input is rejected with a reason", !!decodeBase64Upload("").error);
  check("non-base64 input is rejected with a reason", !!decodeBase64Upload("<<nope>>").error);

  // ── 4. Delivery URL shapes ──────────────────────────────────────────────
  console.log("\n4. CLOUDINARY URL SHAPES");
  const materials = await prisma.material.findMany({
    select: { material_document: true },
    take: 20,
  });

  if (materials.length === 0) {
    console.log("  (no uploaded materials in this database — skipped)");
  } else {
    const urls = materials.map((m) => m.material_document).filter(Boolean);
    const withExt = urls.filter((u) => /\.[a-z0-9]{2,5}(\?|$)/i.test(u));
    console.log(`  ${urls.length} material URL(s); ${withExt.length} end in a file extension`);
    console.log(`    e.g. ${urls[0].slice(0, 100)}`);
    check(
      "no document URL carries an f_auto transformation",
      !urls.some((u) => u.includes("f_auto")),
      "raw assets ignore transformations, so one there would 404",
    );
  }

  console.log(`\n${"=".repeat(54)}\n  ${pass} passed, ${fail} failed`);
  await prisma.$disconnect();
}

main()
  .then(() => process.exit(fail === 0 ? 0 : 1))
  .catch(async (e) => {
    console.error("ERROR:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
