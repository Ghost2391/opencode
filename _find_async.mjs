import fs from "fs";
const src = fs.readFileSync("index.mjs", "utf8");
let pos = 0;
let count = 0;
while (true) {
  const idx = src.indexOf('async "', pos);
  if (idx === -1 || count > 50) break;
  count++;
  const pre = src.slice(Math.max(0, idx - 100), idx);
  const lines = pre.split('\n');
  const lastLine = lines[lines.length - 1];
  const match = lastLine.match(/var\s+(\w+)\s*=\s*__esm\s*\{\s*$/);
  const pathEnd = src.indexOf('"', idx + 7);
  const path = src.slice(idx + 7, pathEnd);
  if (match) {
    console.log(count + ". " + match[1] + " -> " + path);
  } else {
    console.log(count + ". (unknown) -> " + path);
  }
  pos = idx + 7;
}
console.log("Total async factories scanned:", count);
