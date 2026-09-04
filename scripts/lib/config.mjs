import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const skillVersion = fs.readFileSync(path.join(skillRoot, "VERSION"), "utf8").trim();
export const theme = JSON.parse(fs.readFileSync(path.join(skillRoot, "assets/mint-fresh-2/design-tokens.json"), "utf8"));
