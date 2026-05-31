import { describe, expect, test } from 'bun:test';
import { and, predicate, queryAst } from '../src/ast.ts';

describe('AST helpers', () => {
  test('queryAst builds collection query', () => {
    const ast = queryAst('tasks', {
      where: and(
        predicate('status', 'eq', 'open'),
        predicate('priority', 'gte', 2),
      ),
      orderBy: [{ field: 'updatedAt', direction: 'desc' }],
      limit: 20,
    });
    expect(ast.collection).toBe('tasks');
    expect(ast.mode).toBe('many');
    expect(ast.limit).toBe(20);
  });
});
