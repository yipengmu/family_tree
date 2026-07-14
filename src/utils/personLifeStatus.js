export const ALIVE_STATUS = "alive";

export const isPersonAlive = (person = {}) => {
  if (typeof person.alive === "boolean") return person.alive;
  return person.dealth === ALIVE_STATUS || person.death_date === ALIVE_STATUS;
};

const getDeathValue = (person = {}) =>
  person.death_date ?? person.dealth ?? null;

export const normalizePersonLifeStatus = (
  person = {},
  defaultAlive = false,
) => {
  const hasKnownStatus =
    typeof person.alive === "boolean" ||
    person.dealth === ALIVE_STATUS ||
    person.death_date === ALIVE_STATUS ||
    getDeathValue(person) !== null;
  const alive = hasKnownStatus ? isPersonAlive(person) : defaultAlive;
  const currentDeathValue = getDeathValue(person);
  const deathValue = alive
    ? ALIVE_STATUS
    : currentDeathValue === ALIVE_STATUS || currentDeathValue === ""
      ? null
      : currentDeathValue;

  return {
    ...person,
    alive,
    dealth: deathValue,
    death_date: deathValue,
  };
};

export const setPersonAlive = (person = {}, alive) => ({
  ...person,
  alive: Boolean(alive),
  dealth: alive ? ALIVE_STATUS : null,
  death_date: alive ? ALIVE_STATUS : null,
});
