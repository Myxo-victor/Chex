# VenJS 5.10.0

VenJS 5.10.0 is a high-performance, lightweight JavaScript framework designed for building reactive, fast, and secure web interfaces with a clean component API, signals, effects, animation helpers, native backend integration, and an extensible ecosystem.

## Quick Start

1. Clone or download this project.
2. Serve the directory with a local web server (e.g., PHP built-in server, Apache, Nginx, or Live Server).
3. Open `index.html` and start editing:
- UI Layers: `components/main.js` (or page specific views like `courses.js`, `mentors.js`)
- Business Logic: `logic/app.js`
- Global Styles: `index.css`

## What's New in VenJS 5.9.0

The 5.9.0 release expands VenJS into an immersive, rich UI platform. It introduces VenJS Libs—a dedicated bundle of high-performance custom graphic, scrolling, and structural helpers optimized specifically to work alongside the core reconciliation engine without external dependencies.

### 📦 Extended Libraries (`libs/` Folder)

VenJS 5.10.0 introduces five robust standalone utilities located in your `libs/` directory. These libraries provide interactive, performant visuals out of the box:

1. `ScrollEcho.js`

   An intersection-observer-driven scrolling engine that automatically triggers beautiful staggered text reveals when elements enter the viewport.

   Features: Staggered character-by-character reveals, word-by-word fade-ups, customizable duration, easing, and thresholds.

   Example Usage:
   ```js
   ScrollEcho.auto('#target', {
     type: 'char',       // 'char' or 'word'
     delay: 20,          // stagger delay in ms
     duration: 500,      // animation duration in ms
     threshold: 0.15,    // viewport intersection threshold
     transformY: '12px'  // vertical displacement rise
   });
   ```

2. `racket.js`

   A dynamic 3-displayer image scroller/carousel optimized for showcases.

   Features: Displays a grid of three columns on large viewports, with automatic mobile detection that dynamically collapses the layout into a single-image slider for touch targets.

   Example Usage:
   ```js
racket.images(['img1', 'img2', 'img3'])//list of image IDs
racket.duration([2000])//Duration
racket.play()//Start carousel
   ``

3. `orbit.js`

   A sleek, focused single-image layout scroller and banner carousel.

   Features: Lightweight, swipe-friendly navigation, fade transitions, and performance-optimized canvas layers for high-resolution graphics.

   Example Usage:
   ```js
    orbit.slides({
        IDs: ['ic','ic','ic'],
        interval: 5000,
        dots: true
    })
   ```

4. `rinx.js`

   A container-scroller layout utility designed specifically for vertical or horizontal textual cards and scrolls.

   Features: Highly fluid native scroll grabbing, customizable inertia, snap-to-edge locks, and horizontal wheel-to-scroll translation. Great for testimonial sections or marquee lists.

   Example Usage:
   ```js
   rinx.slides({
            IDs: ['scroll1', 'scroll2', 'scroll3'],
            interval: 5000,
            effect:'slide'
        });
   ```

## What's New in VenJS 5.10.0

The 5.10.0 release extends the `libs/` bundle with **Smooth.js** — a seamless, fluid, continuous infinite ticker slider.

### 🎞️ Smooth.js (NEW)

A high-performance continuous ticker carousel powered by `requestAnimationFrame` delta-time rendering. Unlike step-based carousels, it scrolls endlessly without pausing, supports cloning rich DOM nodes or fallback image URLs, responsive column counts (3 on desktop, 2 on mobile), customizable speed, and on-the-fly direction switching.

Declarative usage:

```js
smooth.start([
  { selector: '#carousel', itemSelector: '.carousol-image', speed: 80, direction: 'left' }
]);
```

Chainable usage:

```js
smooth
  .mount('#carousel')
  .items(['img1', 'img2', 'img3', 'img4'])
  .speed(100)
  .direction('left')
  .play();
```

## Core Features

- Component Rendering: Native mounts and DOM updates with `venjs.render(...)`
- Declarative Markup: Build semantic DOM trees with `venjs.div(...)`, `venjs.h1(...)`, `venjs.button(...)`, and custom tags
- Reactive State Management: Simple, robust state bindings with `venjs.signal(...)` and automated dependency tracking using `venjs.effect(...)`
- Improved Reconciliation Engine: Stable recursive DOM patch system featuring backwards-iteration element cleanup
- Asynchronous Utilities: Built-in API hooks utilizing `venjs.api.connect(...)` and `venjs.api.query(...)`
- Animate Helpers: On-scroll layout triggers and frame manipulations with `venjs.animate(...)`
- Native Notifications: Service Worker routing integration and PHP subscription payloads

## Example Component Implementation

```js
const app = document.getElementById("app");
const count = venjs.signal(0);

