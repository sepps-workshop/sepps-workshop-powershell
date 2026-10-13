import { test } from "node:test";
import assert from "node:assert/strict";
import tokens from "@sepps-workshop/design-system";
import { resolveTarget } from "@sepps-workshop/design-system/tools/build-tokens";
import {
  psreadlineEntries,
  psstyleEntries,
  psValue,
  rgbTriple,
} from "./shell-roles.mjs";

const psr = Object.fromEntries(
  psreadlineEntries(tokens).map((e) => [e.key, e]),
);
const pss = Object.fromEntries(psstyleEntries(tokens).map((e) => [e.key, e]));
const listed = (list) => [
  ...new Set(Object.values(tokens.shell_roles).flatMap((r) => r[list] ?? [])),
];

test("every key a shell role lists has exactly one entry", () => {
  assert.ok(
    listed("psreadline").length >= 18,
    "the foundation lists PSReadLine keys",
  );
  assert.ok(
    listed("psstyle").length >= 11,
    "the foundation lists $PSStyle paths",
  );
  assert.deepEqual(Object.keys(psr).sort(), listed("psreadline").sort());
  assert.deepEqual(Object.keys(pss).sort(), listed("psstyle").sort());
  assert.equal(psreadlineEntries(tokens).length, listed("psreadline").length);
});

test("a text role is a foreground resolved from the tokens", () => {
  assert.equal(
    psr.Command.fg,
    resolveTarget(tokens, tokens.shell_roles.command.color),
  );
  assert.equal(psr.Default.fg, resolveTarget(tokens, "fg"));
  assert.equal(psr.Command.bg, undefined);
  assert.equal(
    pss["Formatting.Warning"].fg,
    resolveTarget(tokens, "semantic.warning"),
  );
});

test("an overlay role is a background flattened over the terminal", () => {
  assert.equal(
    psr.ListPredictionSelected.bg,
    tokens.overlay.selected_item.hex_terminal,
  );
  assert.equal(psr.ListPredictionSelected.fg, undefined);
});

test("Selection merges the overlay and its text role", () => {
  assert.equal(psr.Selection.bg, tokens.overlay.selection.hex_terminal);
  assert.equal(
    psr.Selection.fg,
    resolveTarget(tokens, tokens.shell_roles.selection_text.color),
  );
});

test("styles travel with the entry", () => {
  assert.deepEqual(psr.Comment.style, ["italic"]);
  assert.deepEqual(pss["FileInfo.Directory"].style, ["bold"]);
  assert.deepEqual(psr.Command.style, []);
});

test("only the two keys PSReadLine 2.2.2 added are marked as prediction keys", () => {
  const marked = psreadlineEntries(tokens)
    .filter((e) => e.prediction)
    .map((e) => e.key);
  assert.deepEqual(marked.sort(), ["ListPrediction", "ListPredictionSelected"]);
});

test("two foregrounds for one key are refused", () => {
  const broken = structuredClone(tokens);
  broken.shell_roles.second = { color: "fg", psreadline: ["Command"] };
  assert.throws(() => psreadlineEntries(broken), /Command.*two foregrounds/);
});

test("an unknown colour target is refused, not replaced", () => {
  const broken = structuredClone(tokens);
  broken.shell_roles.command.color = "fuction";
  assert.throws(() => psreadlineEntries(broken), /Unknown colour target/);
});

test("rgbTriple reads a six-digit hex string", () => {
  const hex = tokens.text.fg;
  assert.deepEqual(
    rgbTriple(hex),
    [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)),
  );
});

test("psValue writes styles first, then foreground, then background", () => {
  const [r, g, b] = rgbTriple(psr.Comment.fg);
  assert.equal(
    psValue(psr.Comment),
    `$PSStyle.Italic + $PSStyle.Foreground.FromRgb(${r}, ${g}, ${b})`,
  );
  assert.match(
    psValue(psr.Selection),
    /^\$PSStyle\.Foreground\.FromRgb\(\d+, \d+, \d+\) \+ \$PSStyle\.Background\.FromRgb\(\d+, \d+, \d+\)$/,
  );
  assert.match(
    psValue(psr.ListPredictionSelected),
    /^\$PSStyle\.Background\.FromRgb\(/,
  );
});
