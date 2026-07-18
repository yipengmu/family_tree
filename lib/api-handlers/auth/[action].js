import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma, { ensureConnection } from "../../prisma.js";
import { getJwtSecret } from "../../auth.js";
import {
  checkSmsVerifyCode,
  isAliyunSmsAuthConfigured,
  sendSmsVerifyCode,
} from "../../aliyunSmsAuth.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^1[3-9]\d{9}$/;
const TOKEN_EXPIRES_IN = process.env.AUTH_TOKEN_EXPIRES_IN || "60d";

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizePhone(value) {
  const phone = String(value || "")
    .replace(/\s+/g, "")
    .replace(/^\+86/, "");
  return PHONE_PATTERN.test(phone) ? phone : "";
}

function hashPhone(phone) {
  return crypto
    .createHmac("sha256", process.env.PHONE_IDENTITY_SECRET || getJwtSecret())
    .update(phone)
    .digest("hex");
}

function hashEmail(email) {
  return crypto
    .createHmac("sha256", process.env.PHONE_IDENTITY_SECRET || getJwtSecret())
    .update(email)
    .digest("hex");
}

function maskPhone(phone) {
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

async function issueToken(userId) {
  return jwt.sign({ userId }, getJwtSecret(), { expiresIn: TOKEN_EXPIRES_IN });
}

async function getOrCreateDefaultMembership(tx, user) {
  let membership = await tx.tenantMembership.findFirst({
    where: { user_id: user.id, status: "ACTIVE" },
    include: { tenant: true },
    orderBy: { created_at: "asc" },
  });
  if (!membership) {
    const tenant = await tx.tenant.upsert({
      where: { id: `user_${user.id}` },
      update: {},
      create: {
        id: `user_${user.id}`,
        name: `${user.username || "我的"}的家谱`,
        description: "我的私密数字家谱",
        settings: JSON.stringify({
          publicAccess: false,
          livingPersonPrivacy: true,
          nameProtection: true,
        }),
      },
    });
    membership = await tx.tenantMembership.create({
      data: { tenant_id: tenant.id, user_id: user.id, role: "OWNER" },
      include: { tenant: true },
    });
  }
  return membership;
}

function authPayload(user, membership, token, message) {
  return {
    success: true,
    token,
    user: {
      id: user.id,
      name: user.username,
      email: user.email,
      isActive: user.is_active,
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at,
    },
    tenant: {
      id: membership.tenant.id,
      name: membership.tenant.name,
      description: membership.tenant.description,
      role: membership.role,
      isDefault: false,
    },
    message,
  };
}

function applyCors(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
  );
}

async function handleLogin(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const account = String(req.body?.account || req.body?.email || "").trim();
  const phone = normalizePhone(account);
  const email = phone ? "" : normalizeEmail(account);
  const password = String(req.body?.password || "");

  if ((!phone && (!email || !EMAIL_PATTERN.test(email))) || !password) {
    return res.status(400).json({
      success: false,
      error: "请输入有效的手机号或邮箱及密码",
    });
  }

  await ensureConnection();

  let user;
  if (phone) {
    const identity = await prisma.authIdentity.findUnique({
      where: {
        provider_identifier_hash: {
          provider: "PHONE",
          identifier_hash: hashPhone(phone),
        },
      },
      include: { user: true },
    });
    user = identity?.user;
  } else {
    user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const emailIdentity = await prisma.authIdentity.findUnique({
        where: {
          provider_identifier_hash: {
            provider: "EMAIL",
            identifier_hash: hashEmail(email),
          },
        },
      });
      if (emailIdentity && !emailIdentity.verified_at) {
        return res.status(401).json({
          success: false,
          error: "该邮箱尚未验证，请先使用手机号登录",
        });
      }
    }
  }

  if (!user) {
    return res.status(401).json({
      success: false,
      error: "用户不存在",
    });
  }

  if (!user.password_hash) {
    return res.status(401).json({
      success: false,
      error: "该账号尚未设置密码，请先找回密码",
    });
  }

  const isValidPassword = await bcrypt.compare(password, user.password_hash);

  if (!isValidPassword) {
    return res.status(401).json({
      success: false,
      error: "密码错误",
    });
  }

  const token = await issueToken(user.id);

  let membership = await prisma.tenantMembership.findFirst({
    where: { user_id: user.id, status: "ACTIVE" },
    include: { tenant: true },
    orderBy: { created_at: "asc" },
  });
  if (!membership) {
    membership = await prisma.$transaction(async (tx) => {
        create: {
          id: `user_${user.id}`,
          name: `${user.username}的家谱`,
          description: "我的私密数字家谱",
          settings: JSON.stringify({
            publicAccess: false,
            livingPersonPrivacy: true,
            nameProtection: true,
          }),
        },
      });
      return tx.tenantMembership.create({
        data: { tenant_id: tenant.id, user_id: user.id, role: "OWNER" },
        include: { tenant: true },
      });
    });
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      last_login_at: new Date(),
    },
  });

  return res.status(200).json({
    success: true,
    token,
    user: {
      id: user.id,
      name: user.username,
      email: user.email,
      isActive: user.is_active,
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at,
    },
    tenant: {
      id: membership.tenant.id,
      name: membership.tenant.name,
      description: membership.tenant.description,
      role: membership.role,
      isDefault: false,
    },
    message: "登录成功",
  });
}

