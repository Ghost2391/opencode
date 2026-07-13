const u = function() {
  let s = { pending: false, vars: null };
  return {
    get isPending() { return s.pending; },
    get variables() { return s.vars; },
    mutate: (v) => { s.pending = true; s.vars = v; s.pending = false; },
  };
};
export { u };
