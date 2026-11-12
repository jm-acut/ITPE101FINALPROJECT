// Runs both test suites and writes docs/test-results.md from the REAL output (results are shown, never typed by hand).
// Usage: npm run test:report
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

const OUT_DIR = "tests/.out";
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync("../docs", { recursive: true });

const suites = [
    { title: "Unit and validation tests (no database)", file: `${OUT_DIR}/unit.json`, args: [] },
    { title: "Integration tests (real HTTP calls against a test database)", file: `${OUT_DIR}/integration.json`, args: ["--config", "vitest.integration.config.js"] }
];

for (const suite of suites) {
    rmSync(suite.file, { force: true });
    console.log(`\n=== ${suite.title} ===`);
    spawnSync("npx", ["vitest", "run", "--reporter=default", "--reporter=json", `--outputFile.json=${suite.file}`, ...suite.args], {
        stdio: "inherit",
        shell: true
    });
}

const esc = (text) => String(text).replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
const lines = [
    "# Test results",
    "",
    `Generated automatically by \`npm run test:report\` on ${new Date().toISOString().slice(0, 10)}. Do not edit by hand.`,
    ""
];
let totalPassed = 0;
let totalAll = 0;

for (const suite of suites) {
    lines.push(`## ${suite.title}`, "");

    if (!existsSync(suite.file)) {
        lines.push("_This suite did not produce results (for example, `backend/.env.test` is missing or a file failed to load)._", "");
        continue;
    }

    const report = JSON.parse(readFileSync(suite.file, "utf8"));
    totalPassed += report.numPassedTests ?? 0;
    totalAll += report.numTotalTests ?? 0;
    lines.push(`**${report.numPassedTests} passed, ${report.numFailedTests} failed, ${report.numTotalTests} total.**`, "");
    lines.push("| File | Test | Result | ms |", "|---|---|---|---|");

    for (const file of report.testResults) {
        const name = relative(resolve("."), file.name).replace(/\\/g, "/");
        for (const test of file.assertionResults) {
            const mark = test.status === "passed" ? "PASS" : test.status === "failed" ? "FAIL" : test.status.toUpperCase();
            lines.push(`| ${esc(name)} | ${esc(test.fullName ?? test.title)} | ${mark} | ${Math.round(test.duration ?? 0)} |`);
        }
    }
    lines.push("");
}

lines.push(`**Overall: ${totalPassed} of ${totalAll} tests passed.**`, "");
writeFileSync("../docs/test-results.md", lines.join("\n"));
console.log(`\nWrote docs/test-results.md (${totalPassed} of ${totalAll} passed).`);