import { ApiAuthError } from './auth.js';

const asText = (value) => {
  if (value === undefined || value === null || value === '') return null;
  return typeof value === 'string' ? value : JSON.stringify(value);
};

const asPersonId = (value) => {
  if (value === undefined || value === null || value === '' || value === 0 || value === '0') return null;
  return String(value);
};

const getDeathValue = (item = {}) => {
  const currentValue = item.death_date ?? item.dealth ?? null;
  if (item.alive === true) return 'alive';
  if (item.alive === false && currentValue === 'alive') return null;
  return asText(currentValue);
};

export const isLivingPerson = (person = {}) => {
  if (typeof person.alive === 'boolean') return person.alive;
  return person.death_date === 'alive' || person.dealth === 'alive';
};

export function toDatabasePerson(item, tenantId) {
  const personId = String(item.person_id ?? item.id ?? '').trim();
  if (!personId || !String(item.name || '').trim()) {
    throw new ApiAuthError(400, '每位族人都必须包含 id 和姓名');
  }

  return {
    tenant_id: tenantId,
    person_id: personId,
    name: String(item.name).trim(),
    g_rank: Number(item.g_rank) || 1,
    rank_index: Number(item.rank_index) || 0,
    g_father_id: asPersonId(item.g_father_id),
    g_mother_id: asPersonId(item.g_mother_id),
    sex: item.sex || 'MAN',
    adoption: item.adoption || 'none',
    official_position: asText(item.official_position),
    summary: asText(item.summary),
    birth_date: asText(item.birth_date),
    death_date: getDeathValue(item),
    spouse: asText(item.spouse),
    location: asText(item.location),
    formal_name: asText(item.formal_name),
    id_card: asText(item.id_card),
    face_img: asText(item.face_img) || '',
    photos: asText(item.photos),
    household_info: asText(item.household_info),
    home_page: asText(item.home_page),
    childrens: asText(item.childrens),
  };
}

export function toClientPerson(record) {
  const numericId = Number(record.person_id);
  return {
    id: Number.isNaN(numericId) ? record.person_id : numericId,
    person_id: record.person_id,
    name: record.name,
    g_rank: record.g_rank,
    rank_index: record.rank_index,
    g_father_id: record.g_father_id ? (Number.isNaN(Number(record.g_father_id)) ? record.g_father_id : Number(record.g_father_id)) : 0,
    g_mother_id: record.g_mother_id ? (Number.isNaN(Number(record.g_mother_id)) ? record.g_mother_id : Number(record.g_mother_id)) : null,
    sex: record.sex,
    adoption: record.adoption,
    official_position: record.official_position,
    summary: record.summary,
    birth_date: record.birth_date,
    death_date: record.death_date,
    dealth: record.death_date,
    alive: record.death_date === 'alive',
    spouse: record.spouse,
    location: record.location,
    formal_name: record.formal_name,
    id_card: record.id_card,
    face_img: record.face_img,
    photos: record.photos,
    household_info: record.household_info,
    home_page: record.home_page,
    childrens: record.childrens,
    updated_at: record.updated_at,
  };
}

export function redactLivingPerson(person, role) {
  if (['OWNER', 'EDITOR'].includes(role) || !isLivingPerson(person)) return person;
  const birthYear = String(person.birth_date || '').match(/\d{4}/)?.[0] || null;
  return {
    ...person,
    id_card: null,
    household_info: null,
    birth_date: birthYear,
    home_page: null,
  };
}

export async function getCurrentVersion(prisma, tenantId) {
  const latest = await prisma.dataVersion.aggregate({
    where: { tenant_id: tenantId },
    _max: { version_number: true },
  });
  return latest._max.version_number || 0;
}

export async function replaceFamilyData(prisma, { tenantId, familyData, expectedVersion, userId }) {
  const normalized = familyData.map((item) => toDatabasePerson(item, tenantId));

  try {
    return await prisma.$transaction(async (tx) => {
      const currentVersion = await getCurrentVersion(tx, tenantId);
      if (expectedVersion !== undefined && expectedVersion !== null && Number(expectedVersion) !== currentVersion) {
        throw new ApiAuthError(409, '家谱已被其他成员更新，请刷新后再保存');
      }

      await tx.familyData.deleteMany({ where: { tenant_id: tenantId } });
      if (normalized.length) await tx.familyData.createMany({ data: normalized });

      const nextVersion = currentVersion + 1;
      await tx.dataVersion.create({
        data: {
          tenant_id: tenantId,
          version_number: nextVersion,
          data_snapshot: JSON.stringify(familyData),
          description: `用户 ${userId} 保存家谱`,
        },
      });
      return nextVersion;
    }, { isolationLevel: 'Serializable' });
  } catch (error) {
    if (error instanceof ApiAuthError) throw error;
    if (error?.code === 'P2002' || error?.code === 'P2034') {
      throw new ApiAuthError(409, '家谱已被其他成员更新，请刷新后再保存');
    }
    throw error;
  }
}