async function handleRegister(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rawPhone = String(req.body?.phone || "").trim();
  const phone = normalizePhone(rawPhone);
  const name = String(req.body?.name || "谱里用户").trim();
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");
  const code = String(req.body?.code || "").trim();

  if (rawPhone && !phone) {
    return res
      .status(400)
      .json({ success: false, error: "请输入有效的手机号" });
  }

  if (phone) {
    if (
      password.length < 6 ||
      password.length > 100 ||
      !/^\d{6}$/.test(code) ||
      (email && !EMAIL_PATTERN.test(email))
    ) {
      return res.status(400).json({
        success: false,
        error: "手机号、6位验证码和6至100位密码都是必需的",
      });
    }

    await ensureConnection();
    const targetHash = hashPhone(phone);
    const existingIdentity = await prisma.authIdentity.findUnique({
      where: {
        provider_identifier_hash: {
          provider: "PHONE",
          identifier_hash: targetHash,
        },
      },
    });
    if (existingIdentity) {
      return res
        .status(400)
        .json({ success: false, error: "该手机号已被注册" });
    }

    const attempt = await verifyPhoneCode({
      phone,
      code,
      purpose: "phone_register",
    });
    const passwordHash = await bcrypt.hash(password, 10);
    const registration = await prisma.$transaction(async (tx) => {
      if (email) {
        const existingEmail = await tx.user.findUnique({ where: { email } });
        if (existingEmail) {
          throw new Error("该邮箱已被使用");
        }
      }
      let user;
      try {
        user = await tx.user.create({
          data: {
            username: name || "谱里用户",
            email: email || null,
            password_hash: passwordHash,
            is_active: true,
          },
        });
      } catch (createError) {
        if (
          createError?.code === "P2002" &&
          String(createError?.meta?.target || "").includes("email")
        ) {
          throw new Error("该邮箱已被使用");
        }
        throw createError;
      }
      await tx.authIdentity.create({
        data: {
          user_id: user.id,
          provider: "PHONE",
          identifier_hash: targetHash,
          masked_value: maskPhone(phone),
          verified_at: new Date(),
        },
      });
      if (email) {
        await tx.authIdentity.create({
          data: {
            user_id: user.id,
            provider: "EMAIL",
            identifier_hash: hashEmail(email),
            masked_value: email.replace(/(^.).*(@.*$)/, "$1***$2"),
            verified_at: null,
          },
        });
      }
      const consumed = await tx.verificationAttempt.updateMany({
        where: { id: attempt.id, status: "SENT" },
        data: { status: "CONSUMED", consumed_at: new Date() },
      });
      if (consumed.count !== 1) throw new Error("验证码错误或已过期");
      const membership = await getOrCreateDefaultMembership(tx, user);
      return { user, membership };
    });
    const token = await issueToken(registration.user.id);
    return res
      .status(200)
      .json(
        authPayload(
          registration.user,
          registration.membership,
          token,
          "注册成功",
        ),
      );
  }

  if (!name || !email || !password || !code) {
    return res.status(400).json({
      success: false,
      error: "姓名、邮箱、密码和验证码都是必需的",
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res
      .status(400)
      .json({ success: false, error: "请输入有效的邮箱地址" });
  }

  if (
    name.length > 50 ||
    password.length < 6 ||
    password.length > 100 ||
    !/^\d{6}$/.test(code)
  ) {
    return res
      .status(400)
      .json({ success: false, error: "注册信息格式不正确" });
  }

  await ensureConnection();
    user: {
      id: newUser.id,
      name: newUser.username,
      email: newUser.email,
      isActive: newUser.is_active,
      createdAt: newUser.created_at,
    },
    tenant: {
      id: tenant.id,
      name: tenant.name,
      description: tenant.description,
      role: "OWNER",
      isDefault: false,
    },
    message: "注册成功",
  });
}

