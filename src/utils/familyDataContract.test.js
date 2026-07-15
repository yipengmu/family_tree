import {
  redactLivingPerson,
  toClientPerson,
  toDatabasePerson,
} from "../../lib/familyData.js";

const basePerson = {
  id: 1,
  name: "测试成员",
  g_rank: 1,
  rank_index: 1,
};

describe("family data life-status contract", () => {
  test("persists an explicit living choice from the editor", () => {
    expect(
      toDatabasePerson({ ...basePerson, alive: true, dealth: null }, "tenant-1")
        .death_date,
    ).toBe("alive");
  });

  test("clears a stale alive marker after choosing deceased", () => {
    expect(
      toDatabasePerson(
        { ...basePerson, alive: false, dealth: "alive" },
        "tenant-1",
      ).death_date,
    ).toBeNull();
  });

  test("returns a boolean alive field to the editor", () => {
    const clientPerson = toClientPerson({
      person_id: "1",
      name: "测试成员",
      g_rank: 1,
      rank_index: 1,
      death_date: "alive",
    });

    expect(clientPerson.alive).toBe(true);
    expect(clientPerson.dealth).toBe("alive");
  });

  test("preserves an explicitly unconfirmed life status", () => {
    expect(
      toDatabasePerson(
        { ...basePerson, alive: false, death_date: "unknown" },
        "tenant-1",
      ).death_date,
    ).toBe("unknown");

    expect(
      toClientPerson({
        person_id: "1",
        name: "姓名待考",
        g_rank: 1,
        rank_index: 1,
        death_date: "unknown",
      }),
    ).toMatchObject({ alive: false, dealth: "unknown" });
  });

  test("redacts sensitive fields for living people viewed by a viewer", () => {
    const person = {
      ...basePerson,
      alive: true,
      dealth: "alive",
      birth_date: "1990-01-02",
      id_card: "secret",
      household_info: "secret address",
    };

    expect(redactLivingPerson(person, "VIEWER")).toMatchObject({
      birth_date: "1990",
      id_card: null,
      household_info: null,
    });
    expect(redactLivingPerson(person, "OWNER").id_card).toBe("secret");
  });
});
