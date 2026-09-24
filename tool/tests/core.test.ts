import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createWayfindingServer } from '../src/mcp.js';
import { initRepo, addItem, importItem, searchItems, listItems, commentItem, commentsItem, type ItemInput } from '../src/core.js';

const base: ItemInput = { type: 'position', title: 'First position', author: 'A person', authoredBy: 'human', body: 'A reflection.\n' };
async function withRepo(run: (repo: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), 'wayfinding-test-'));
  const repo = join(root, 'repo');
  try {
    // Git identity is scoped to this test process, not to the machine.
    await mkdir(repo);
    execFileSync('git', ['init', '-b', 'main'], { cwd: repo });
    execFileSync('git', ['config', 'user.name', 'Test Person'], { cwd: repo });
    execFileSync('git', ['config', 'user.email', 'test@example.invalid'], { cwd: repo });
    await initRepo(repo, 'individual', 'A person');
    execFileSync('git', ['config', 'user.name', 'Test Person'], { cwd: repo });
    execFileSync('git', ['config', 'user.email', 'test@example.invalid'], { cwd: repo });
    await run(repo);
  } finally { await rm(root, { recursive: true, force: true }); }
}

test('init creates a local repository and refuses a non-empty unrelated directory', async () => {
  const root = await mkdtemp(join(tmpdir(), 'wayfinding-test-'));
  try {
    const occupied = join(root, 'occupied');
    await mkdir(occupied);
    await writeFile(join(occupied, 'keep.txt'), 'keep');
    await assert.rejects(initRepo(occupied, 'individual', 'A person'), /non-empty|not a Wayfinding/i);
    assert.equal(await readFile(join(occupied, 'keep.txt'), 'utf8'), 'keep');
    const repo = join(root, 'new');
    await mkdir(repo);
    execFileSync('git', ['init', '-b', 'main'], { cwd: repo });
    execFileSync('git', ['config', 'user.name', 'Test Person'], { cwd: repo });
    execFileSync('git', ['config', 'user.email', 'test@example.invalid'], { cwd: repo });
    await initRepo(repo, 'individual', 'A person');
    assert.equal(JSON.parse(await readFile(join(repo, '.wayfinding/config.json'), 'utf8')).kind, 'individual');
    assert.match(execFileSync('git', ['branch', '--show-current'], { cwd: repo, encoding: 'utf8' }), /main/);
    assert.match(execFileSync('git', ['ls-tree', '-r', '--name-only', 'HEAD'], { cwd: repo, encoding: 'utf8' }), /positions\/\.gitkeep/);
    assert.equal(execFileSync('git', ['remote'], { cwd: repo, encoding: 'utf8' }), '');
    assert.equal(execFileSync('git', ['config', '--local', '--get', 'notes.displayRef'], { cwd: repo, encoding: 'utf8' }).trim(), 'refs/notes/wayfinding-comments');
    assert.equal(execFileSync('git', ['config', '--local', '--get', 'notes.mergeStrategy'], { cwd: repo, encoding: 'utf8' }).trim(), 'cat_sort_uniq');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('add rejects invalid item metadata before writing', async () => withRepo(async repo => {
  await assert.rejects(addItem(repo, { ...base, type: 'other' as ItemInput['type'] }), /type/i);
  await assert.rejects(addItem(repo, { ...base, title: '' }), /title/i);
  await assert.rejects(addItem(repo, { ...base, author: '' }), /author/i);
  await assert.rejects(addItem(repo, { ...base, authoredBy: 'other' as ItemInput['authoredBy'] }), /authoredBy/i);
  await assert.rejects(addItem(repo, { ...base, type: 'resource' }), /resourceKind/i);
  assert.equal(execFileSync('git', ['status', '--porcelain'], { cwd: repo, encoding: 'utf8' }), '');
}));


test('add writes frontmatter, a searchable index and a commit', async () => withRepo(async repo => {
  const item = await addItem(repo, base);
  assert.match(await readFile(join(repo, item.path), 'utf8'), /^---\nid: [0-9A-HJKMNP-TV-Z]{26}\n/);
  assert.match(await readFile(join(repo, '.wayfinding/index.json'), 'utf8'), /First position/);
  assert.equal((await searchItems(repo, 'reflection')).at(0)?.id, item.id);
  assert.equal((await listItems(repo)).at(0)?.id, item.id);
  assert.match(execFileSync('git', ['log', '-1', '--format=%s'], { cwd: repo, encoding: 'utf8' }), /Add position/);
  assert.equal(execFileSync('git', ['status', '--porcelain'], { cwd: repo, encoding: 'utf8' }), '');
}));

test('import preserves existing Markdown body bytes and rejects paths outside the repo', async () => withRepo(async repo => {
  const content = '# A saved position\r\n\r\nSpaces  here.\r\n';
  await writeFile(join(repo, 'saved.md'), content);
  const item = await importItem(repo, join(repo, 'saved.md'), { ...base, title: 'Saved position' });
  assert.ok((await readFile(join(repo, item.path), 'utf8')).endsWith(content));
  const outside = join(repo, '..', 'outside.md');
  await writeFile(outside, 'PRIVATE');
  await assert.rejects(importItem(repo, outside, base), /outside|within/i);
}));

test('a new write rebuilds search so removed words disappear', async () => withRepo(async repo => {
  const old = await addItem(repo, { ...base, body: 'obsoleteword' });
  await writeFile(join(repo, old.path), (await readFile(join(repo, old.path), 'utf8')).replace('obsoleteword', 'freshword'));
  await addItem(repo, { ...base, title: 'Next', body: 'another topic' });
  assert.equal((await searchItems(repo, 'obsoleteword')).length, 0);
  assert.equal((await searchItems(repo, 'freshword')).at(0)?.id, old.id);
}));


test('comment appends one JSONL record to the item blob and comments reads it', async () => withRepo(async repo => {
  const item = await addItem(repo, base);
  const blob = execFileSync('git', ['rev-parse', 'HEAD:' + item.path], { cwd: repo, encoding: 'utf8' }).trim();
  const note = await commentItem(repo, item.id, 'A useful thought', 'A person', 'human');
  assert.equal(note.blob, blob);
  const lines = execFileSync('git', ['notes', '--ref=wayfinding-comments', 'show', blob], { cwd: repo, encoding: 'utf8' }).trim().split('\n');
  assert.equal(lines.length, 1);
  assert.deepEqual(JSON.parse(lines[0]), note);
  assert.deepEqual((await commentsItem(repo, item.id)).current, [note]);
  await commentItem(repo, item.id, 'Another thought', 'A person', 'human');
  assert.equal(execFileSync('git', ['notes', '--ref=wayfinding-comments', 'show', blob], { cwd: repo, encoding: 'utf8' }).trim().split('\n').length, 2);
  await assert.rejects(commentItem(repo, '--help', 'bad', 'A person', 'human'), /ULID/i);
}));

test('editing an item moves its comment thread to earlier versions', async () => withRepo(async repo => {
  const item = await addItem(repo, base);
  const note = await commentItem(repo, item.id, 'Before revision', 'A person', 'human');
  await writeFile(join(repo, item.path), (await readFile(join(repo, item.path), 'utf8') + '\nRevised.'));
  execFileSync('git', ['add', item.path], { cwd: repo });
  execFileSync('git', ['commit', '-m', 'Revise position'], { cwd: repo });
  const thread = await commentsItem(repo, item.id);
  assert.equal(thread.current.length, 0);
  assert.deepEqual(thread.earlier, [note]);
}));


test('MCP add defaults authoredBy to agent and exposes search', async () => withRepo(async repo => {
  const server = createWayfindingServer(repo);
  const client = new Client({ name: 'test', version: '1.0.0' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  try {
    const tools = await client.listTools();
    assert.ok(tools.tools.some(tool => tool.name === 'add'));
    const response = await client.callTool({ name: 'add', arguments: { type: 'lesson', title: 'One lesson', author: 'An agent', body: 'A discovery.' } });
    assert.ok(!response.isError, JSON.stringify(response));
    const item = (await listItems(repo))[0];
    assert.equal(item.authoredBy, 'agent');
    const results = await client.callTool({ name: 'search', arguments: { query: 'discovery' } });
    assert.match(JSON.stringify(results), /One lesson/);
  } finally { await client.close(); await server.close(); }
}));


test('CLI defaults authorship to human and refuses --file outside the repository', async () => withRepo(async repo => {
  const cli = join(process.cwd(), 'dist/cli.js');
  const output = execFileSync(process.execPath, [cli, 'add', '--repo', repo, '--type', 'resource', '--title', 'A guide', '--author', 'A person', '--resource-kind', 'howto'], { input: 'A useful guide.', encoding: 'utf8' });
  assert.match(output, /A guide/);
  assert.equal((await listItems(repo))[0].authoredBy, 'human');
  const outside = join(repo, '..', 'outside.md');
  await writeFile(outside, 'OUTSIDE');
  assert.throws(() => execFileSync(process.execPath, [cli, 'import', outside, '--repo', repo, '--type', 'lesson', '--title', 'Bad', '--author', 'A person'], { stdio: 'pipe' }), /outside|within/i);
}));


test('init explains how to set local Git identity when it is missing', async () => {
  const root = await mkdtemp(join(tmpdir(), 'wayfinding-test-'));
  try {
    await assert.rejects(initRepo(join(root, 'repo'), 'individual', 'A person'), /config user.name.*config user.email/i);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('MCP ignores unrecognised caller fields instead of storing them', async () => withRepo(async repo => {
  const server = createWayfindingServer(repo);
  const client = new Client({ name: 'test', version: '1.0.0' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  try {
    const response = await client.callTool({ name: 'add', arguments: { type: 'lesson', title: 'Safe lesson', author: 'An agent', body: 'Useful.', secret: 'SHOULD_NOT_SURVIVE' } });
    assert.ok(!response.isError, JSON.stringify(response));
    const item = (await listItems(repo))[0];
    assert.ok(!JSON.stringify(item).includes('SHOULD_NOT_SURVIVE'));
    assert.ok(!(await readFile(join(repo, item.path), 'utf8')).includes('SHOULD_NOT_SURVIVE'));
    assert.ok(!(await readFile(join(repo, '.wayfinding/index.json'), 'utf8')).includes('SHOULD_NOT_SURVIVE'));
  } finally { await client.close(); await server.close(); }
}));