const Counter = () => venjs.div({ class: "counter" }, [
  venjs.h1({}, `Count: ${count.value}`),
  venjs.button({ onclick: () => count.value++ }, "Increment")
]);

// Automatically patches the DOM on state updates
venjs.effect(() => venjs.render(app, Counter));
```

## Backend Database Engine (`ven.php`)

VenJS features secure client-to-database communication out of the box using SQL parameterization patterns.

Client API: `venjs.db.connect(...)`

Server Endpoint: `ven.php` (PHP + PDO + Prepared Statements)

### Configuration

Open `ven.php` and update the database configuration block:

```php
define('CONFIG', [
    'db_host' => 'localhost',
    'db_port' => '3306',
    'db_name' => 'mva_academy',
    'db_user' => 'your_db_user',
    'db_pass' => 'your_db_password',
    'api_key' => 'SECURE_GENERATED_API_KEY_HERE',
    'allowed_origins' => ['https://mva.com', 'https://yourdevdomain.local'],
    'allowed_tables' => ['users', 'courses', 'enrollments', 'messages']
]);
```

### Database CRUD Example

```js
const server = venjs.db.connect({
  endpoint: '/ven.php',
  apiKey: 'YOUR_SECURE_API_KEY',
  table: 'users'
});

// CREATE
await server.create({
  email: 'demo@site.com',
  password_hash: '$2y$10$...' // Make sure to hash passwords
});

// READ (Query filtering performed securely in PHP)
const users = await server.read({
  select: ['id', 'email'],
  where: { email: 'demo@site.com' },
  limit: 1
});

// UPDATE
await server.update(
  { email: 'demo@site.com' },
  { email: 'new@site.com' }
);

// DELETE
await server.delete({ email: 'new@site.com' });

// AUTHENTICATION LOGIN (Utilizes password_verify on backend server)
const auth = await server.login(
  { email: 'demo@site.com', password: 'plainTextInputPassword' },
  { userField: 'email', passField: 'password_hash', select: ['id', 'email'] }
);
```

## Security Guardrails

- Prepared SQL Statements Only: No raw SQL strings are accepted from the client. Parameter bindings prevent SQL Injection (SQLi).
- Access Table Restrictions: Only tables declared inside `allowed_tables` in the PHP config can be queried.
- Identifier Sanitization: Column names and table names are checked against allowlists to prevent query tampering.
- CORS Headers Enforcement: Only requests from designated origin sites are processed.
- Secure Verification: Handshakes utilize `hash_equals` to protect API keys from timing attacks.

## Directory Architecture

- `ven.js` — Core VenJS engine code
- `ven.php` — Backend PHP PDO prepared statement endpoint
- `libs/` — Custom visual extension utilities
- `ScrollEcho.js` — Text scroll reveal library
- `racket.js` — 3-displayer image/card responsive slider
- `orbit.js` — Banner visual image scroller
- `rinx.js` — Text/card container slider
- `smooth.js` — Continuous infinite ticker slider
- `index.html` — App launcher root file
- `components/` — Modular components and views folder (e.g., `main.js`, `courses.js`, `mentors.js`)
- `logic/app.js` — Base global application state router
- `sw.js` — Service worker notifications file

## Documentation

A complete, multi-page documentation website lives in the `docs/` folder (sibling of this `venjs/` folder). Open `docs/index.html` via a local server to browse:

- **Overview & Getting Started** — `docs/index.html`, `docs/getting-started.html`
- **Core Engine** — signals, rendering, router, store, API client, animate, notifications (`docs/core/`)
- **Components** — Button, Input, AppBar, SideBar, BottomNav, Card (`docs/components/`)
- **Backend** — database engine (`ven.php`), notification server, security (`docs/backend/`)
- **Libraries** — ScrollEcho, Racket, Orbit, Rinx, Smooth (`docs/libs/`)
- **Live Examples** — `docs/examples.html` (built with the real `ven.js` engine)

## License

MIT License
Copyright (c) 2026 Aximon
Created by Myxo Victor

