import type { MelonDatabase } from "@melon/db";
import { compilePrismaQuery } from "./compiler.ts";
import type {
	PrismaFindManyArgs,
	PrismaLikeClient,
	PrismaModelClient,
} from "./types.ts";

/**
 * Creates a Prisma-inspired local client facade over MelonDatabase.
 */
export function createPrismaLikeClient(db: MelonDatabase): PrismaLikeClient {
	const client: PrismaLikeClient = {};

	for (const name of Object.keys(db.schema.collections)) {
		const model: PrismaModelClient = {
			async findMany(
				args?: PrismaFindManyArgs,
			): Promise<Record<string, unknown>[]> {
				const prepared = compilePrismaQuery(name, args, db.schema);
				return db.collection(name).findMany(prepared.ast) as Promise<
					Record<string, unknown>[]
				>;
			},

			async findFirst(
				args?: PrismaFindManyArgs,
			): Promise<Record<string, unknown> | null> {
				const prepared = compilePrismaQuery(name, args, db.schema, "one");
				return db.collection(name).findFirst(prepared.ast) as Promise<Record<
					string,
					unknown
				> | null>;
			},

			async count(args?: Omit<PrismaFindManyArgs, "select" | "include">) {
				const prepared = compilePrismaQuery(name, args, db.schema, "count");
				return db.collection(name).count(prepared.ast);
			},

			async create(args: { data: Record<string, unknown> }): Promise<
				Record<string, unknown>
			> {
				return db.write((tx) =>
					tx.collection(name).insert(args.data),
				) as Promise<Record<string, unknown>>;
			},

			async update(args: {
				where: Record<string, unknown>;
				data: Record<string, unknown>;
			}): Promise<Record<string, unknown>> {
				const first = await model.findFirst({ where: args.where });
				if (!first || typeof first !== "object" || !("id" in first)) {
					throw new Error("Record to update not found");
				}
				const id = (first as { id: string | number }).id;
				return db.write((tx) =>
					tx.collection(name).update(id, args.data),
				) as Promise<Record<string, unknown>>;
			},

			async delete(args: { where: Record<string, unknown> }): Promise<Record<
				string,
				unknown
			> | null> {
				const first = await model.findFirst({ where: args.where });
				if (!first || typeof first !== "object" || !("id" in first)) {
					return null;
				}
				const id = (first as { id: string | number }).id;
				await db.write((tx) => tx.collection(name).delete(id));
				return first;
			},
		};
		client[name] = model;
	}

	return client;
}
