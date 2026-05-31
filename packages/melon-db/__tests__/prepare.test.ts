import { describe, expect, test } from 'bun:test';
import { predicate, queryAst } from '../src/ast.ts';
import { MelonError } from '../src/errors.ts';
import { prepareQuery } from '../src/query/prepare.ts';
import { taskSchema } from '../__fixtures__/task-schema.ts';

describe('prepareQuery', () => {
  test('prepares valid query', () => {
    const prepared = prepareQuery(
      queryAst('tasks', { where: predicate('status', 'eq', 'open') }),
      taskSchema,
    );
    expect(prepared.source).toBe('melon');
    expect(prepared.plan.stableSort).toEqual([]);
  });

  test('rejects unknown field', () => {
    expect(() =>
      prepareQuery(queryAst('tasks', { where: predicate('unknown', 'eq', 1) }), taskSchema),
    ).toThrow(MelonError);
  });
});
