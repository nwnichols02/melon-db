import type { QueryBooleanNode, QueryPredicate } from '@melon/db';

export interface SqlFragment {
  sql: string;
  params: unknown[];
}

function compilePredicate(pred: QueryPredicate, params: unknown[]): string {
  const column = `"${pred.field.replace(/"/g, '""')}"`;

  if (pred.op === 'isNull') {
    return `${column} IS NULL`;
  }

  if (pred.op === 'in' || pred.op === 'notIn') {
    const values = Array.isArray(pred.value) ? pred.value : [];
    const placeholders = values.map((v) => {
      params.push(v);
      return '?';
    });
    return `${column} ${pred.op === 'in' ? 'IN' : 'NOT IN'} (${placeholders.join(', ')})`;
  }

  params.push(pred.op === 'contains' && typeof pred.value === 'string' ? `%${pred.value}%` : pred.value);

  if (pred.op === 'contains' || pred.op === 'like') {
    return `${column} LIKE ?`;
  }

  const opMap: Record<string, string> = {
    eq: '=',
    neq: '!=',
    gt: '>',
    gte: '>=',
    lt: '<',
    lte: '<=',
  };
  return `${column} ${opMap[pred.op]} ?`;
}

function compileNode(node: QueryBooleanNode, params: unknown[]): string {
  switch (node.type) {
    case 'predicate':
      return compilePredicate(node.predicate, params);
    case 'and':
      return `(${node.nodes.map((n) => compileNode(n, params)).join(' AND ')})`;
    case 'or':
      return `(${node.nodes.map((n) => compileNode(n, params)).join(' OR ')})`;
    case 'not':
      return `(NOT ${compileNode(node.node, params)})`;
  }
}

/**
 * Compiles a boolean AST node into a SQL WHERE fragment.
 */
export function compileWhere(node: QueryBooleanNode | undefined): SqlFragment {
  if (!node) {
    return { sql: '', params: [] };
  }
  const params: unknown[] = [];
  const sql = compileNode(node, params);
  return { sql, params };
}
