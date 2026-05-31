import type { InsertInput, UpdateInput } from '@melon/db';

export type PrismaWhereInput = Record<string, unknown>;

export type PrismaOrderByInput = Record<string, 'asc' | 'desc'>;

export interface PrismaFindManyArgs {
  where?: PrismaWhereInput;
  orderBy?: PrismaOrderByInput | PrismaOrderByInput[];
  skip?: number;
  take?: number;
  select?: Record<string, boolean>;
  include?: Record<string, boolean | PrismaFindManyArgs>;
}

export interface PrismaModelClient<RecordShape = Record<string, unknown>> {
  findMany(args?: PrismaFindManyArgs): Promise<RecordShape[]>;
  findFirst(args?: PrismaFindManyArgs): Promise<RecordShape | null>;
  count(args?: Omit<PrismaFindManyArgs, 'select' | 'include'>): Promise<number>;
  create(args: { data: InsertInput<RecordShape> }): Promise<RecordShape>;
  update(args: { where: PrismaWhereInput; data: UpdateInput<RecordShape> }): Promise<RecordShape>;
  delete(args: { where: PrismaWhereInput }): Promise<RecordShape | null>;
}

export interface PrismaLikeClient {
  [model: string]: PrismaModelClient<Record<string, unknown>>;
}
