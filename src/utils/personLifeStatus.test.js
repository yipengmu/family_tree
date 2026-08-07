import {
  getPersonLifeStatus,
  isPersonAlive,
  normalizePersonLifeStatus,
  setPersonAlive,
} from "./personLifeStatus.js";
import {
  DEFAULT_FAMILY_MEMBER,
  DEATH_STATUS_OPTIONS,
} from "../constants/defaults.js";

describe("personLifeStatus", () => {
  test("recognizes the legacy alive marker", () => {
    expect(isPersonAlive({ dealth: "alive" })).toBe(true);
    expect(isPersonAlive({ death_date: "alive" })).toBe(true);
    expect(isPersonAlive({ dealth: null })).toBe(false);
  });

  test("uses an explicit alive choice over stale legacy fields", () => {
    expect(isPersonAlive({ alive: false, dealth: "alive" })).toBe(false);
  });

  test("keeps missing survival facts visibly unconfirmed", () => {
    expect(getPersonLifeStatus({ dealth: null })).toBe("unknown");
    expect(getPersonLifeStatus({ death_date: "unknown" })).toBe("unknown");
    expect(getPersonLifeStatus({ dealth: "dealth" })).toBe("deceased");
    expect(getPersonLifeStatus({ alive: true })).toBe("living");
  });

  test("creates new people as living and keeps all compatibility fields aligned", () => {
    expect(normalizePersonLifeStatus({ name: "新成员" }, true)).toMatchObject({
      alive: true,
      dealth: "alive",
      death_date: "alive",
    });
  });

  test("updates the editable field and persistence fields together", () => {
    expect(
      setPersonAlive({ name: "新成员", dealth: "alive" }, false),
    ).toMatchObject({
      alive: false,
      dealth: null,
      death_date: null,
    });
  });

  test("keeps shared field defaults and select options compatible with persistence", () => {
    expect(DEFAULT_FAMILY_MEMBER).toMatchObject({
      alive: true,
      dealth: "alive",
      death_date: "alive",
    });
    expect(DEATH_STATUS_OPTIONS).toEqual([
      { value: "alive", label: "在世" },
      { value: "death", label: "已故" },
    ]);
  });
});
