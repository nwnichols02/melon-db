import { describe, expect, test } from 'bun:test';
import { predicate, prepareQuery, queryAst } from '@melon/db';
import { createMelonSchema, type DatabaseSchemaDefinition } from '@melon/db';
import { compileQuery } from '../src/sql/compile-query.ts';

const def: DatabaseSchemaDefinition = {
  version: 1,
  collections: {
    tasks: {
      name: 'tasks',
      fields: {
        id: { kind: 'string' },
        status: { kind: 'string' },
        priority: { kind: 'number' },
      },
    },
  },
};

const schema = createMelonSchema(def);

describe('compileQuery', () => {
  test('compiles SELECT with WHERE', () => {
    const prepared = prepareQuery(
      queryAst('tasks', { where: predicate('status', 'eq', 'open'), limit: 10 }),
      schema,
    );
    const { sql, params } = compileQuery(prepared);
    expect(sql).toContain('SELECT * FROM "tasks"');
    expect(sql).toContain('"status" = ?');
    expect(sql).toContain('LIMIT ?');
    expect(params).toEqual(['open', 10]);
  });

  test('compiles COUNT', () => {
    const prepared = prepareQuery(queryAst('tasks', { mode: 'count' }), schema);
    const { sql } = compileQuery(prepared);
    expect(sql).toBe('SELECT COUNT(*) as count FROM "tasks"');
  });

  test('compiles one mode', () => {
    const prepared = prepareQuery(queryAst('tasks', { mode: 'one' }), schema);
    const { sql } = compileQuery(prepared);
    expect(sql).toContain('LIMIT 1');
  });
});