async function handleSendCode(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const email = normalizeEmail(req.body?.email);
  const purpose = String(req.body?.purpose || "");

  if (!email || !EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ error: "邮箱地址是必需的" });
  }

  if (!purpose || !["register", "reset"].includes(purpose)) {
    return res
      .status(400)
      .json({ error: "验证码用途必须是 register 或 reset" });
  }

  const { isTencentMailConfigured, sendVerificationEmail } = await import(
    "../../tencentMail.js"
  );

  if (!isTencentMailConfigured()) {
    return res.status(503).json({
      success: false,
      error: "腾讯云邮件服务未配置，请联系管理员",
    });
  }

  if (!process.env.DATABASE_URL) {
    console.error("[验证码] DATABASE_URL 未配置！");
    return res.status(500).json({ success: false, error: "数据库未配置" });
  }

  await ensureConnection();

  const recentRateLimit = await prisma.verificationCode.findFirst({
    where: {
      email,
      purpose: "rate_limit",
      expires_at: {
        gte: new Date(),
      },
    },
  });

  if (recentRateLimit) {
    return res.status(429).json({
      success: false,
      error: "请在60秒后重试",
    });
  }

  if (purpose === "register") {
    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: "该邮箱已被注册",
      });
    }
  }

  if (purpose === "reset") {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    // Do not reveal whether an email has an account. The response remains
    // successful, but no message is sent for an unknown address.
    if (!existingUser) {
      return res.status(200).json({
        success: true,
        message: "如果该邮箱已注册，验证码将发送到邮箱",
      });
    }
    const emailIdentity = await prisma.authIdentity.findUnique({
      where: {
        provider_identifier_hash: {
          provider: "EMAIL",
          identifier_hash: hashEmail(email),
        },
      },
    });
    if (emailIdentity && !emailIdentity.verified_at) {
      return res.status(200).json({
        success: true,
        message: "如果该邮箱已注册，验证码将发送到邮箱",
      });
    }
  }

  const crypto = await import("crypto");
  const code = crypto.randomInt(100000, 999999).toString();

  await prisma.$transaction([
    prisma.verificationCode.deleteMany({
      where: {
        email,
        OR: [{ expires_at: { lt: new Date() } }, { purpose }],
      },
    }),
    prisma.verificationCode.create({
      data: {
        email,
        code,
        purpose,
        expires_at: new Date(Date.now() + 10 * 60 * 1000),
      },
    }),
    prisma.verificationCode.create({
      data: {
        email,
        code: "RATE_LIMIT",
        purpose: "rate_limit",
        expires_at: new Date(Date.now() + 60 * 1000),
      },
    }),
  ]);

  try {
    await sendVerificationEmail({ to: email, code, purpose });
  } catch (emailError) {
    await prisma.verificationCode.deleteMany({
      where: {
        email,
        OR: [
          { code, purpose },
          { code: "RATE_LIMIT", purpose: "rate_limit" },
        ],
      },
    });
    console.error("[验证码] 腾讯云邮件发送失败:", emailError.message);
    return res.status(502).json({
      success: false,
      error: "验证码邮件发送失败，请稍后重试",
    });
  }

  return res.status(200).json({
    success: true,
    message: "验证码已发送",
    timestamp: new Date().toISOString(),
  });
}

