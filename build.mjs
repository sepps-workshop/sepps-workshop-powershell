// Reads foundation tokens from @sepps-workshop/design-system, emits the
// standalone theme script and the module, and copies the README images
// from the foundation.

import { mkdirSync, writeFileSync, copyFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import tokens from "@sepps-workshop/design-system";

import {
  buildTheme,
  buildModule,
  buildManifest,
  THEME_ID,
  MODULE_NAME,
} from "./src/templates.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const IMAGES = join(ROOT, "images");
const { version } = JSON.parse(
  readFileSync(join(ROOT, "package.json"), "utf8"),
);

const files = {
  [join("themes", `${THEME_ID}.ps1`)]: buildTheme(tokens),
  [join(MODULE_NAME, `${MODULE_NAME}.psm1`)]: buildModule(tokens),
  [join(MODULE_NAME, `${MODULE_NAME}.psd1`)]: buildManifest(version),
};
for (const [path, content] of Object.entries(files)) {
  mkdirSync(dirname(join(ROOT, path)), { recursive: true });
  writeFileSync(join(ROOT, path), content, "utf8");
}

// The images are the foundation's; copying them here keeps them from drifting.
mkdirSync(IMAGES, { recursive: true });
for (const image of ["sepps-workshop-header.jpg", "sepp-recruiting.png"]) {
  copyFileSync(
    fileURLToPath(
      import.meta.resolve(`@sepps-workshop/design-system/assets/${image}`),
    ),
    join(IMAGES, image),
  );
}

console.log(`Built ${Object.keys(files).join(", ")} (v${version}) and images/`);
