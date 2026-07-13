import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma, { ensureConnection } from "../../lib/prisma.js";
import { getJwtSecret } from "../../lib/auth.js";
import {
  isTencentMailConfigured,
  sendVerificationEmail,
} from "../../lib/tencentMail.js";

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

  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: "邮箱和密码都是必需的",
    });
  }

  await ensureConnection();

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    return res.status(401).json({
      success: false,
      error: "用户不存在",
    });
  }

  const isValidPassword = await bcrypt.compare(password, user.password_hash);

  if (!isValidPassword) {
    return res.status(401).json({
      success: false,
      error: "密码错误",
    });
  }

  const token = jwt.sign({ userId: user.id }, getJwtSecret(), {
    expiresIn: "24h",
  });

  let membership = await prisma.tenantMembership.findFirst({
    where: { user_id: user.id, status: "ACTIVE" },
    include: { tenant: true },
    orderBy: { created_at: "asc" },
  });
  if (!membership) {
    membership = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.upsert({
        where: { id: `user_${user.id}` },
        update: {},
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

  const name = String(req.body?.name || "").trim();
  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();
  const password = String(req.body?.password || "");
  const code = String(req.body?.code || "").trim();

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

  const passwordHash = await bcrypt.hash(password, 10);
  const registration = await prisma.$transaction(async (tx) => {
    const existingUser = await tx.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error("该邮箱已被注册");
    }

    const verificationCode = await tx.verificationCode.findFirst({
      where: {
        email,
        code,
        purpose: "register",
        expires_at: { gte: new Date() },
      },
    });
    if (!verificationCode) {
      throw new Error("验证码错误或已过期");
    }

    await tx.verificationCode.delete({ where: { id: verificationCode.id } });
    const user = await tx.user.create({
      data: {
        username: name,
        email,
        password_hash: passwordHash,
        is_active: true,
      },
    });
    const tenant = await tx.tenant.create({
      data: {
        id: `user_${user.id}`,
        name: `${name}的家谱`,
        description: "我的私密数字家谱",
        settings: JSON.stringify({
          publicAccess: false,
          livingPersonPrivacy: true,
          nameProtection: true,
        }),
      },
    });
    await tx.tenantMembership.create({
      data: { tenant_id: tenant.id, user_id: user.id, role: "OWNER" },
    });
    return { user, tenant };
  });

  const { user: newUser, tenant } = registration;
  const token = jwt.sign({ userId: newUser.id }, getJwtSecret(), {
    expiresIn: "24h",
  });

  return res.status(200).json({
    success: true,
    token,
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

  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();
  const { purpose } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: "邮箱地址是必需的" });
  }

  if (!purpose || !["register", "reset"].includes(purpose)) {
    return res
      .status(400)
      .json({ error: "验证码用途必须是 register 或 reset" });
  }

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
        expires_at: new Date(Date.now() + 5 * 60 * 1000),
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

  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();
  const code = String(req.body?.code || "").trim();
  const { purpose } = req.body || {};

  if (!email || !code) {
    return res.status(400).json({ error: "邮箱和验证码都是必需的" });
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

const handlers = {
  login: handleLogin,
  register: handleRegister,
  "send-code": handleSendCode,
  "verify-code": handleVerifyCode,
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
    const clientError = ["该邮箱已被注册", "验证码错误或已过期"].includes(
      error.message,
    );
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
