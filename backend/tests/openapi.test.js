import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildSpec } from "../src/docs/openapi.js";

const spec = buildSpec();
const METHODS = ["get", "post", "put", "patch", "delete"];
const operations = Object.entries(spec.paths).flatMap(([path, methods]) =>
    Object.entries(methods).map(([method, op]) => ({ method, path, op, label: `${method.toUpperCase()} ${path}` }))
);

describe("OpenAPI specification (T-10)", () => {
    it("declares OpenAPI 3, an authentication scheme and a shared error shape", () => {
        expect(spec.openapi).toMatch(/^3\./);
        expect(spec.components.securitySchemes.bearerAuth).toMatchObject({ type: "http", scheme: "bearer" });
        expect(spec.components.schemas.ErrorResponse.properties.error).toBeTruthy();
    });

    it("documents at least 40 operations with unique operation ids", () => {
        expect(operations.length).toBeGreaterThanOrEqual(40);
        const ids = operations.map((o) => o.op.operationId);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it("gives every operation a tag, a summary, a success response and an example", () => {
        for (const { op, label } of operations) {
            expect(op.tags?.length, `${label} tag`).toBeGreaterThan(0);
            expect(op.summary, `${label} summary`).toBeTruthy();
            const success = Object.keys(op.responses).filter((code) => code.startsWith("2"));
            expect(success.length, `${label} success response`).toBeGreaterThan(0);
            for (const code of success) {
                if (code !== "204") expect(op.responses[code].content?.["application/json"]?.example, `${label} ${code} example`).toBeTruthy();
            }
            if (op.requestBody) expect(op.requestBody.content["application/json"].example, `${label} request example`).toBeTruthy();
        }
    });

    it("declares every path parameter and marks protected operations with the bearer scheme", () => {
        for (const { path, op, label } of operations) {
            for (const match of path.matchAll(/\{(\w+)\}/g)) {
                expect(op.parameters?.some((p) => p.in === "path" && p.name === match[1]), `${label} param ${match[1]}`).toBe(true);
            }
           const isProtected = op.security?.some(
    (scheme) => Object.hasOwn(scheme, "bearerAuth")
) ?? false;

if (op.security?.length > 0) {
    expect(isProtected, `${label} bearer authentication`).toBe(true);
}
        }
        for (const { path, op } of operations.filter((o) => o.path.startsWith("/admin"))) {
            expect(op.responses[403], `${path} documents 403`).toBeTruthy();
        }
    });

    it("resolves every $ref", () => {
        const text = JSON.stringify(spec);
        for (const match of text.matchAll(/"\$ref":"#\/components\/(\w+)\/(\w+)"/g)) {
            expect(spec.components[match[1]]?.[match[2]], match[0]).toBeTruthy();
        }
    });
});

describe("the frontend uses only documented endpoints (T-24)", () => {
    const normalize = (path) => path.replace(/\$\{[^}]+\}/g, "{}").replace(/\{\w+\}/g, "{}");
    const documented = new Set(operations.map((o) => `${o.method} ${normalize(o.path)}`));

    const source = readFileSync(new URL("../../frontend/src/api/client.js", import.meta.url), "utf8");
    const calls = [...source.matchAll(/api\.(get|post|put|patch|delete)\(\s*(["'`])((?:\\.|(?!\2).)*)\2/g)]
        .filter((match) => match[3].startsWith("/"))
        .map((match) => ({ method: match[1], path: normalize(match[3]) }));

    it("finds the frontend's API calls", () => {
        expect(calls.length).toBeGreaterThan(30);
    });

    it("has no call to an undocumented endpoint", () => {
        const undocumented = calls.filter((c) => !documented.has(`${c.method} ${c.path}`)).map((c) => `${c.method.toUpperCase()} ${c.path}`);
        expect(undocumented).toEqual([]);
    });

    it("documents methods in lowercase OpenAPI form only", () => {
        for (const { method } of operations) expect(METHODS).toContain(method);
    });
});