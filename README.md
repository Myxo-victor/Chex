# ChexJs

[![npm version](https://img.shields.io/npm/v/@myxo-victor/chexjs/6.1.4)](https://www.npmjs.com/package/@myxo-victor/chexjs)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](#license)

**Chex.js v6.1.4** is a lightweight, high-performance JavaScript UI engine for building reactive, component-driven interfaces. It runs directly in the browser with zero build steps, no compilers, and no `node_modules` overhead.

This release reflects the current framework direction: a unified reactive engine with a richer set of browser-native utilities, form helpers, motion libraries, storage tools, and component-ready modules that now ship in the core project.

[📚 Documentation](https://chex.aximon.ng) | [💬 Help / Chat](mailto:ochiabutovictor8@gmail.com)

### Highlights in v6.1.4

- Unified VDOM + reactive signal engine
- Stronger component-oriented application structure
- Expanded standalone utility library set
- Form, modal, animation, carousel, and storage helpers ready to use
- Smooth browser-first development without a bundler or framework setup

---

## What is Chex?

| Tool | Type | Description |
|---|---|---|
| React | Library | A JavaScript library for building UIs |
| Vue | Progressive Framework | Adoptable framework that scales |
| Angular | Full Framework | Complete platform with all batteries included |
| **Chex** | **Zero-Build UI Engine** | **A minimal, browser-native engine with signals, VDOM, and a built-in PHP backend bridge — just a script tag, no compiler** |

Chex sits between a library and a micro-framework. It gives you structure (components, routing, state) without the weight of a full framework or the configuration of a modern build chain.

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Fast Element API](#fast-element-api)
- [Core Features](#core-features)
- [Backend Database Engine](#backend-database-engine)
- [Standalone Libraries](#standalone-libraries)
- [Philosophy](#philosophy)
- [License](#license)

---

## Installation

Install via npm:

```bash
npm install @myxo-victor/chexjs
```

Or drop the script tag directly into your HTML:

```html
<script src="./Chex.js"></script>
```

---

## Quick Start

Import and write components using Chex's tag helpers:

```js
import Chex from '@myxo-victor/chexjs';

const { div, h1, button } = Chex;
const app = document.getElementById('app');
const count = Chex.signal(0);

const Counter = () => div({ class: 'counter' }, [
  h1(`Count: ${count.value}`),
  button({ onClick: () => (count.value += 1) }, 'Increment')
]);

Chex.render(app, Counter);
```

---

## Fast Element API

Chex tag helpers are flexible. You can provide props as the first argument, or omit them entirely to pass children directly:

```js
// With props
div({ class: 'hero' }, [
  h1({}, 'Title'),
  button({ onClick: save }, 'Save')
]);

// No empty props object required
div([
  h1('Title'),
  button('Save')
]);
```

---

## Core Features

- **Reactive State** — Built-in signals and effects (`Chex.signal`, `Chex.effect`)
- **VDOM Patching** — Efficient DOM updates via `Chex.render`
- **Zero-Dependency Routing** — Hash- or history-based routing with `Chex.createRouter`
- **Integrated Backend** — Built-in PHP database client (`Chex.db`) and API helpers
- **Standalone Helpers** — Additional engines for modals, skeleton loaders, sliders (`orbit`), and scroll animations (`rinx`, `scrollEcho`)

---

## Backend Database Engine

The optional `Chex.php` provides a secure PDO bridge for your frontend:

```js
const server = Chex.db.connect({
  endpoint: '/path/to/Chex.php',
  apiKey: 'YOUR_SECURE_API_KEY',
  table: 'users'
});

await server.create({ email: 'demo@example.com' });
const users = await server.read({ select: ['id', 'email'], limit: 10 });
```

---

## Standalone Libraries

Chex.js v6.1.4 ships with a broader utility toolkit in the `libs` folder, giving you modular browser-native building blocks for interface, motion, and data workflows:

| Library | Global | Purpose |
|---|---|---|
| `chex-form.js` | `ChexForm` | Form helpers, validation, and input handling |
| `scrollEcho.js` | `ScrollEcho` | Scroll-triggered reveals and reveal animations |
| `racket.js` | `racket` | Image carousel and gallery motion |
| `orbit.js` | `orbit` | Swipe-friendly slider engine |
| `rinx.js` | `rinx` | Scroll-based card and layout effects |
| `smooth.js` | `smooth` | Smooth motion and tickers |
| `modal.js` | `modal` | Accessible modal engine |
| `skeleton.js` | `skeleton` | Shimmer-loading placeholders |
| `dob.js` | `dob` | Date and UI control helpers |
| `snapdb.js` | `snapDB` | IndexedDB-backed lightweight storage wrapper |
| `triD.js` | `triD` | 3D motion and layered interaction effects |
| `manorbit.js` | `manorbit` | Motion and orbital interaction library |

---

## Philosophy

Chex is designed around three principles:

1. **Zero Build** — Write components in plain JavaScript. No JSX, no TypeScript compiler, no bundler required.
2. **Signal-First** — State is simple: `Chex.signal(value)` gives you a reactive value. Components update automatically when signals change.
3. **Full-Stack Ready** — Unlike most frontend tools, Chex includes a PHP backend bridge so you can build complete apps without reaching for a separate API layer.

The goal is to make building reactive UIs as easy as dropping a single `<script>` tag and writing plain functions.

---

## License

MIT License. Copyright (c) 2026 Aximon. Created by **Myxo Victor**.
