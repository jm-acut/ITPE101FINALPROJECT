import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildSpec } from "../../src/docs/openapi.js";
import { api, bearer, cleanup, newAdmin } from "./helpers.js";

afterAll(cleanup);

const spec = buildSpec();
const operations = Object.entries(spec.paths).flatMap(([path, methods]) =>
    Object.entries(methods).map(([method, op]) => ({ method, path, op, label: `${method.toUpperCase()} ${path}` }))
);

let admin;
beforeAll(async () => {
    admin = await newAdmin();
});

// Every documented operation must exist in the running API, and must answer with a documented status code.
// Each request is deliberately "empty" (no body, a random id), so it is rejected cheaply without changing any data.
describe("the running API matches the OpenAPI specification", () => {
    it("answers every documented operation with a documented status", async () => {
        const problems = [];

        for (const { method, path, op, label } of operations) {
            const url = `/api/v1${path.replace(/\{code\}/g, "ABCDEFGHIJK").replace(/\{\w+\}/g, () => randomUUID())}`;
            const res = await api()[method](url).set(bearer(admin)).send({});

            if (res.body?.error?.code === "ROUTE_NOT_FOUND") {
                problems.push(`${label}: the route does not exist`);
            } else if (!(String(res.status) in op.responses)) {
                problems.push(`${label}: answered ${res.status} (${res.body?.error?.code ?? "no code"}), which the specification does not document`);
            }
        }
        expect(problems).toEqual([]);
    });
});