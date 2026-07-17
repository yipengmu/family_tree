const compoundSurnames = [
  "欧阳",
  "司马",
  "上官",
  "诸葛",
  "东方",
  "皇甫",
  "尉迟",
  "公孙",
  "慕容",
  "宇文",
  "长孙",
  "司徒",
  "司空",
  "夏侯",
  "令狐",
  "轩辕",
];

export const getSurnameLabel = (name = "") => {
  const normalizedName = String(name).trim();
  if (!normalizedName) return "家";

  const compoundSurname = compoundSurnames.find((surname) =>
    normalizedName.startsWith(surname),
  );

  return compoundSurname || Array.from(normalizedName)[0];
};
