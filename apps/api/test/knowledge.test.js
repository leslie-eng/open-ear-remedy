import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startFakeOpenRouter, useFakeOpenRouter } from './fake-openrouter.js';
import { testDatabaseUrl } from './test-env.js';

describe.skipIf(!testDatabaseUrl())('knowledge sources', () => {
  let provider;
  let knowledge;
  let resetData;
  let createUser;

  beforeAll(async () => {
    provider = await startFakeOpenRouter();
    useFakeOpenRouter(provider.baseUrl);
    knowledge = await import('../src/knowledge/index.js');
    ({ resetData, createUser } = await import('./db.js'));
  });
  afterAll(() => provider?.close());
  beforeEach(async () => {
    await resetData();
    provider.reset();
  });

  const text = (s) => ({ buffer: Buffer.from(s), ext: '.txt', fileName: 'notes.txt' });

  /** Adds a source, then approves and switches it on unless told otherwise. */
  async function source(title, content, { approved = true, enabled = true } = {}) {
    const s = await knowledge.addSource({ title, licence: 'Our own work', addedBy: await createUser(), ...text(content) });
    if (approved) await knowledge.approveSource(s.id, 'Dr. A. Mwangi');
    if (enabled) await knowledge.setSourceEnabled(s.id, true);
    return s;
  }

  it('finds the passage closest to the question', async () => {
    await source('Breathing', 'Slow breathing helps when panic rises.');
    await source('Sleep', 'A regular bedtime helps restless sleep.');

    const results = await knowledge.search('what helps when panic rises');
    expect(results[0]).toMatchObject({ title: 'Breathing', content: 'Slow breathing helps when panic rises.' });
  });

  it('never searches sources that are not approved or are switched off', async () => {
    await source('Unapproved', 'Panic rises fast.', { approved: false, enabled: false });
    await source('Switched off', 'Panic rises slowly.', { enabled: false });

    expect(await knowledge.search('panic rises')).toEqual([]);
  });

  it('returns nothing when no passage is a close enough match', async () => {
    await source('Breathing', 'Slow breathing helps when panic rises.');
    expect(await knowledge.search('tax returns deadline')).toEqual([]);
  });

  it('returns at most four passages', async () => {
    for (let i = 0; i < 6; i += 1) await source(`Grief ${i}`, `Grief comes in waves, part ${i}.`);
    expect(await knowledge.search('grief comes in waves')).toHaveLength(4);
  });

  it('refuses to switch on a source nobody has approved', async () => {
    const s = await source('Pending', 'Grief comes in waves.', { approved: false, enabled: false });
    await expect(knowledge.setSourceEnabled(s.id, true)).rejects.toMatchObject({ code: 'NOT_APPROVED' });
  });

  it('indexes long files as several passages, embedded with the configured model', async () => {
    const words = Array.from({ length: 650 }, (_, i) => `word${i}`).join(' ');
    const s = await knowledge.addSource({ title: 'Long', licence: 'CC BY 4.0', ...text(words) });

    expect(s.passageCount).toBe(3);
    expect(provider.calls('embeddings')[0].body.model).toBe('openai/text-embedding-3-small');
  });

  it('rejects a file with no readable text and stores nothing', async () => {
    await expect(knowledge.addSource({ title: 'Blank', licence: 'x', ...text('   ') })).rejects.toMatchObject({ code: 'NO_TEXT' });
    expect(await knowledge.listSources()).toEqual([]);
  });
});
