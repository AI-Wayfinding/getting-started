import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { addItem, importItem, listItems, searchItems, commentItem, commentsItem, type ItemInput, type ItemType, type AuthoredBy } from './core.js';

const field = (args: Record<string, unknown>, name: string): string => {
  if (typeof args[name] !== 'string') throw new Error(name + ' is required');
  return args[name];
};
const optional = (args: Record<string, unknown>, name: string): string | undefined => {
  if (args[name] === undefined) return undefined;
  return field(args, name);
};
const properties = (entries: Record<string, object>, required: string[] = []) => ({ type: 'object' as const, properties: entries, required, additionalProperties: false });
const text = { type: 'string' as const };
const metadata = { type: text, title: text, author: text, authoredBy: text, resourceKind: text, tags: { type: 'array' as const, items: text }, source: text };
const tools = [
  { name: 'add', description: 'Save a new position, interview, lesson or resource as a committed Markdown item.', inputSchema: properties({ ...metadata, body: text }, ['type', 'title', 'author', 'body']) },
  { name: 'import', description: 'Bring a Markdown file already inside this repository into its item collection.', inputSchema: properties({ path: text, ...metadata }, ['path', 'type', 'title', 'author']) },
  { name: 'list', description: 'Browse saved items, optionally filtering by type or tag.', inputSchema: properties({ type: text, tag: text }) },
  { name: 'search', description: 'Find saved items by words in their title, tags and body.', inputSchema: properties({ query: text, type: text, limit: { type: 'integer' as const, minimum: 1 } }, ['query']) },
  { name: 'comment', description: 'Attach a comment to the current version of an item without editing the item.', inputSchema: properties({ id: text, body: text, author: text, authoredBy: text }, ['id', 'body', 'author']) },
  { name: 'comments', description: 'Read comments on the current and earlier versions of an item.', inputSchema: properties({ id: text }, ['id']) }
];
function input(args: Record<string, unknown>, body: string): ItemInput {
  if (args.tags !== undefined && (!Array.isArray(args.tags) || args.tags.some(tag => typeof tag !== 'string'))) throw new Error('tags must be strings');
  return {
    type: field(args, 'type') as ItemType,
    title: field(args, 'title'),
    author: field(args, 'author'),
    authoredBy: (optional(args, 'authoredBy') ?? 'agent') as AuthoredBy,
    resourceKind: optional(args, 'resourceKind') as ItemInput['resourceKind'],
    tags: Array.isArray(args.tags) ? [...args.tags] as string[] : undefined,
    source: optional(args, 'source'),
    body
  };
}
export function createWayfindingServer(repo: string): Server {
  const server = new Server({ name: 'wayfinding', version: '0.1.0' }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
  server.setRequestHandler(CallToolRequestSchema, async request => {
    const args = request.params.arguments ?? {};
    try {
      let result: unknown;
      switch (request.params.name) {
        case 'add': result = await addItem(repo, input(args, field(args, 'body'))); break;
        case 'import': {
          const { body: _body, ...metadata } = input(args, '');
          result = await importItem(repo, field(args, 'path'), metadata);
          break;
        }
        case 'list': result = await listItems(repo, { type: optional(args, 'type') as ItemType | undefined, tag: optional(args, 'tag') }); break;
        case 'search': result = await searchItems(repo, field(args, 'query'), { type: optional(args, 'type') as ItemType | undefined, limit: args.limit === undefined ? undefined : Number(args.limit) }); break;
        case 'comment': result = await commentItem(repo, field(args, 'id'), field(args, 'body'), field(args, 'author'), (optional(args, 'authoredBy') ?? 'agent') as AuthoredBy); break;
        case 'comments': result = await commentsItem(repo, field(args, 'id')); break;
        default: throw new Error('Unknown tool: ' + request.params.name);
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    } catch (error) {
      return { isError: true, content: [{ type: 'text' as const, text: error instanceof Error ? error.message : String(error) }] };
    }
  });
  return server;
}
