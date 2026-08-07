const personId = (person) => String(person?.person_id ?? person?.id ?? "");

const relationId = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    value === 0 ||
    value === "0"
  ) {
    return "";
  }
  return String(value);
};

const childLabel = (person) => {
  if (person?.sex === "MAN") return "儿子";
  if (person?.sex === "WOMAN") return "女儿";
  return "孩子";
};

const descendantRole = (person) => {
  if (person?.sex === "MAN") return "父亲";
  if (person?.sex === "WOMAN") return "母亲";
  return "长辈";
};

const parentChildRole = (person) => {
  if (person?.sex === "MAN") return "儿子";
  if (person?.sex === "WOMAN") return "女儿";
  return "孩子";
};

export const getPersonFamilyContext = (person, familyData = []) => {
  if (!person) return { headline: "家谱成员", relations: [] };

  const byId = new Map(
    familyData
      .map((item) => [personId(item), item])
      .filter(([id]) => Boolean(id)),
  );
  const id = personId(person);
  const father = byId.get(relationId(person.g_father_id));
  const mother = byId.get(relationId(person.g_mother_id));
  const children = familyData.filter((item) => {
    const fatherId = relationId(item.g_father_id);
    const motherId = relationId(item.g_mother_id);
    return id && (fatherId === id || motherId === id);
  });

  let headline = person.g_rank ? `第 ${person.g_rank} 代家谱成员` : "家谱成员";
  if (children.length === 1) {
    headline = `${children[0].name}的${descendantRole(person)}`;
  } else if (children.length > 1) {
    headline = `${children[0].name}等 ${children.length} 位家人的${descendantRole(person)}`;
  } else if (father || mother) {
    headline = `${(father || mother).name}的${parentChildRole(person)}`;
  }

  const relations = [];
  if (father)
    relations.push({
      key: `father-${personId(father)}`,
      label: "父亲",
      person: father,
    });
  if (mother)
    relations.push({
      key: `mother-${personId(mother)}`,
      label: "母亲",
      person: mother,
    });
  if (person.spouse) {
    relations.push({
      key: "spouse",
      label: "配偶",
      text: String(person.spouse),
    });
  }
  children.slice(0, 6).forEach((child) => {
    relations.push({
      key: `child-${personId(child)}`,
      label: childLabel(child),
      person: child,
    });
  });

  return {
    headline,
    relations,
    hiddenRelationCount: Math.max(0, children.length - 6),
  };
};
