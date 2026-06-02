import { predicate, queryAst } from "../src/ast.js";
import { taskSchemaDefinition } from "./task-schema.js";
export const adapterCrudSchemaDefinition = taskSchemaDefinition;
export const filterSortLimitQuery = queryAst("tasks", {
    where: predicate("status", "eq", "open"),
    orderBy: [{ field: "priority", direction: "desc" }],
    limit: 1,
});
export const filterSortLimitSeeds = [
    {
        id: "a",
        title: "A",
        status: "open",
        priority: 3,
        updatedAt: new Date("2024-02-01"),
    },
    {
        id: "b",
        title: "B",
        status: "open",
        priority: 1,
        updatedAt: new Date("2024-03-01"),
    },
    {
        id: "c",
        title: "C",
        status: "closed",
        priority: 5,
        updatedAt: new Date("2024-01-01"),
    },
];
export const insertFindUpdateDeleteSeed = {
    id: "t1",
    title: "First",
    status: "open",
    priority: 1,
    updatedAt: new Date("2024-01-01"),
};
//# sourceMappingURL=adapter-crud-vectors.js.map