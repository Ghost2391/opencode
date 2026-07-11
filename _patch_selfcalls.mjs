import fs from "fs";
const src = fs.readFileSync("index.mjs", "utf8");

let pos = 0;
let patches = [];

while (true) {
  const esmIdx = src.indexOf("var init_", pos);
  if (esmIdx === -1) break;
  
  const nameMatch = src.slice(esmIdx, esmIdx + 100).match(/var (init_\w+) = __esm/);
  if (!nameMatch) { pos = esmIdx + 1; continue; }
  
  const name = nameMatch[1];
  
  const factoryStart = src.indexOf('async "', esmIdx);
  if (factoryStart === -1) { pos = esmIdx + 1; continue; }
  
  const openBrace = src.indexOf("{", factoryStart);
  if (openBrace === -1) { pos = esmIdx + 1; continue; }
  
  // Find matching close brace
  let depth = 1;
  let closeBrace = openBrace;
  while (depth > 0 && closeBrace < src.length) {
    closeBrace++;
    if (src[closeBrace] === "{") depth++;
    else if (src[closeBrace] === "}") depth--;
  }
  
  const selfCallStr = "await " + name + "()";
  let searchPos = openBrace;
  while (true) {
    const selfIdx = src.indexOf(selfCallStr, searchPos);
    if (selfIdx === -1 || selfIdx >= closeBrace) break;
    
    const beforeText = src.slice(openBrace + 1, selfIdx);
    const hasPriorAwait = beforeText.includes("await init_");
    
    if (hasPriorAwait) {
      // This is a MIDDLE self-call - replace with await undefined
      const semiIdx = src.indexOf(";", selfIdx);
      if (semiIdx !== -1) {
        patches.push({
          from: selfIdx,
          to: semiIdx + 1,
          old: src.slice(selfIdx, semiIdx + 1),
          newStr: "await undefined;"
        });
      }
    }
    
    searchPos = selfIdx + 1;
  }
  
  pos = esmIdx + 1;
}

console.log("Found " + patches.length + " MIDDLE self-calls to patch");

// Sort by position descending to apply patches without offset issues
patches.sort((a, b) => b.from - a.from);

let result = src;
for (const p of patches) {
  result = result.slice(0, p.from) + p.newStr + result.slice(p.to);
}

fs.writeFileSync("index_patched.mjs", result);
console.log("Written to index_patched.mjs (" + result.length + " bytes)");
