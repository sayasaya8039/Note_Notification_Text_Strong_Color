'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

class FakeStyle {
  constructor() {
    this.values = new Map();
  }

  setProperty(name, value) {
    this.values.set(name, value);
  }

  removeProperty(name) {
    this.values.delete(name);
  }

  getPropertyValue(name) {
    return this.values.get(name) || '';
  }
}

class FakeElement {
  constructor(tagName, options = {}) {
    this.nodeType = 1;
    this.tagName = tagName.toUpperCase();
    this.className = options.className || '';
    this.href = options.href || '';
    this._text = options.text || '';
    this.attributes = new Map();
    this.children = [];
    this.parentElement = null;
    this.style = new FakeStyle();
  }

  get classList() {
    return {
      contains: (name) => this.className.split(/\s+/).includes(name),
    };
  }

  get nextElementSibling() {
    if (!this.parentElement) return null;
    const siblings = this.parentElement.children;
    const index = siblings.indexOf(this);
    return index >= 0 ? siblings[index + 1] || null : null;
  }

  get textContent() {
    return this._text + this.children.map((child) => child.textContent).join('');
  }

  set textContent(value) {
    this._text = value;
    this.children = [];
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  insertAdjacentElement(position, child) {
    if (position !== 'afterend' || !this.parentElement) {
      return this.appendChild(child);
    }
    const siblings = this.parentElement.children;
    const index = siblings.indexOf(this);
    child.parentElement = this.parentElement;
    siblings.splice(index + 1, 0, child);
    return child;
  }

  remove() {
    if (!this.parentElement) return;
    const siblings = this.parentElement.children;
    const index = siblings.indexOf(this);
    if (index >= 0) siblings.splice(index, 1);
    this.parentElement = null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === 'class') this.className = String(value);
    if (name === 'href') this.href = String(value);
  }

  getAttribute(name) {
    if (name === 'class') return this.className;
    if (name === 'href') return this.href;
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  addEventListener() {}

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const results = [];
    walk(this, (node) => {
      if (node !== this && matchesSelector(node, selector)) {
        results.push(node);
      }
    });
    return results;
  }

  closest(selector) {
    let node = this;
    while (node) {
      if (matchesSelector(node, selector)) return node;
      node = node.parentElement;
    }
    return null;
  }
}

class FakeDocument {
  constructor(body) {
    this.body = body;
    this.documentElement = new FakeElement('html');
    this.documentElement.appendChild(body);
    this.visibilityState = 'visible';
  }

  createElement(tagName) {
    return new FakeElement(tagName);
  }

  addEventListener() {}

  querySelector(selector) {
    return this.body.querySelector(selector);
  }

  querySelectorAll(selector) {
    return this.body.querySelectorAll(selector);
  }
}

function walk(node, visitor) {
  visitor(node);
  for (const child of node.children) {
    walk(child, visitor);
  }
}

function matchesSelector(node, selector) {
  return selector.split(',').some((part) => matchesSingleSelector(node, part.trim()));
}

function matchesSingleSelector(node, selector) {
  if (!selector) return false;
  if (selector.startsWith('.')) {
    return node.classList.contains(selector.slice(1));
  }
  const attrOnly = selector.match(/^\[([^\]]+)\]$/);
  if (attrOnly) {
    return node.getAttribute(attrOnly[1]) !== null;
  }
  const tagOnly = selector.match(/^[a-z]+$/i);
  if (tagOnly) {
    return node.tagName === selector.toUpperCase();
  }
  const classContains = selector.match(/^([a-z]+)?\[class\*="([^"]+)"\](\[href\])?$/i);
  if (classContains) {
    const tag = classContains[1];
    const needle = classContains[2];
    const needsHref = Boolean(classContains[3]);
    if (tag && node.tagName !== tag.toUpperCase()) return false;
    if (!node.className.includes(needle)) return false;
    return !needsHref || Boolean(node.href);
  }
  return false;
}

function makeElement(tagName, options) {
  return new FakeElement(tagName, options);
}

function createFixture() {
  const body = makeElement('body');
  const panel = makeElement('div', { className: 'm-navbarNoticePanel' });
  const list = makeElement('div', { className: 'm-navbarNoticeItemList' });

  const validItem = makeElement('div', { className: 'm-navbarNoticeItem' });
  validItem.appendChild(makeElement('a', {
    className: 'm-navbarNoticeItem__link',
    href: 'https://note.com/example/n/n123',
    text: '\u00a0',
  }));
  validItem.appendChild(makeElement('div', {
    className: 'm-navbarNoticeItem__body',
    text: '書籍化・映像化のチャンス！募集開始！',
  }));

  const emptyItem = makeElement('div', { className: 'm-navbarNoticePlaceholder' });
  emptyItem.appendChild(makeElement('a', {
    className: 'm-navbarNoticeItem__link',
    href: 'https://note.com/example/n/empty',
    text: '\u00a0',
  }));

  const orphanButton = makeElement('span', {
    className: 'nnts-new-tab-btn',
    text: '\u21D7 \u65B0\u3057\u3044\u30BF\u30D6\u3067\u958B\u304F',
  });

  list.appendChild(orphanButton);
  list.appendChild(emptyItem);
  list.appendChild(validItem);
  panel.appendChild(list);
  body.appendChild(panel);

  return { body, panel, list, validItem, emptyItem, orphanButton };
}

function runContentScript(fixture) {
  const intervals = [];
  const context = {
    URL,
    console,
    location: { href: 'https://note.com/notifications' },
    history: {
      pushState() {},
      replaceState() {},
    },
    document: new FakeDocument(fixture.body),
    window: {
      addEventListener() {},
    },
    chrome: {
      runtime: {
        sendMessage() {},
      },
      storage: {
        sync: {
          get(defaults, callback) {
            callback(Object.assign({}, defaults, { enabled: true, newTabButton: true }));
          },
        },
        onChanged: {
          addListener() {},
        },
      },
    },
    MutationObserver: class {
      observe() {}
    },
    requestAnimationFrame(callback) {
      callback();
      return 1;
    },
    setInterval(callback) {
      intervals.push(callback);
      return intervals.length;
    },
    clearInterval() {},
  };

  context.window.document = context.document;
  context.window.chrome = context.chrome;
  context.window.location = context.location;
  context.window.history = context.history;

  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'content.js'), 'utf8');
  vm.runInNewContext(source, context, { filename: 'content.js' });

  return intervals;
}

const fixture = createFixture();
const intervals = runContentScript(fixture);

assert.equal(fixture.orphanButton.parentElement, null, '孤立した既存ボタンは削除される');
assert.equal(
  fixture.validItem.querySelectorAll('.nnts-new-tab-btn').length,
  1,
  '本文を持つお知らせアイテムにはボタンが1つだけ追加される',
);
assert.equal(
  fixture.emptyItem.querySelectorAll('.nnts-new-tab-btn').length,
  0,
  '本文を持たないオーバーレイだけの要素にはボタンを追加しない',
);

for (const scan of intervals) {
  scan();
}

assert.equal(
  fixture.validItem.querySelectorAll('.nnts-new-tab-btn').length,
  1,
  '定期スキャン後もボタンは重複しない',
);

const button = fixture.validItem.querySelector('.nnts-new-tab-btn');
assert.equal(button.parentElement, fixture.validItem, 'ボタンはパネル直下ではなくアイテム内に配置される');
assert.equal(button.getAttribute('data-href'), 'https://note.com/example/n/n123');

console.log('content-new-tab-buttons tests passed');
