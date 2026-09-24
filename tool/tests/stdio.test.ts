import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { initRepo, addItem } from '../src/core.js';

test('spawned stdio server lists tools and searches through the SDK client', async () => {
  const root = await mkdtemp(join(tmpdir(), 'wayfinding-stdio-'));
  const repo = join(root, 'repo');
  let client: Client | undefined;
  try {
    await mkdir(repo);
    execFileSync('git', ['init', '-b', 'main'], { cwd: repo });
    execFileSync('git', ['config', 'user.name', 'Test Person'], { cwd: repo });
    execFileSync('git', ['config', 'user.email', 'test@example.invalid'], { cwd: repo });
    await initRepo(repo, 'individual', 'A person');
    await addItem(repo, { type: 'position', title: 'A searching position', author: 'A person', authoredBy: 'human', body: 'We chose a careful pace.' });
    client = new Client({ name: 'wayfinding-smoke', version: '1.0.0' });
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [join(process.cwd(), 'dist/cli.js'), 'mcp', '--repo', repo], stderr: 'pipe' }));
    const listed = await client.listTools();
    assert.deepEqual(listed.tools.map(tool => tool.name), ['add', 'import', 'list', 'search', 'comment', 'comments']);
    const searched = await client.callTool({ name: 'search', arguments: { query: 'careful' } });
    assert.ok(!searched.isError, JSON.stringify(searched));
    assert.match(JSON.stringify(searched), /A searching position/);
  } finally { await client?.close(); await rm(root, { recursive: true, force: true }); }
});
