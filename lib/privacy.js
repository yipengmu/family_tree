const SENSITIVE_FIELDS = [
  'id_card',
  'household_info',
  'home_page',
  'face_img',
  'photos',
];

export const DEFAULT_PRIVACY_SETTINGS = {
  living: {
    birthDate: 'YEAR',
    location: 'HIDDEN',
    sensitiveFields: 'HIDDEN',
  },
  deceased: {
    sensitiveFields: 'HIDDEN',
  },
};

const asObject = (value) => {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

export function getPrivacySettings(settings) {
  const parsed = asObject(settings);
  return {
    ...DEFAULT_PRIVACY_SETTINGS,
    ...(parsed.privacy || {}),
    living: {
      ...DEFAULT_PRIVACY_SETTINGS.living,
      ...(parsed.privacy?.living || {}),
    },
    deceased: {
      ...DEFAULT_PRIVACY_SETTINGS.deceased,
      ...(parsed.privacy?.deceased || {}),
    },
  };
}

const yearOnly = (value) => String(value || '').match(/\d{4}/)?.[0] || null;

export function redactPerson(person, { role = 'VIEWER', tenantSettings, publicView = false } = {}) {
  if (!person) return person;
  if (!publicView && ['OWNER', 'EDITOR'].includes(role)) return person;

  const living = person.alive === true || person.death_date === 'alive' || person.dealth === 'alive';
  const lifeStatusUnknown = person.death_date === 'unknown' || person.dealth === 'unknown';
  const privacy = getPrivacySettings(tenantSettings);
  // 生存状态不确定时按更严格的在世规则处理，避免误放出可能仍在世人物的资料。
  const protectedAsLiving = living || lifeStatusUnknown;
  const rule = protectedAsLiving ? privacy.living : privacy.deceased;
  const redacted = { ...person };

  if (rule.sensitiveFields !== 'FAMILY' || publicView) {
    SENSITIVE_FIELDS.forEach((field) => {
      redacted[field] = null;
    });
  }

  if (protectedAsLiving) {
    if (rule.birthDate === 'HIDDEN' || publicView) redacted.birth_date = null;
    else if (rule.birthDate !== 'FULL') redacted.birth_date = yearOnly(person.birth_date);

    if (rule.location !== 'FAMILY' || publicView) redacted.location = null;
  }

  return redacted;
}

export function sanitizePrivacySettings(input = {}) {
  const source = input.privacy || input;
  const birthDate = ['HIDDEN', 'YEAR', 'FULL'].includes(source.living?.birthDate)
    ? source.living.birthDate
    : DEFAULT_PRIVACY_SETTINGS.living.birthDate;
  const location = ['HIDDEN', 'FAMILY'].includes(source.living?.location)
    ? source.living.location
    : DEFAULT_PRIVACY_SETTINGS.living.location;
  const sensitiveFields = ['HIDDEN', 'FAMILY'].includes(source.living?.sensitiveFields)
    ? source.living.sensitiveFields
    : DEFAULT_PRIVACY_SETTINGS.living.sensitiveFields;

  return {
    living: { birthDate, location, sensitiveFields },
    deceased: { sensitiveFields: 'HIDDEN' },
  };
}
