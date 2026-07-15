const test = require('node:test');
const assert = require('node:assert/strict');

test('redacts sensitive fields and reduces living birth date for family viewers', async () => {
  const { redactPerson } = await import('../../lib/privacy.js');
  const person = {
    name: '测试成员',
    alive: true,
    birth_date: '1990-05-01',
    location: '上海',
    id_card: 'secret',
    household_info: 'secret',
    face_img: 'private-image',
    photos: 'private-photo',
  };

  const redacted = redactPerson(person, { role: 'VIEWER' });
  assert.equal(redacted.birth_date, '1990');
  assert.equal(redacted.location, null);
  assert.equal(redacted.id_card, null);
  assert.equal(redacted.photos, null);
});

test('keeps full fields for editors but forces public views to redact', async () => {
  const { redactPerson } = await import('../../lib/privacy.js');
  const person = { alive: true, birth_date: '1990-05-01', location: '上海', id_card: 'secret' };
  assert.equal(redactPerson(person, { role: 'EDITOR' }).id_card, 'secret');
  assert.equal(redactPerson(person, { role: 'EDITOR', publicView: true }).id_card, null);
});

test('protects an unconfirmed life status with the stricter living-person rules', async () => {
  const { redactPerson } = await import('../../lib/privacy.js');
  const person = {
    name: '姓名待考',
    death_date: 'unknown',
    birth_date: '1950-05-01',
    location: '杭州',
    id_card: 'secret',
  };

  const redacted = redactPerson(person, { role: 'VIEWER' });
  assert.equal(redacted.birth_date, '1950');
  assert.equal(redacted.location, null);
  assert.equal(redacted.id_card, null);
});
