import { mkdir, readdir, readFile, writeFile, realpath } from 'node:fs/promises';
import { join, resolve, relative, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { create, save, load, insert, search } from '@orama/orama';
import YAML from 'yaml';
import { ulid, isValid } from 'ulid';

export type ItemType = 'position' | 'interview' | 'lesson' | 'resource';
export type AuthoredBy = 'human' | 'agent' | 'mixed';
export interface ItemInput { type: ItemType; title: string; author: string; authoredBy: AuthoredBy; resourceKind?: 'prompt' | 'howto' | 'document' | 'link'; source?: string; tags?: string[]; body: string }
export interface Item extends ItemInput { id: string; created: string; path: string }
export interface Thread { current: Comment[]; earlier: Comment[] }
export interface Comment { id: string; item: string; blob: string; author: string; authoredBy: AuthoredBy; at: string; inReplyTo: string | null; body: string }
const folders = { position: 'positions', interview: 'interviews', lesson: 'lessons', resource: 'resources' } as const;
const schema = { id: 'string', title: 'string', tags: 'string[]', body: 'string', type: 'string' } as const;
function git(repo: string, args: string[]): string {
  return execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trimEnd();
}
function localConfig(repo: string, key: string): string {
  try { return git(repo, ['config', '--local', '--get', key]); } catch { return ''; }
}
function identity(repo: string): void {
  if (!localConfig(repo, 'user.name') || !localConfig(repo, 'user.email')) {
    throw new Error('Set an identity in this repository: git -C "' + repo + '" config user.name "Your name" and git -C "' + repo + '" config user.email "you@example.com"; then retry. No global config is changed.');
  }
}
export async function initRepo(dir: string, kind: 'team' | 'individual', name: string): Promise<void> {
  if (!['team', 'individual'].includes(kind)) throw new Error('kind must be team or individual');
  if (!name?.trim()) throw new Error('name is required');
  const repo = resolve(dir);
  await mkdir(repo, { recursive: true });
  const entries = await readdir(repo);
  if (entries.some(e => e !== '.git')) throw new Error('Refusing to init a non-empty non-Wayfinding directory');
  if (!entries.includes('.git')) git(repo, ['init', '-b', 'main']);
  identity(repo);
  git(repo, ['config', '--local', 'notes.displayRef', 'refs/notes/wayfinding-comments']);
  git(repo, ['config', '--local', 'notes.mergeStrategy', 'cat_sort_uniq']);
  for (const folder of Object.values(folders)) {
    await mkdir(join(repo, folder), { recursive: true });
    await writeFile(join(repo, folder, '.gitkeep'), '');
  }
  await mkdir(join(repo, '.wayfinding'), { recursive: true });
  await writeFile(join(repo, 'README.md'), '# Wayfinding\n\nThis is your private Wayfinding repository. Ask your agent to use the Wayfinding tool to add, search and comment on your documents. Nothing in this repository is sent anywhere by the tool.\n');
  await writeFile(join(repo, '.gitignore'), '# Keep local temporary files out of the repository\n.DS_Store\n/.wayfinding/inbox/\n');
  await writeFile(join(repo, '.wayfinding/config.json'), JSON.stringify({ kind, name: name.trim(), created: new Date().toISOString(), toolVersion: '0.1.0' }, null, 2) + '\n');
  const index = await create({ schema });
  await writeFile(join(repo, '.wayfinding/index.json'), JSON.stringify(await save(index)) + '\n');
  git(repo, ['add', 'README.md', '.gitignore', '.wayfinding/config.json', '.wayfinding/index.json', ...Object.values(folders).map(folder => folder + '/.gitkeep')]);
  git(repo, ['commit', '-m', 'Initialize Wayfinding repository']);
}

function validate(input: ItemInput): void {
  if (!Object.hasOwn(folders, input.type)) throw new Error('Invalid type');
  if (!input.title?.trim()) throw new Error('title is required');
  if (!input.author?.trim()) throw new Error('author is required');
  if (!['human', 'agent', 'mixed'].includes(input.authoredBy)) throw new Error('Invalid authoredBy');
  if (input.type === 'resource' && !['prompt', 'howto', 'document', 'link'].includes(input.resourceKind ?? '')) throw new Error('Invalid resourceKind');
  if (input.type !== 'resource' && input.resourceKind !== undefined) throw new Error('resourceKind is only for resources');
  if (typeof input.body !== 'string') throw new Error('body must be text');
  if (input.tags !== undefined && (!Array.isArray(input.tags) || input.tags.some(tag => typeof tag !== 'string'))) throw new Error('tags must be strings');
}
function slug(title: string): string {
  return title.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64) || 'item';
}
function parsedItem(text: string, path: string): Item {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
  if (!match) throw new Error('Missing YAML frontmatter: ' + path);
  const raw = YAML.parse(match[1]);
  if (!raw || !isValid(raw.id)) throw new Error('Invalid item id in ' + path);
  const item: Item = { id: raw.id, title: raw.title, type: raw.type, resourceKind: raw.resourceKind, author: raw.author, authoredBy: raw.authoredBy, source: raw.source, created: raw.created, tags: raw.tags ?? [], body: text.slice(match[0].length), path };
  validate(item);
  return item;
}
async function allItems(repo: string): Promise<Item[]> {
  const items: Item[] = [];
  for (const [type, folder] of Object.entries(folders)) {
    for (const filename of await readdir(join(repo, folder))) {
      if (!filename.endsWith('.md')) continue;
      const path = join(folder, filename);
      const item = parsedItem(await readFile(join(repo, path), 'utf8'), path);
      if (item.type !== type) throw new Error('Item type does not match its directory: ' + path);
      items.push(item);
    }
  }
  return items;
}
async function rebuildIndex(repo: string): Promise<void> {
  const db = await create({ schema });
  for (const item of await allItems(repo)) await insert(db, { id: item.id, title: item.title, tags: item.tags ?? [], body: item.body, type: item.type });
  await writeFile(join(repo, '.wayfinding/index.json'), JSON.stringify(await save(db)) + '\n');
}
export async function readRepoFile(repo: string, path: string): Promise<string> {
  const root = await realpath(repo);
  const source = await realpath(resolve(repo, path));
  const rel = relative(root, source);
  if (!rel || rel.startsWith('..' + sep) || rel === '..' || resolve(root, rel) !== source) throw new Error('File must be within the repository; outside paths are refused');
  return readFile(source, 'utf8');
}
export async function addItem(repo: string, input: ItemInput): Promise<Item> {
  validate(input);
  identity(repo);
  const id = ulid();
  const created = new Date().toISOString();
  const dir = folders[input.type];
  const stem = slug(input.title);
  let filename = stem + '.md';
  const existing = new Set(await readdir(join(repo, dir)));
  for (let n = 2; existing.has(filename); n++) filename = stem + '-' + n + '.md';
  const path = join(dir, filename);
  const front = { id, title: input.title.trim(), type: input.type, ...(input.type === 'resource' ? { resourceKind: input.resourceKind } : {}), author: input.author.trim(), authoredBy: input.authoredBy, ...(input.source ? { source: input.source } : {}), created, tags: input.tags ?? [] };
  await writeFile(join(repo, path), '---\n' + YAML.stringify(front) + '---\n' + input.body);
  await rebuildIndex(repo);
  git(repo, ['add', '--', path, '.wayfinding/index.json']);
  git(repo, ['commit', '-m', 'Add ' + input.type + ': ' + input.title.trim(), '--', path, '.wayfinding/index.json']);
  return { id, title: input.title.trim(), type: input.type, author: input.author.trim(), authoredBy: input.authoredBy, resourceKind: input.resourceKind, source: input.source, tags: input.tags?.slice() ?? [], body: input.body, created, path };
}
export async function importItem(repo: string, path: string, input: Omit<ItemInput, 'body'>): Promise<Item> {
  const content = await readRepoFile(repo, path);
  const match = /^---\r?\n[\s\S]*?\r?\n---\r?\n/.exec(content);
  return addItem(repo, { type: input.type, title: input.title, author: input.author, authoredBy: input.authoredBy, resourceKind: input.resourceKind, source: input.source, tags: input.tags?.slice(), body: match ? content.slice(match[0].length) : content });
}
export async function listItems(repo: string, filter: { type?: ItemType; tag?: string } = {}): Promise<Item[]> {
  return (await allItems(repo)).filter(item => (!filter.type || item.type === filter.type) && (!filter.tag || item.tags?.includes(filter.tag)));
}
export async function searchItems(repo: string, query: string, filter: { type?: ItemType; limit?: number } = {}): Promise<Item[]> {
  const db = await create({ schema });
  await load(db, JSON.parse(await readFile(join(repo, '.wayfinding/index.json'), 'utf8')));
  const result = await search(db, { term: query, properties: ['title', 'tags', 'body'], boost: { title: 3, tags: 2 }, ...(filter.type ? { where: { type: filter.type } } : {}), limit: filter.limit ?? 10 });
  const byId = new Map((await allItems(repo)).map(item => [item.id, item]));
  return result.hits.map(hit => byId.get(hit.id)).filter((item): item is Item => item !== undefined);
}
function validId(id: string): void {
  if (!/^[0-9A-HJKMNP-TV-Z]{26}$/.test(id) || !isValid(id)) throw new Error('Item id must be a ULID');
}
async function itemPath(repo: string, id: string): Promise<string> {
  validId(id);
  const item = (await allItems(repo)).find(entry => entry.id === id);
  if (!item) throw new Error('Item not found: ' + id);
  return item.path;
}
function notes(repo: string, blob: string): Comment[] {
  let text: string;
  try { text = git(repo, ['notes', '--ref=wayfinding-comments', 'show', blob]); }
  catch { return []; }
  return text.split('\n').filter(Boolean).map(line => JSON.parse(line) as Comment);
}
export async function commentItem(repo: string, id: string, text: string, author: string, authoredBy: AuthoredBy, inReplyTo?: string): Promise<Comment> {
  validId(id);
  if (!author?.trim()) throw new Error('author is required');
  if (!['human', 'agent', 'mixed'].includes(authoredBy)) throw new Error('Invalid authoredBy');
  if (!text?.trim()) throw new Error('Comment body is required');
  if (inReplyTo !== undefined) validId(inReplyTo);
  identity(repo);
  const path = await itemPath(repo, id);
  const blob = git(repo, ['rev-parse', 'HEAD:' + path]);
  const comment: Comment = { id: ulid(), item: id, blob, author: author.trim(), authoredBy, at: new Date().toISOString(), inReplyTo: inReplyTo ?? null, body: text };
  const earlier = notes(repo, blob);
  git(repo, ['notes', '--ref=wayfinding-comments', 'append', '-m', JSON.stringify(comment), blob]);
  // Git inserts a blank paragraph between appended notes; normalize to one JSON record per line.
  if (earlier.length) git(repo, ['notes', '--ref=wayfinding-comments', 'add', '-f', '-m', [...earlier, comment].map(entry => JSON.stringify(entry)).join('\n'), blob]);
  return comment;
}
export async function commentsItem(repo: string, id: string): Promise<Thread> {
  const path = await itemPath(repo, id);
  const currentBlob = git(repo, ['rev-parse', 'HEAD:' + path]);
  const commits = git(repo, ['log', '--follow', '--format=%H', '--', path]).split('\n').filter(Boolean);
  const blobs = [...new Set(commits.map(commit => git(repo, ['rev-parse', commit + ':' + path])))];
  return { current: notes(repo, currentBlob), earlier: blobs.filter(blob => blob !== currentBlob).flatMap(blob => notes(repo, blob)) };
}
