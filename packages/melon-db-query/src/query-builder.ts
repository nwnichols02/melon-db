import type {
	QueryAst,
	QueryBooleanNode,
	QueryOperator,
	QueryRelationInclude,
	QuerySort,
} from "@melon-db/db";

/**
 * Fluent query builder that produces QueryAst.
 */
export class QueryBuilder<RecordShape = Record<string, unknown>> {
	private collection: string;
	private whereNode?: QueryBooleanNode;
	private sorts: QuerySort[] = [];
	private skipValue?: number;
	private limitValue?: number;
	private includes: Record<string, QueryRelationInclude> = {};
	private mode: QueryAst["mode"] = "many";

	constructor(collection: string) {
		this.collection = collection;
	}

	where(
		field: keyof RecordShape & string,
		op: QueryOperator,
		value?: unknown,
	): this {
		const pred: QueryBooleanNode = {
			type: "predicate",
			predicate: { field, op, value },
		};
		this.whereNode = this.whereNode
			? { type: "and", nodes: [this.whereNode, pred] }
			: pred;
		return this;
	}

	and(
		group: (q: QueryBuilder<RecordShape>) => QueryBuilder<RecordShape>,
	): this {
		const nested = new QueryBuilder<RecordShape>(this.collection);
		group(nested);
		const node = nested.whereNode;
		if (node) {
			this.whereNode = this.whereNode
				? { type: "and", nodes: [this.whereNode, node] }
				: node;
		}
		return this;
	}

	or(group: (q: QueryBuilder<RecordShape>) => QueryBuilder<RecordShape>): this {
		const nested = new QueryBuilder<RecordShape>(this.collection);
		group(nested);
		const node = nested.whereNode;
		if (node) {
			this.whereNode = this.whereNode
				? { type: "or", nodes: [this.whereNode, node] }
				: node;
		}
		return this;
	}

	not(
		group: (q: QueryBuilder<RecordShape>) => QueryBuilder<RecordShape>,
	): this {
		const nested = new QueryBuilder<RecordShape>(this.collection);
		group(nested);
		const node = nested.whereNode;
		if (node) {
			const notNode: QueryBooleanNode = { type: "not", node };
			this.whereNode = this.whereNode
				? { type: "and", nodes: [this.whereNode, notNode] }
				: notNode;
		}
		return this;
	}

	orderBy(
		field: keyof RecordShape & string,
		direction: "asc" | "desc" = "asc",
	): this {
		this.sorts.push({ field, direction });
		return this;
	}

	limit(value: number): this {
		this.limitValue = value;
		return this;
	}

	skip(value: number): this {
		this.skipValue = value;
		return this;
	}

	include(
		relation: keyof RecordShape & string,
		config?: Omit<QueryRelationInclude, "relation">,
	): this {
		this.includes[String(relation)] = { relation: String(relation), ...config };
		return this;
	}

	toAst(mode?: QueryAst["mode"]): QueryAst {
		if (mode) this.mode = mode;
		return {
			collection: this.collection,
			where: this.whereNode,
			orderBy: this.sorts.length > 0 ? this.sorts : undefined,
			skip: this.skipValue,
			limit: this.limitValue,
			select:
				Object.keys(this.includes).length > 0
					? { include: this.includes }
					: undefined,
			mode: this.mode,
		};
	}
}
