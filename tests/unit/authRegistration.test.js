const test = require("node:test");
const assert = require("node:assert/strict");

async function loadRegistrationHelpers() {
  return import("../../lib/api-handlers/auth/[action].js");
}

test("registration transactions allow bounded Neon latency", async () => {
  const { runRegistrationTransaction } = await loadRegistrationHelpers();
  let receivedOptions;
  const fakeClient = {
    $transaction: async (operation, options) => {
      receivedOptions = options;
      return operation("transaction-client");
    },
  };

  const result = await runRegistrationTransaction(fakeClient, async (tx) => tx);

  assert.equal(result, "transaction-client");
  assert.deepEqual(receivedOptions, { maxWait: 5000, timeout: 15000 });
});

test("new users create their private tenant and owner membership together", async () => {
  const { createDefaultMembership } = await loadRegistrationHelpers();
  let createArgs;
  const expectedMembership = {
    role: "OWNER",
    tenant: { id: "user_42", name: "小谱的家谱" },
  };
  const tx = {
    tenantMembership: {
      create: async (args) => {
        createArgs = args;
        return expectedMembership;
      },
    },
  };

  const membership = await createDefaultMembership(tx, {
    id: 42,
    username: "小谱",
  });

  assert.equal(membership, expectedMembership);
  assert.equal(createArgs.data.role, "OWNER");
  assert.equal(createArgs.data.tenant.create.id, "user_42");
  assert.equal(createArgs.data.tenant.create.name, "小谱的家谱");
  assert.deepEqual(createArgs.data.user, { connect: { id: 42 } });
  assert.deepEqual(createArgs.include, { tenant: true });
});

test("Prisma internals stay in logs instead of reaching the registration UI", async () => {
  const { getPublicAuthError } = await loadRegistrationHelpers();
  const response = getPublicAuthError(
    "register",
    new Error("Transaction API error: Transaction not found"),
  );

  assert.deepEqual(response, {
    statusCode: 500,
    message: "注册暂时失败，请稍后重试",
  });
});

test("expected registration validation errors remain actionable", async () => {
  const { getPublicAuthError } = await loadRegistrationHelpers();
  const response = getPublicAuthError("register", new Error("该邮箱已被使用"));

  assert.deepEqual(response, {
    statusCode: 400,
    message: "该邮箱已被使用",
  });
});

test("repeatable phone registration requires an allowlist and a future expiry", async () => {
  const { isRepeatableRegistrationPhone } = await loadRegistrationHelpers();
  const now = Date.parse("2026-08-10T00:00:00.000Z");
  const env = {
    REPEATABLE_REGISTRATION_PHONES: "13800000000, 13900000000",
    REPEATABLE_PHONE_REGISTRATION_EXPIRES_AT: "2026-08-11T00:00:00.000Z",
  };

  assert.equal(isRepeatableRegistrationPhone("13800000000", env, now), true);
  assert.equal(isRepeatableRegistrationPhone("13700000000", env, now), false);
  assert.equal(
    isRepeatableRegistrationPhone(
      "13800000000",
      {
        ...env,
        REPEATABLE_PHONE_REGISTRATION_EXPIRES_AT: "2026-08-09T00:00:00.000Z",
      },
      now,
    ),
    false,
  );
});

test("repeatable phone registration reassigns the login identity", async () => {
  const { bindPhoneIdentity } = await loadRegistrationHelpers();
  let upsertArgs;
  const expectedIdentity = { id: "phone-identity", user_id: 42 };
  const tx = {
    authIdentity: {
      upsert: async (args) => {
        upsertArgs = args;
        return expectedIdentity;
      },
    },
  };

  const identity = await bindPhoneIdentity(tx, {
    userId: 42,
    targetHash: "hashed-phone",
    maskedValue: "138****0000",
    repeatable: true,
  });

  assert.equal(identity, expectedIdentity);
  assert.deepEqual(upsertArgs.where, {
    provider_identifier_hash: {
      provider: "PHONE",
      identifier_hash: "hashed-phone",
    },
  });
  assert.equal(upsertArgs.create.user_id, 42);
  assert.equal(upsertArgs.update.user_id, 42);
});

test("ordinary phone registration still creates a unique identity", async () => {
  const { bindPhoneIdentity } = await loadRegistrationHelpers();
  let createArgs;
  const tx = {
    authIdentity: {
      create: async (args) => {
        createArgs = args;
        return { id: "phone-identity" };
      },
    },
  };

  await bindPhoneIdentity(tx, {
    userId: 42,
    targetHash: "hashed-phone",
    maskedValue: "138****0000",
    repeatable: false,
  });

  assert.equal(createArgs.data.user_id, 42);
  assert.equal(createArgs.data.provider, "PHONE");
});

test("repeatable registration only reuses the email owned by the old test account", async () => {
  const { prepareRepeatableRegistrationEmail } =
    await loadRegistrationHelpers();
  const existingEmailIdentity = { id: "email-identity", user_id: 42 };
  const updates = [];
  const tx = {
    user: {
      findUnique: async () => ({ id: 42, email: "test@example.com" }),
      update: async (args) => updates.push(args),
    },
    authIdentity: {
      findUnique: async () => existingEmailIdentity,
    },
  };

  const result = await prepareRepeatableRegistrationEmail(tx, {
    email: "test@example.com",
    repeatablePhone: true,
    previousPhoneUserId: 42,
  });

  assert.equal(result.existingEmailIdentity, existingEmailIdentity);
  assert.deepEqual(updates, [{ where: { id: 42 }, data: { email: null } }]);

  await assert.rejects(
    prepareRepeatableRegistrationEmail(tx, {
      email: "test@example.com",
      repeatablePhone: true,
      previousPhoneUserId: 99,
    }),
    { message: "该邮箱已被使用" },
  );
});

test("reused email identity moves to the new test account without becoming verified", async () => {
  const { bindEmailIdentity } = await loadRegistrationHelpers();
  let updateArgs;
  const tx = {
    authIdentity: {
      update: async (args) => {
        updateArgs = args;
        return { id: "email-identity" };
      },
    },
  };

  await bindEmailIdentity(tx, {
    userId: 99,
    email: "test@example.com",
    existingIdentity: { id: "email-identity" },
  });

  assert.deepEqual(updateArgs, {
    where: { id: "email-identity" },
    data: {
      user_id: 99,
      masked_value: "t***@example.com",
      verified_at: null,
    },
  });
});
