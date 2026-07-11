import fs from "fs";
import path from "path";

// Step 1: Copy jsonc-parser to release node_modules
const srcDir = "D:\\code\\opencode-win7\\opencode-dev\\node_modules\\.bun\\jsonc-parser@3.3.1\\node_modules\\jsonc-parser";
const dstDir = "D:\\code\\opencode-win7\\opencode-dev\\packages\\opencode\\dist\\win7\\release\\node_modules\\jsonc-parser";

function copyRecursive(src, dst) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of entries) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}
console.log("Copying jsonc-parser to release node_modules...");
copyRecursive(srcDir, dstDir);
console.log("Done.");

// Step 2: Patch the bundle
const bundlePath = "D:\\code\\opencode-win7\\opencode-dev\\packages\\opencode\\dist\\win7\\index_patched.mjs";
let src = fs.readFileSync(bundlePath, "utf8");
console.log("Bundle size:", src.length);

// Find the jsonc-parser wrapper
const marker = "../../node_modules/.bun/jsonc-parser@3.3.1/node_modules/jsonc-parser/lib/umd/main.js";
const jIdx = src.indexOf(marker);
if (jIdx === -1) { console.log("jsonc-parser wrapper NOT FOUND"); process.exit(1); }

// Find the factory14(__require, exports2) call
const factoryCallIdx = src.indexOf("factory14(__require, exports2)", jIdx);
if (factoryCallIdx === -1) { console.log("factory14 call NOT FOUND"); process.exit(1); }

// Replace factory14(__require, exports2) with factory14(__require_jsonc, exports2)
src = src.slice(0, factoryCallIdx) + "factory14(__require_jsonc, exports2)" + src.slice(factoryCallIdx + "factory14(__require, exports2)".length);

// Add __require_jsonc definition BEFORE the require_main declaration
// Find the var require_main = __commonJS({ line
const rmIdx = src.indexOf("var require_main = __commonJS", jIdx - 200);
if (rmIdx === -1) { console.log("require_main NOT FOUND"); process.exit(1); }

const jsoncRequireShim = 
`var __require_jsonc = __cr(new URL("node_modules/jsonc-parser/lib/umd/", import.meta.url));
`;

src = src.slice(0, rmIdx) + jsoncRequireShim + src.slice(rmIdx);

// Also fix all other CJS modules that have similar issues
// Search for __commonJS wrappers that pass __require as require function
// Pattern: factory14(__require, exports2) or similar
// More generic: look for CJS wrappers that do require5("./...")
for (const subModule of ["./impl/format", "./impl/edit", "./impl/scanner", "./impl/parser"]) {
  let pos = 0;
  while (true) {
    const idx = src.indexOf(subModule, pos);
    if (idx === -1) break;
    // Check if this is inside a require5("./impl/format") call
    const before = src.slice(Math.max(0, idx - 20), idx);
    if (before.includes("require5(") || before.includes("require(")) {
      // This should be handled by the jsonc-parser require fix above
      console.log("Found reference to " + subModule + " at byte " + idx);
    }
    pos = idx + 1;
  }
}

fs.writeFileSync(bundlePath, src);
console.log("Patched bundle written to " + bundlePath);

// Verify the patch
const verify = fs.readFileSync(bundlePath, "utf8");
if (verify.includes("__require_jsonc")) {
  console.log("Verified: __require_jsonc shim present");
} else {
  console.log("ERROR: __require_jsonc shim NOT found!");
}
