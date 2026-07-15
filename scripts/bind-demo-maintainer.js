import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import familyData from "../src/data/familyData.js";
import { DEFAULT_TENANT_ID } from "../lib/auth.js";
import { getCurrentVersion, toDatabasePerson } from "../lib/familyData.js";

const prisma = new PrismaClient();

function readOption(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

function parseArguments() {
  const email = String(readOption("--email") || "")
    .trim()
    .toLowerCase();
  const tenantId = String(readOption("--tenant-id") || "").trim() || null;
  const apply = process.argv.includes("--apply");

  if (!email) {
    throw new Error(
      "缺少 --email，例如：node scripts/bind-demo-maintainer.js --email owner@example.com",
    );
  }

  return { email, tenantId, apply };
}

async function findTarget({ email, tenantId }) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      memberships: {
        where: {
          role: "OWNER",
          status: "ACTIVE",
          ...(tenantId ? { tenant_id: tenantId } : {}),
        },
        include: { tenant: true },
      },
    },
  });

  if (!user) throw new Error(`未找到账号：${email}`);
  if (user.memberships.length === 0) {
    throw new Error("该账号没有可用的 Owner 家谱空间");
  }
  if (user.memberships.length > 1 && !tenantId) {
    throw new Error("该账号拥有多个家谱，请使用 --tenant-id 明确指定维护空间");
  }

  const membership = user.memberships[0];
  if (membership.tenant_id === DEFAULT_TENANT_ID) {
    throw new Error("公开示范租户不能作为可编辑维护空间");
  }

  return { user, tenant: membership.tenant };
}

async function main() {
  const options = parseArguments();
  const { user, tenant } = await findTarget(options);
  const [personCount, memoryCount, eventCount] = await Promise.all([
    prisma.familyData.count({ where: { tenant_id: tenant.id } }),
    prisma.memory.count({ where: { tenant_id: tenant.id } }),
    prisma.event.count({ where: { tenant_id: tenant.id } }),
  ]);

  console.log(
    JSON.stringify(
      {
        mode: options.apply ? "apply" : "dry-run",
        account: user.email,
        tenantId: tenant.id,
        currentTenantName: tenant.name,
        currentCounts: {
          people: personCount,
          memories: memoryCount,
          events: eventCount,
        },
        importPeople: familyData.length,
        publicDemoRemainsSeparate: true,
      },
      null,
      2,
    ),
  );

  if (personCount > 0 || memoryCount > 0 || eventCount > 0) {
    throw new Error("目标家谱不是空空间，已拒绝覆盖；请人工核对和迁移现有数据");
  }

  if (!options.apply) {
    console.log("dry-run 完成；确认后增加 --apply 执行绑定与初始化");
    return;
  }

  const normalized = familyData.map((person) =>
    toDatabasePerson(person, tenant.id),
  );

  const result = await prisma.$transaction(
    async (tx) => {
      const latestCounts = await Promise.all([
        tx.familyData.count({ where: { tenant_id: tenant.id } }),
        tx.memory.count({ where: { tenant_id: tenant.id } }),
        tx.event.count({ where: { tenant_id: tenant.id } }),
      ]);
      if (latestCounts.some((count) => count > 0)) {
        throw new Error("执行前目标家谱已产生数据，已拒绝覆盖");
      }

      const currentSettings = JSON.parse(tenant.settings || "{}");
      await tx.tenant.update({
        where: { id: tenant.id },
        data: {
          name: "穆氏家谱",
          description: "穆氏示范家谱的私密维护空间；公开展示需经过单独发布",
          settings: JSON.stringify({
            ...currentSettings,
            publicAccess: false,
            livingPersonPrivacy: true,
            nameProtection: true,
            demoMaintenanceSource: true,
          }),
        },
      });
      await tx.familyData.createMany({ data: normalized });

      const nextVersion = (await getCurrentVersion(tx, tenant.id)) + 1;
      await tx.dataVersion.create({
        data: {
          tenant_id: tenant.id,
          version_number: nextVersion,
          data_snapshot: JSON.stringify(familyData),
          description: `绑定穆氏示范家谱维护账号 ${user.id}`,
        },
      });

      return { importedPeople: normalized.length, version: nextVersion };
    },
    { isolationLevel: "Serializable" },
  );

  console.log(
    JSON.stringify(
      {
        success: true,
        account: user.email,
        tenantId: tenant.id,
        tenantName: "穆氏家谱",
        ...result,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
