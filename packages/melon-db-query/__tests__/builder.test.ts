import { describe, expect, test } from 'bun:test';
import { createMelonSchema, type DatabaseSchemaDefinition } from '@melon/db';
import { createQueryFactory } from '../src/query-factory.ts';

const schema = createMelonSchema({
  version: 1,
  collections: {
    tasks: { name: 'tasks', fields: { id: { kind: 'string' }, status: { kind: 'string' } } },
  },
});

describe('QueryBuilder', () => {
  test('builds AST', () => {
    const q = createQueryFactory(schema);
    const ast = q
      .from<{ status: string }>('tasks')
      .where('status', 'eq', 'open')
      .orderBy('status', 'desc')
      .limit(5)
      .toAst();
    expect(ast.collection).toBe('tasks');
    expect(ast.limit).toBe(5);
  });
});
