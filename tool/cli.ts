#!/usr/bin/env node
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { addItem, importItem, listItems, searchItems, commentItem, commentsItem, initRepo, readRepoFile, type ItemInput, type ItemType, type AuthoredBy } from './src/core.js';
import { createWayfindingServer } from './src/mcp.js';

function parse(argv: string[]): { args: string[]; options: Record<string, string> } {
  const args: string[] = [];
  const options: Record<string, string> = {};
  for (let n = 0; n < argv.length; n++) {
    const part = argv[n];
    if (part.startsWith('--')) {
      const value = argv[++n];
      if (value === undefined || value.startsWith('--')) throw new Error('Missing value for ' + part);
      options[part.slice(2)] = value;
    } else args.push(part);
  }
  return { args, options };
}
function required(options: Record<string, string>, key: string): string {
  if (!options[key]) throw new Error('--' + key + ' is required');
  return options[key];
}
async function stdin(): Promise<string> {
  if (process.stdin.isTTY) throw new Error('Give a body on stdin or use --file');
  let body = '';
  for await (const chunk of process.stdin) body += chunk.toString();
  return body;
}
function connect(client: string): string {
  const executable = resolve(homedir(), '.wayfinding/tool/tool/dist/cli.js');
  const args = [executable, 'mcp', '--repo', '<your-Wayfinding-repo>'];
  switch (client) {
    case 'claude-code': return 'claude mcp add wayfinding -- node ' + args.map(a => JSON.stringify(a)).join(' ');
    case 'claude-desktop':
    case 'cursor': return JSON.stringify({ mcpServers: { wayfinding: { command: 'node', args } } }, null, 2);
    case 'codex': return '[mcp_servers.wayfinding]\ncommand = "node"\nargs = ' + JSON.stringify(args);
    default: throw new Error('Client must be claude-code, claude-desktop, cursor or codex');
  }
}
async function main(): Promise<void> {
  const [command, ...tail] = process.argv.slice(2);
  const { args, options } = parse(tail);
  const repo = resolve(options.repo ?? process.cwd());
  let result: unknown;
  switch (command) {
    case 'init':
      await initRepo(resolve(args[0] ?? process.cwd()), required(options, 'kind') as 'team' | 'individual', required(options, 'name'));
      result = 'Wayfinding repository initialized'; break;
    case 'add': {
      const input: ItemInput = {
        type: required(options, 'type') as ItemType,
        title: required(options, 'title'), author: required(options, 'author'),
        authoredBy: (options['authored-by'] ?? 'human') as AuthoredBy,
        resourceKind: options['resource-kind'] as ItemInput['resourceKind'],
        tags: options.tags?.split(',').map(tag => tag.trim()).filter(Boolean),
        source: options.source,
        body: options.file ? await readRepoFile(repo, options.file) : await stdin()
      };
      result = await addItem(repo, input); break;
    }
    case 'import':
      result = await importItem(repo, args[0] ?? required(options, 'path'), {
        type: required(options, 'type') as ItemType, title: required(options, 'title'),
        author: required(options, 'author'), authoredBy: (options['authored-by'] ?? 'human') as AuthoredBy,
        resourceKind: options['resource-kind'] as ItemInput['resourceKind'],
        tags: options.tags?.split(',').map(tag => tag.trim()).filter(Boolean), source: options.source
      }); break;
    case 'list': result = await listItems(repo, { type: options.type as ItemType | undefined, tag: options.tag }); break;
    case 'search': result = await searchItems(repo, args[0] ?? required(options, 'query'), { type: options.type as ItemType | undefined, limit: options.limit ? Number(options.limit) : undefined }); break;
    case 'comment': result = await commentItem(repo, args[0] ?? '', args[1] ?? '', required(options, 'author'), (options['authored-by'] ?? 'human') as AuthoredBy); break;
    case 'comments': result = await commentsItem(repo, args[0] ?? ''); break;
    case 'connect': result = connect(args[0] ?? ''); break;
    case 'mcp': {
      const server = createWayfindingServer(repo);
      await server.connect(new StdioServerTransport());
      return;
    }
    default: throw new Error('Usage: wayfinding init|add|import|list|search|comment|comments|mcp|connect. Use --repo <dir> to select a repository.');
  }
  process.stdout.write(typeof result === 'string' ? result + '\n' : JSON.stringify(result, null, 2) + '\n');
}
main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
