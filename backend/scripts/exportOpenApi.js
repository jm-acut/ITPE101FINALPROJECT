// Writes openapi.yaml in the project root from src/docs/openapi.js.  Run: npm run docs:openapi
import { writeFileSync } from "node:fs";
import { stringify } from "yaml";
import { buildSpec } from "../src/docs/openapi.js";

const target = new URL("../../openapi.yaml", import.meta.url);
writeFileSync(target, stringify(buildSpec(), { lineWidth: 0, aliasDuplicateObjects: false }));
console.log("Wrote openapi.yaml in the project root.");