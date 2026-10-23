/** Read-only, pattern-based publication audit. Never prints matched values. */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const git = (...args) =>
  execFileSync("git", args, { maxBuffer: 32 * 1024 * 1024 });
const rules = [
  [
    "GitHub token",
    /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/,
  ],
  [
    "provider key",
    /\b(?:AKIA[0-9A-Z]{16}|AIza[\w-]{30,}|sk-(?:proj-)?[A-Za-z0-9_-]{30,})\b/,
  ],
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ["credential URL", /https?:\/\/[^\s/@:]+:[^\s/@]+@/],
  [
    "private home path",
    /(?:[A-Z]:[\\/](?:Users|Documents and Settings)[\\/]|\/home\/|\/Users\/)[A-Za-z0-9_.-]+/i,
  ],
  [
    "credential assignment",
    /(?:password|api[_-]?key|access[_-]?token|client[_-]?secret)\s*[=:]\s*["'][A-Za-z0-9_+/=-]{16,}["']/i,
  ],
];
const suspiciousPath =
  /(?:^|\/)(?:node_modules|dist|test-results|playwright-report|\.env(?:\..*)?|id_rsa|credentials)(?:\/|$)|\.(?:pem|key|log)$/i;
const objects = git("rev-list", "--objects", "--all")
  .toString()
  .trim()
  .split("\n");
const findings = [];
let blobs = 0;
for (const entry of objects) {
  const [sha, ...parts] = entry.split(" ");
  if (git("cat-file", "-t", sha).toString().trim() !== "blob") continue;
  blobs++;
  const path = parts.join(" ");
  if (suspiciousPath.test(path))
    findings.push({ scope: "history", sha, path, rule: "excluded path" });
  const content = git("cat-file", "blob", sha).toString("utf8");
  for (const [rule, expression] of rules) {
    if (expression.test(content))
      findings.push({ scope: "history", sha, path, rule });
  }
}
const tracked = git("ls-files", "-z").toString().split("\0").filter(Boolean);
for (const path of tracked) {
  if (suspiciousPath.test(path))
    findings.push({ scope: "worktree", path, rule: "excluded path" });
  const content = readFileSync(path, "utf8");
  for (const [rule, expression] of rules) {
    if (expression.test(content))
      findings.push({ scope: "worktree", path, rule });
  }
}
const authors = git("log", "--all", "--format=%ae%n%ce")
  .toString()
  .trim()
  .split("\n");
const nonNoreplyEmailCount = [...new Set(authors)].filter(
  (email) => !email.endsWith("@users.noreply.github.com"),
).length;
const result = {
  checkedAt: new Date().toISOString(),
  head: git("rev-parse", "HEAD").toString().trim(),
  reachableCommits: Number(
    git("rev-list", "--all", "--count").toString().trim(),
  ),
  reachableBlobs: blobs,
  trackedFiles: tracked.length,
  nonNoreplyEmailCount,
  findings,
  result: findings.length || nonNoreplyEmailCount ? "REVIEW REQUIRED" : "PASS",
  limitations:
    "Pattern scan plus manual review; not a guarantee of absence of every possible secret. Matched values are never printed. Generic documented project paths and public location metadata are retained. Binary screenshots/PDF also receive visual/metadata review.",
};
writeFileSync(
  "docs/verification/build-06-public-audit.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(JSON.stringify(result, null, 2));
if (result.result !== "PASS") process.exitCode = 1;
