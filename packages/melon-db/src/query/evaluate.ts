import type { AdapterRecord } from '../adapter.ts';
import type { QueryAst, QueryBooleanNode, QueryPredicate, QuerySort } from '../ast.ts';

function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  return String(a).localeCompare(String(b));
}

function matchesPredicate(record: AdapterRecord, pred: QueryPredicate): boolean {
  const value = record[pred.field];
  switch (pred.op) {
    case 'eq':
      return value === pred.value;
    case 'neq':
      return value !== pred.value;
    case 'gt':
      return compareValues(value, pred.value) > 0;
    case 'gte':
      return compareValues(value, pred.value) >= 0;
    case 'lt':
      return compareValues(value, pred.value) < 0;
    case 'lte':
      return compareValues(value, pred.value) <= 0;
    case 'in':
      return Array.isArray(pred.value) && pred.value.includes(value);
    case 'notIn':
      return Array.isArray(pred.value) && !pred.value.includes(value);
    case 'like':
      return typeof value === 'string' && typeof pred.value === 'string' && value.includes(pred.value);
    case 'contains':
      if (typeof value === 'string' && typeof pred.value === 'string') {
        return value.includes(pred.value);
      }
      if (Array.isArray(value)) {
        return value.includes(pred.value);
      }
      return false;
    case 'isNull':
      return value === null || value === undefined;
  }
}

function matchesNode(record: AdapterRecord, node: QueryBooleanNode): boolean {
  switch (node.type) {
    case 'predicate':
      return matchesPredicate(record, node.predicate);
    case 'and':
      return node.nodes.every((n) => matchesNode(record, n));
    case 'or':
      return node.nodes.some((n) => matchesNode(record, n));
    case 'not':
      return !matchesNode(record, node.node);
  }
}

function sortRecords(rows: AdapterRecord[], sorts: QuerySort[]): AdapterRecord[] {
  if (sorts.length === 0) return rows;
  return [...rows].sort((a, b) => {
    for (const sort of sorts) {
      const cmp = compareValues(a[sort.field], b[sort.field]);
      if (cmp !== 0) {
        return sort.direction === 'asc' ? cmp : -cmp;
      }
    }
    return 0;
  });
}

/**
 * Evaluates a query AST against in-memory rows.
 */
export function evaluateQuery(ast: QueryAst, rows: AdapterRecord[]): AdapterRecord[] {
  let result = rows;
  if (ast.where) {
    result = result.filter((row) => matchesNode(row, ast.where!));
  }
  const sorts = ast.orderBy ?? [];
  result = sortRecords(result, sorts);
  if (ast.skip) {
    result = result.slice(ast.skip);
  }
  if (ast.limit !== undefined) {
    result = result.slice(0, ast.limit);
  }
  return result;
}
