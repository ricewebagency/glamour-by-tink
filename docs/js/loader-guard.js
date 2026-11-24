// Runs blocking in <head>: keeps the first paint dark so the page never flashes before the loader.
(function () {
  var FLAG = '__gbt_loader_seen__';
  var HIDE_CLASSES = ['bg-[#080605]', '[&>body]:invisible'];
  var FALLBACK_MS = 5000;
  var root = document.documentElement;
  var released = false;

  function release() {
    if (released) {
      return;
    }
    released = true;
    HIDE_CLASSES.forEach(function (name) {
      root.classList.remove(name);
    });
  }

  window.__gbtLoaderGuard = { release: release };

  if (typeof window.name === 'string' && window.name.indexOf(FLAG) !== -1) {
    released = true;
    return;
  }

  HIDE_CLASSES.forEach(function (name) {
    root.classList.add(name);
  });

  // Safety net: never leave the page hidden if script.js fails to load.
  window.setTimeout(release, FALLBACK_MS);
})();
