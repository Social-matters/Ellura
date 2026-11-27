/**
 * Keeps the brand name lower-case ("ellura") inside labels that the design sets in
 * capitals with text-transform (eyebrows, buttons, chips, announcement bar...).
 * Each "ellura" in such text is wrapped in <span class="brand-lc">, which resets the
 * transform. Runs once on load and again for content added later (cart drawer,
 * section re-renders in the theme editor).
 */
(function () {
  if (window.elluraBrandCase) return;
  window.elluraBrandCase = true;

  var WORD = /ellura/i;
  var SPLIT = /(ellura)/gi;

  var style = document.createElement('style');
  style.textContent = '.brand-lc{text-transform:none}';
  document.head.appendChild(style);

  function transformed(el) {
    var t = getComputedStyle(el).textTransform;
    return t === 'uppercase' || t === 'capitalize';
  }

  function fix(textNode) {
    var parent = textNode.parentElement;
    if (!parent || parent.classList.contains('brand-lc')) return;
    if (parent.closest('script, style, textarea, title, svg, [contenteditable]')) return;
    if (!transformed(parent)) return;
    var frag = document.createDocumentFragment();
    textNode.nodeValue.split(SPLIT).forEach(function (part) {
      if (!part) return;
      if (WORD.test(part) && part.length === 6) {
        var span = document.createElement('span');
        span.className = 'brand-lc';
        span.textContent = part.toLowerCase();
        frag.appendChild(span);
      } else {
        frag.appendChild(document.createTextNode(part));
      }
    });
    parent.replaceChild(frag, textNode);
  }

  function scan(root) {
    if (!root || !WORD.test(root.textContent || '')) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        return WORD.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(fix);
  }

  var pending = [];
  var queued = false;
  function flush() {
    queued = false;
    var list = pending;
    pending = [];
    list.forEach(function (n) {
      if (n.isConnected) scan(n.nodeType === 1 ? n : n.parentElement);
    });
  }

  function start() {
    scan(document.body);
    new MutationObserver(function (records) {
      records.forEach(function (r) {
        r.addedNodes.forEach(function (n) {
          if (n.nodeType === 1 || n.nodeType === 3) pending.push(n);
        });
      });
      if (pending.length && !queued) {
        queued = true;
        setTimeout(flush, 30);
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
