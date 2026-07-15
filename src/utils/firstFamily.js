import { normalizePersonLifeStatus } from "./personLifeStatus.js";

const cleanName = (value) => String(value || "").trim();

const createPerson = ({
  id,
  name,
  sex,
  generation,
  rankIndex,
  fatherId = 0,
  motherId = null,
  birthDate = "",
  location = "",
  alive,
  now,
}) => {
  const hasConfirmedLifeStatus = typeof alive === "boolean";
  return normalizePersonLifeStatus(
    {
      id,
      name,
      g_rank: generation,
      rank_index: rankIndex,
      g_father_id: fatherId,
      g_mother_id: motherId,
      official_position: "",
      summary: "",
      adoption: "none",
      sex,
      birth_date: birthDate,
      id_card: "",
      face_img: "",
      photos: "",
      household_info: "",
      spouse: "",
      home_page: "",
      formal_name: "",
      location,
      childrens: "",
      ...(hasConfirmedLifeStatus
        ? { alive }
        : { dealth: "unknown", death_date: "unknown" }),
      created_at: now,
      updated_at: now,
    },
    hasConfirmedLifeStatus ? alive : false,
  );
};

export const countFirstFamilyMembers = (values = {}) => {
  const names = [values.selfName, values.fatherName, values.motherName];
  if (cleanName(values.fatherName)) {
    names.push(values.paternalGrandfatherName, values.paternalGrandmotherName);
  }
  if (cleanName(values.motherName)) {
    names.push(values.maternalGrandfatherName, values.maternalGrandmotherName);
  }
  return names.filter((name) => cleanName(name)).length;
};

export const buildFirstFamily = (
  values = {},
  now = new Date().toISOString(),
) => {
  const names = {
    self: cleanName(values.selfName),
    father: cleanName(values.fatherName),
    mother: cleanName(values.motherName),
    paternalGrandfather: cleanName(values.paternalGrandfatherName),
    paternalGrandmother: cleanName(values.paternalGrandmotherName),
    maternalGrandfather: cleanName(values.maternalGrandfatherName),
    maternalGrandmother: cleanName(values.maternalGrandmotherName),
  };

  if (!names.father) {
    names.paternalGrandfather = "";
    names.paternalGrandmother = "";
  }
  if (!names.mother) {
    names.maternalGrandfather = "";
    names.maternalGrandmother = "";
  }

  if (!names.self) throw new Error("请先填写你的姓名");

  const hasGrandparents = Boolean(
    names.paternalGrandfather ||
      names.paternalGrandmother ||
      names.maternalGrandfather ||
      names.maternalGrandmother,
  );
  const hasParents = Boolean(names.father || names.mother);
  const selfGeneration = hasGrandparents ? 3 : hasParents ? 2 : 1;
  const parentGeneration = selfGeneration - 1;
  const grandparentGeneration = 1;
  let nextId = 1;
  const people = [];
  const ids = {};

  const addPerson = (key, person) => {
    if (!names[key]) return null;
    const id = nextId;
    nextId += 1;
    ids[key] = id;
    people.push(createPerson({ id, name: names[key], now, ...person }));
    return id;
  };

  if (names.father) {
    addPerson("paternalGrandfather", {
      sex: "MAN",
      generation: grandparentGeneration,
      rankIndex: 1,
    });
    addPerson("paternalGrandmother", {
      sex: "WOMAN",
      generation: grandparentGeneration,
      rankIndex: 2,
    });
  }

  if (names.mother) {
    addPerson("maternalGrandfather", {
      sex: "MAN",
      generation: grandparentGeneration,
      rankIndex:
        people.filter((person) => person.g_rank === grandparentGeneration)
          .length + 1,
    });
    addPerson("maternalGrandmother", {
      sex: "WOMAN",
      generation: grandparentGeneration,
      rankIndex:
        people.filter((person) => person.g_rank === grandparentGeneration)
          .length + 1,
    });
  }

  addPerson("father", {
    sex: "MAN",
    generation: parentGeneration,
    rankIndex: 1,
    fatherId: ids.paternalGrandfather || 0,
    motherId: ids.paternalGrandmother || null,
  });
  addPerson("mother", {
    sex: "WOMAN",
    generation: parentGeneration,
    rankIndex: names.father ? 2 : 1,
    fatherId: ids.maternalGrandfather || 0,
    motherId: ids.maternalGrandmother || null,
  });
  addPerson("self", {
    sex: values.selfSex || "MAN",
    generation: selfGeneration,
    rankIndex: 1,
    fatherId: ids.father || 0,
    motherId: ids.mother || null,
    birthDate: String(values.birthDate || "").trim(),
    location: String(values.location || "").trim(),
    alive: true,
  });

  return people;
};