async function handleVerifyCode(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const email = normalizeEmail(req.body?.email);
  const code = String(req.body?.code || "").trim();
  const purpose = String(req.body?.purpose || "register");

  if (!email || !EMAIL_PATTERN.test(email) || !code) {
    return res.status(400).json({ error: "邮箱和验证码都是必需的" });
  }

  if (!["register", "reset"].includes(purpose)) {
    return res.status(400).json({ error: "验证码用途不正确" });
  }

  await ensureConnection();

  const verificationCode = await prisma.verificationCode.findFirst({
    where: {
      email,
      code,
      purpose: purpose || "register",
      expires_at: {
        gte: new Date(),
      },
    },
  });

  if (!verificationCode) {
    return res.status(400).json({
      success: false,
      error: "验证码错误或已过期",
    });
  }

  return res.status(200).json({
    success: true,
    message: "验证码验证成功",
    timestamp: new Date().toISOString(),
  });
}

async function handlePhoneSendCode(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });
  const phone = normalizePhone(req.body?.phone);
  const purpose = String(req.body?.purpose || "register");
  if (!phone)
    return res
      .status(400)
      .json({ success: false, error: "请输入有效的手机号" });
  if (!["register", "reset"].includes(purpose)) {
    return res.status(400).json({ success: false, error: "验证码用途不正确" });
  }
  if (!isAliyunSmsAuthConfigured()) {
    return res
      .status(503)
      .json({ success: false, error: "阿里云短信认证服务未配置" });
  }

  await ensureConnection();
  const targetHash = hashPhone(phone);
  const identity = await prisma.authIdentity.findUnique({
    where: {
      provider_identifier_hash: {
        provider: "PHONE",
        identifier_hash: targetHash,
      },
    },
  });
  if (purpose === "register" && identity) {
    return res.status(400).json({ success: false, error: "该手机号已被注册" });
  }
  if (purpose === "reset" && !identity) {
    return res.status(200).json({
      success: true,
      message: "如果该手机号已注册，验证码将发送到手机",
    });
  }
  const attemptPurpose = `phone_${purpose}`;
  const recent = await prisma.verificationAttempt.findFirst({
    where: {
      target_hash: targetHash,
      purpose: attemptPurpose,
      created_at: { gte: new Date(Date.now() - 60 * 1000) },
    },
  });
  if (recent)
    return res.status(429).json({ success: false, error: "请在60秒后重试" });

  const outId = crypto.randomUUID();
  let response;
  try {
    response = await sendSmsVerifyCode({ phoneNumber: phone, outId });
  } catch (error) {
    console.error("阿里云短信发送失败:", error.message);
    return res
      .status(502)
      .json({ success: false, error: "验证码发送失败，请稍后重试" });
  }
  const body = response?.body || response;
  if (body?.success === false || (body?.code && body.code !== "OK")) {
    console.error("阿里云短信发送被拒绝:", body?.code, body?.message);
    return res
      .status(502)
      .json({ success: false, error: "验证码发送失败，请稍后重试" });
  }
  await prisma.verificationAttempt.create({
    data: {
      target_hash: targetHash,
      purpose: attemptPurpose,
      provider: "ALIYUN_PNVS",
      provider_out_id: outId,
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
    },
  });
  return res.status(200).json({ success: true, message: "验证码已发送" });
}

async function verifyPhoneCode({ phone, code, purpose }) {
  if (!isAliyunSmsAuthConfigured()) {
    throw new Error("阿里云短信认证服务未配置");
  }

  const targetHash = hashPhone(phone);
  const attempt = await prisma.verificationAttempt.findFirst({
    where: {
      target_hash: targetHash,
      purpose,
      status: "SENT",
      expires_at: { gte: new Date() },
    },
    orderBy: { created_at: "desc" },
  });
  if (!attempt || attempt.failed_attempts >= 5) {
    throw new Error("验证码错误或已过期");
  }

  let response;
  try {
    response = await checkSmsVerifyCode({
      phoneNumber: phone,
      verifyCode: code,
      outId: attempt.provider_out_id || undefined,
    });
  } catch (error) {
    console.error("阿里云短信核验失败:", error.message);
    throw new Error("验证码校验失败，请稍后重试");
  }
  const body = response?.body || response;
  const verified =
    body?.success === true && body?.model?.verifyResult === "PASS";
  if (!verified) {
    await prisma.verificationAttempt.update({
      where: { id: attempt.id },
      data: {
        failed_attempts: { increment: 1 },
        status: attempt.failed_attempts + 1 >= 5 ? "LOCKED" : "SENT",
      },
    });
    throw new Error("验证码错误或已过期");
  }
  return attempt;
}

