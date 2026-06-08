(function () {
  function findCover(pm) {
    function imageFromBlock(block) {
      if (!block) return null;
      if (block.classList.contains("image") && block.classList.contains("image-full-width")) return block;
      return block.querySelector(".image.image-full-width");
    }

    var first = pm.firstElementChild;
    if (!first) return null;

    var cover = imageFromBlock(first);
    if (cover) return cover;

    if (first.classList.contains("image-position-anchor") || first.classList.contains("ProseMirror-widget")) {
      var next = first.nextElementSibling;
      cover = imageFromBlock(next);
      if (cover) return cover;
    }

    return null;
  }

  function findInsertionHost(pm) {
    var fallback = pm.parentElement;
    var el = pm.parentElement;

    for (var i = 0; el && i < 8; i++, el = el.parentElement) {
      var style = window.getComputedStyle(el);
      var children = Array.prototype.slice.call(el.children);
      var editorIndex = -1;

      for (var j = 0; j < children.length; j++) {
        if (children[j].contains(pm)) {
          editorIndex = j;
          break;
        }
      }

      if (editorIndex <= 0) continue;

      var hasTitleBeforeEditor = false;
      for (var k = 0; k < editorIndex; k++) {
        var child = children[k];
        if (
          child.matches('h1, [contenteditable="true"], [aria-label*="title" i], [data-testid*="title" i]') ||
          child.querySelector('h1, [contenteditable="true"], [aria-label*="title" i], [data-testid*="title" i]')
        ) {
          hasTitleBeforeEditor = true;
          break;
        }
      }

      if (style.display === "flex" && style.flexDirection === "column" && hasTitleBeforeEditor) {
        return el;
      }
    }

    return fallback;
  }

  function clearInjectedCover() {
    var injected = document.querySelector(".cover-image-injected");
    if (injected) injected.remove();
    document.documentElement.classList.remove("has-cover-image");
    Array.prototype.forEach.call(document.querySelectorAll(".cover-image-hidden"), function (el) {
      el.classList.remove("cover-image-hidden");
    });
    Array.prototype.forEach.call(document.querySelectorAll(".cover-image-host"), function (el) {
      el.classList.remove("cover-image-host");
    });
  }

  function inject() {
    var pm = document.querySelector(".ProseMirror");
    if (!pm) {
      clearInjectedCover();
      return false;
    }

    var cover = findCover(pm);
    if (!cover) {
      clearInjectedCover();
      return false;
    }

    var img = cover.querySelector("img");
    if (!img) return false;
    var src = img.currentSrc || img.src;
    if (!src) return false;

    var host = findInsertionHost(pm);
    if (!host) return false;

    var existing = document.querySelector(".cover-image-injected");
    if (existing && existing.getAttribute("data-cover-src") === src && existing.parentElement === host) {
      cover.classList.add("cover-image-hidden");
      host.classList.add("cover-image-host");
      document.documentElement.classList.add("has-cover-image");
      return true;
    }

    clearInjectedCover();

    var wrapper = document.createElement("div");
    wrapper.className = "cover-image-injected";
    wrapper.setAttribute("data-cover-src", src);

    var clone = document.createElement("img");
    clone.src = src;
    clone.alt = img.alt || "";
    clone.decoding = "async";
    wrapper.appendChild(clone);

    host.insertBefore(wrapper, host.firstChild);
    host.classList.add("cover-image-host");
    cover.classList.add("cover-image-hidden");
    document.documentElement.classList.add("has-cover-image");
    return true;
  }

  var scheduled = false;
  function scheduleInject() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(function () {
      scheduled = false;
      inject();
    });
  }

  var observer = new MutationObserver(scheduleInject);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      inject();
      observer.observe(document.body, { childList: true, subtree: true });
    });
  } else {
    inject();
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
