import fs from "fs";
const src = fs.readFileSync("index.mjs", "utf8");

let pos = 0;
let count = 0;
let middleCount = 0;

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
    
    count++;
    const beforeText = src.slice(openBrace + 1, selfIdx);
    const hasPriorAwait = beforeText.includes("await init_");
    
    if (hasPriorAwait) {
      middleCount++;
      console.log("MIDDLE #" + middleCount + ": " + name + " at byte " + selfIdx);
      const lineStart = src.lastIndexOf("\n", selfIdx) + 1;
      const lineEnd = src.indexOf("\n", selfIdx);
      console.log("  " + src.slice(lineStart, lineEnd === -1 ? src.length : lineEnd));
    }
    
    searchPos = selfIdx + 1;
  }
  
  pos = esmIdx + 1;
}

console.log("Total self-calls: " + count);
console.log("MIDDLE self-calls: " + middleCount);
