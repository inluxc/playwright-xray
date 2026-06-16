import test from "node:test";
import assert from "node:assert/strict";
import { getArg } from "./args";

const ORIGINAL_ARGV = process.argv;
const ORIGINAL_ENV = { ...process.env };

function setArgv(args: string[]) {
  process.argv = ["node", "script.js", ...args];
}

function resetEnv() {
  process.env = { ...ORIGINAL_ENV };
}

function reset() {
  process.argv = ORIGINAL_ARGV;
  resetEnv();
}

// -------------------------
// CLI parsing
// -------------------------

test("reads --key=value format", () => {
  setArgv(["--project=chromium"]);

  assert.equal(getArg("project"), "chromium");

  reset();
});

test("reads --key value format", () => {
  setArgv(["--project", "firefox"]);

  assert.equal(getArg("project"), "firefox");

  reset();
});

test("reads boolean flag", () => {
  setArgv(["--dryRun"]);

  assert.equal(getArg("dryRun"), true);

  reset();
});

test("reads short flag", () => {
  setArgv(["-v"]);

  assert.equal(getArg("v"), true);

  reset();
});

test("returns undefined for missing flag", () => {
  setArgv([]);

  assert.equal(getArg("missing"), undefined);

  reset();
});

// -------------------------
// npm_config fallback
// -------------------------

test("reads npm_config fallback", () => {
  setArgv([]);

  process.env.npm_config_runid = "123";

  assert.equal(getArg("runid"), "123");

  reset();
});

// -------------------------
// ENV fallback
// -------------------------

test("reads ENV fallback", () => {
  setArgv([]);

  process.env.RUNID = "456";

  assert.equal(getArg("runid"), "456");

  reset();
});

// -------------------------
// priority order
// -------------------------

test("CLI overrides npm_config and ENV", () => {
  setArgv(["--runid=cli"]);

  process.env.npm_config_runid = "npm";
  process.env.RUNID = "env";

  assert.equal(getArg("runid"), "cli");

  reset();
});

test("npm_config overrides ENV", () => {
  setArgv([]);

  process.env.npm_config_runid = "npm";
  process.env.RUNID = "env";

  assert.equal(getArg("runid"), "npm");

  reset();
});

// -------------------------
// default values
// -------------------------

test("returns default when nothing set", () => {
  setArgv([]);

  assert.equal(getArg("runid", { default: "local" }), "local");

  reset();
});

// -------------------------
// edge cases
// -------------------------

test("handles multiple flags", () => {
  setArgv(["--project=chromium", "--dryRun", "--runid=abc"]);

  assert.equal(getArg("project"), "chromium");
  assert.equal(getArg("dryRun"), true);
  assert.equal(getArg("runid"), "abc");

  reset();
});

test("handles flag without explicit value", () => {
  setArgv(["--runid"]);

  assert.equal(getArg("runid"), true);

  reset();
});