async function handleResetPassword(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const account = String(req.body?.account || req.body?.email || "").trim();
  const phone = normalizePhone(account);
  const email = phone ? "" : normalizeEmail(account);
  const code = String(req.body?.code || "").trim();
  const newPassword = String(req.body?.newPassword || "");

  if (
    (!phone && (!email || !EMAIL_PATTERN.test(email))) ||
    !/^\d{6}$/.test(code) ||
    newPassword.length < 6 ||
    newPassword.length > 100
  ) {
    return res.status(400).json({
      success: false,
      error: "手机号或邮箱、6位验证码和6至100位新密码都是必需的",
    });
  }

  await ensureConnection();
  const passwordHash = await bcrypt.hash(newPassword, 10);

  if (phone) {
    const targetHash = hashPhone(phone);
    const identity = await prisma.authIdentity.findUnique({
      where: {
        provider_identifier_hash: {
          provider: "PHONE",
          identifier_hash: targetHash,
        },
      },
    });
    if (!identity) throw new Error("验证码错误或已过期");
    const attempt = await verifyPhoneCode({
      phone,
      code,
      purpose: "phone_reset",
    });
    await prisma.$transaction(async (tx) => {
      });
      if (consumed.count !== 1) throw new Error("验证码错误或已过期");
      await tx.user.update({
        where: { id: identity.user_id },
        data: { password_hash: passwordHash },
      });
    });
    return res.status(200).json({
      success: true,
      message: "密码重置成功，请使用新密码登录",
    });
  }

  await prisma.$transaction(async (tx) => {
      where: {
        provider_identifier_hash: {
          provider: "EMAIL",
          identifier_hash: hashEmail(email),
        },
      },
    });
    if (emailIdentity && !emailIdentity.verified_at) {
      throw new Error("验证码错误或已过期");
    }

    const verificationCode = await tx.verificationCode.findFirst({
      where: {
        email,
        code,
        purpose: "reset",
        expires_at: { gte: new Date() },
      },
      orderBy: { created_at: "desc" },
    });
    if (!verificationCode) throw new Error("验证码错误或已过期");

    const deleted = await tx.verificationCode.deleteMany({
      where: { id: verificationCode.id },
    });
    if (deleted.count !== 1) throw new Error("验证码错误或已过期");

    await tx.user.update({
      where: { id: user.id },
      data: { password_hash: passwordHash },
    });
  });

  return res.status(200).json({
    success: true,
    message: "密码重置成功，请使用新密码登录",
  });
}

const handlers = {
  login: handleLogin,
  register: handleRegister,
  "send-code": handleSendCode,
  "verify-code": handleVerifyCode,
  "phone-send-code": handlePhoneSendCode,
  "reset-password": handleResetPassword,
};

export default async function handler(req, res) {
  applyCors(req, res);

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const action = Array.isArray(req.query.action)
    ? req.query.action[0]
    : req.query.action;
  const routeHandler = handlers[action];

  if (!routeHandler) {
    return res
      .status(404)
      .json({ success: false, error: "Auth endpoint not found" });
  }

  try {
    return await routeHandler(req, res);
  } catch (error) {
    console.error(`认证接口 ${action} 调用失败:`, error);
    const clientError = [
      "该邮箱已被注册",
      "该邮箱已被使用",
      "验证码错误或已过期",
      "手机号和6位验证码都是必需的",
      "手机号、6位验证码和6至100位密码都是必需的",
      "手机号或邮箱、6位验证码和6至100位新密码都是必需的",
      "阿里云短信认证服务未配置",
      "验证码校验失败，请稍后重试",
      "该手机号已被注册",
      "该邮箱已被使用",
    ].includes(error.message);
    return res.status(clientError ? 400 : 500).json({
      success: false,
      error: error.message || "服务器内部错误",
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};
