import { describe, expect, test } from 'bun:test';
import { createInMemoryAdapter } from '../src/adapters/in-memory/adapter.ts';
import { predicate, queryAst } from '../src/ast.ts';
import { MelonError } from '../src/errors.ts';
import { createDatabase } from '../src/database/create-database.ts';
import { taskSchema } from '../__fixtures__/task-schema.ts';

async function createTestDb() {
  const adapter = createInMemoryAdapter();
  const db = createDatabase({ schema: taskSchema, adapter });
  return db;
}

describe('CRUD', () => {
  test('insert find update delete', async () => {
    const db = await createTestDb();

    await db.write(async (tx) => {
      await tx.collection('tasks').insert({
        id: 't1',
        title: 'First',
        status: 'open',
        priority: 1,
        updatedAt: new Date('2024-01-01'),
      });
    });

    const found = await db.collection('tasks').findById('t1');
    expect(found?.title).toBe('First');

    await db.write(async (tx) => {
      await tx.collection('tasks').update('t1', { title: 'Updated' });
    });

    const updated = await db.collection('tasks').findById('t1');
    expect(updated?.title).toBe('Updated');

    await db.write(async (tx) => {
      await tx.collection('tasks').delete('t1');
    });

    const gone = await db.collection('tasks').findById('t1');
    expect(gone).toBeNull();
  });

  test('findMany with filter sort limit', async () => {
    const db = await createTestDb();

    await db.write(async (tx) => {
      const tasks = tx.collection('tasks');
      await tasks.insert({
        id: 'a',
        title: 'A',
        status: 'open',
        priority: 3,
        updatedAt: new Date('2024-02-01'),
      });
      await tasks.insert({
        id: 'b',
        title: 'B',
        status: 'open',
        priority: 1,
        updatedAt: new Date('2024-03-01'),
      });
      await tasks.insert({
        id: 'c',
        title: 'C',
        status: 'closed',
        priority: 5,
        updatedAt: new Date('2024-01-01'),
      });
    });

    const rows = await db.collection('tasks').findMany(
      queryAst('tasks', {
        where: predicate('status', 'eq', 'open'),
        orderBy: [{ field: 'priority', direction: 'desc' }],
        limit: 1,
      }),
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe('a');
  });

  test('write outside db.write throws', async () => {
    const db = await createTestDb();
    expect(
      db.collection('tasks').insert({
        id: 'x',
        title: 'X',
        status: 'open',
        priority: 0,
        updatedAt: new Date(),
      }),
    ).rejects.toThrow(MelonError);
  });

  test('serialized writes', async () => {
    const db = await createTestDb();
    const order: number[] = [];

    await Promise.all([
      db.write(async (tx) => {
        order.push(1);
        await tx.collection('tasks').insert({
          id: '1',
          title: '1',
          status: 'open',
          priority: 1,
          updatedAt: new Date(),
        });
      }),
      db.write(async (tx) => {
        order.push(2);
        await tx.collection('tasks').insert({
          id: '2',
          title: '2',
          status: 'open',
          priority: 2,
          updatedAt: new Date(),
        });
      }),
    ]);

    expect(order).toEqual([1, 2]);
  });
});
