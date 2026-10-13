// Reads the foundation's shell roles into two lists: the PSReadLine keys
// and the $PSStyle paths, each with the colour and style its role names.
// The port decides nothing about colour: a key no role lists is not here.

import { resolveTarget } from "@sepps-workshop/design-system/tools/build-tokens";

// Added in PSReadLine 2.2.0. The templates send them in a call of their
// own, so 2.1.0 (bundled with PowerShell 7.2) still takes every other key.
const PREDICTION_KEYS = new Set(["ListPrediction", "ListPredictionSelected"]);

// Foundation style name -> $PSStyle property.
const STYLE = { italic: "Italic", bold: "Bold", underline: "Underline" };

// A role's colour as { fg } or { bg }. An overlay is a background.
// PowerShell cannot blend, so it takes the value the foundation flattened
// over the terminal background.
function colourPart(tokens, target) {
  if (!target) return {};
  const [group, name] = target.split(".");
  return group === "overlay"
    ? { bg: tokens.overlay[name].hex_terminal }
    : { fg: resolveTarget(tokens, target) };
}

// One entry per key that a role lists under `list`. Two roles may share a
// key as background and text (Selection); anything else twice is a mistake
// in the foundation.
function entries(tokens, list) {
  const byKey = new Map();
  for (const role of Object.values(tokens.shell_roles)) {
    const part = colourPart(tokens, role.color);
    for (const key of role[list] ?? []) {
      const entry = byKey.get(key) ?? { key, style: [] };
      for (const [side, word] of [
        ["fg", "foregrounds"],
        ["bg", "backgrounds"],
      ]) {
        if (part[side] && entry[side])
          throw new Error(`${key} has two ${word} in shell_roles`);
      }
      byKey.set(key, {
        ...entry,
        ...part,
        style: [...entry.style, ...(role.style ?? [])],
      });
    }
  }
  return [...byKey.values()];
}

export const psreadlineEntries = (tokens) =>
  entries(tokens, "psreadline").map((entry) => ({
    ...entry,
    prediction: PREDICTION_KEYS.has(entry.key),
  }));

export const psstyleEntries = (tokens) => entries(tokens, "psstyle");

export function rgbTriple(hex) {
  return [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
}

// An entry as a PowerShell expression: styles, then foreground, then background.
export function psValue({ fg, bg, style }) {
  const colour = (ground, hex) =>
    `$PSStyle.${ground}.FromRgb(${rgbTriple(hex).join(", ")})`;
  return [
    ...style.map((name) => `$PSStyle.${STYLE[name]}`),
    fg && colour("Foreground", fg),
    bg && colour("Background", bg),
  ]
    .filter(Boolean)
    .join(" + ");
}
