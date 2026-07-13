if (!Array.prototype.toReversed) {
  Array.prototype.toReversed = function () { return this.slice().reverse(); };
}
if (!Array.prototype.toSorted) {
  Array.prototype.toSorted = function (fn) { return this.slice().sort(fn); };
}
if (!Array.prototype.toSpliced) {
  Array.prototype.toSpliced = function () { var a = this.slice(); a.splice.apply(a, arguments); return a; };
}
if (!Array.prototype.with) {
  Array.prototype.with = function (i, v) { var a = this.slice(); a[i] = v; return a; };
}
