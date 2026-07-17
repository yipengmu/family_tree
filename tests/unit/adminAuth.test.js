const test = require("node:test");
const assert = require("node:assert/strict");

test("admin allowlist normalizes configured email addresses", async () => {
  const auth = await import("../../lib/auth.js");
  const previous = process.env.ADMIN_EMAILS;
  process.env.ADMIN_EMAILS = " YIPENGMU@GMAIL.COM, second@example.com ";

  try {
    assert.deepEqual(auth.getAdminEmails(), [
      "yipengmu@gmail.com",
      "second@example.com",
    ]);
  } finally {
    if (previous === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = previous;
  }
});

test("requireAdmin rejects an active non-admin account", async () => {
  const auth = await import("../../lib/auth.js");
  const prisma = {
    user: {
      findUnique: async () => ({
        id: 2,
        email: "admin2@example.com",
        username: "admin2",
        is_active: true,
      }),
    },
  };

  await assert.rejects(
    auth.requireAdmin(prisma, 2),
    (error) => error.status === 403 && /管理员/.test(error.message),
  );
});

test("requireAdmin fails closed for an active account without an email", async () => {
  const auth = await import("../../lib/auth.js");
  const prisma = {
    user: {
      findUnique: async () => ({
        id: 3,
        email: null,
        username: "phone-user",
        is_active: true,
      }),
    },
  };

  await assert.rejects(
    auth.requireAdmin(prisma, 3),
    (error) => error.status === 403 && /管理员/.test(error.message),
  );
});
