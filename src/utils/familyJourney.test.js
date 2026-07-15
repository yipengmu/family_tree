import {
  buildFamilyJourney,
  buildJourneyFocusPath,
  filterFamilyByGeneration,
} from './familyJourney.js';

describe('familyJourney', () => {
  const family = [
    { id: 1, name: '始祖', g_rank: 1, official_position: '明·生员' },
    { id: 2, name: '二世', g_rank: 2, g_father_id: 1 },
    { id: 3, name: '三世', g_rank: 3, g_father_id: 2 },
    { id: 4, name: '三世次支', g_rank: 3, g_father_id: 2 },
  ];

  test('builds progressive generation steps and infers a Ming starting point', () => {
    const journey = buildFamilyJourney(family);

    expect(journey.startYear).toBe(1500);
    expect(journey.steps.map((step) => step.generation)).toEqual([1, 2, 3]);
    expect(journey.steps.map((step) => step.visibleCount)).toEqual([1, 2, 4]);
    expect(journey.steps[0].era.label).toBe('明代');
    expect(journey.steps[2].progress).toBe(100);
  });

  test('keeps only people up to the active generation', () => {
    expect(
      filterFamilyByGeneration(family, 2).map((person) => person.id),
    ).toEqual([1, 2]);
  });

  test('builds a stable founder-to-target camera path', () => {
    const cameraFamily = [
      { id: 1, name: '穆茂', g_rank: 1 },
      { id: 2, name: '旁支', g_rank: 2, g_father_id: 1 },
      { id: 3, name: '主线二世', g_rank: 2, g_father_id: 1 },
      { id: 4, name: '穆宁', g_rank: 3, g_father_id: 3 },
    ];

    expect(
      buildJourneyFocusPath(cameraFamily).map((person) => person.id),
    ).toEqual([1, 3, 4]);
    expect(
      buildFamilyJourney(cameraFamily).steps.map((step) => step.focusPersonId),
    ).toEqual([1, 3, 4]);
  });
});
