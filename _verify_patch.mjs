import fs from "fs";
const src = fs.readFileSync("index_patched.mjs", "utf8");

function findFactoryBody(src, name, startFrom) {
  const esmIdx = src.indexOf(name + " = __esm", startFrom);
  if (esmIdx === -1) return null;
  const factoryStart = src.indexOf('async "', esmIdx);
  if (factoryStart === -1) return null;
  const openBrace = src.indexOf("{", factoryStart);
  if (openBrace === -1) return null;
  let depth = 1;
  let closeBrace = openBrace;
  while (depth > 0 && closeBrace < src.length) {
    closeBrace++;
    if (src[closeBrace] === "{") depth++;
    else if (src[closeBrace] === "}") depth--;
  }
  return { body: src.slice(openBrace + 1, closeBrace), endPos: closeBrace };
}

function checkSelfCall(name) {
  const result = findFactoryBody(src, "init_" + name, 0);
  if (!result) { console.log(name + ": NOT FOUND"); return; }
  const body = result.body;
  const hasSelf = body.includes("await init_" + name + "()");
  const hasUndefined = body.includes("await undefined");
  const awaits = body.match(/await init_/g);
  console.log(name + ": self-call=" + hasSelf + ", replaced_with_undefined=" + hasUndefined + ", total_awaits=" + (awaits ? awaits.length : 0));
}

checkSelfCall("repo");
checkSelfCall("account2");
checkSelfCall("database");
checkSelfCall("migration");
checkSelfCall("global");
checkSelfCall("config2");
checkSelfCall("server5");
