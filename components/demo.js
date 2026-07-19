/* VenJS 5.0 — Demo showcase components.
 * Loaded before components/main.js. Exposes a global DemoPage()
 * that the router can render at the "/demo" route. */

const demoCount = venjs.signal(0);
const demoName = venjs.signal("Ada");

const DemoCounter = () => venjs.div({ class: "page" }, [
  venjs.h2({ class: "page-title" }, "Signals in action"),
  venjs.p({ class: "page-copy" }, "Count: " + demoCount.value),
  venjs.div({ class: "nav" }, [
    venjs.button({ class: "nav-btn", onclick: () => (demoCount.value += 1) }, "+1"),
    venjs.button({ class: "nav-btn", onclick: () => (demoCount.value -= 1) }, "-1")
  ])
]);

const DemoBinding = () => venjs.div({ class: "page" }, [
  venjs.h2({ class: "page-title" }, "Two-way input"),
  venjs.input({
    label: "Your name",
    value: demoName.value,
    oninput: (e) => (demoName.value = e.target.value)
  }),
  venjs.p({ class: "page-copy" }, "Hello, " + demoName.value + "!")
]);

const DemoCards = () => venjs.div({ class: "page" }, [
  venjs.h2({ class: "page-title" }, "Component kit"),
  venjs.card({}, [
    venjs.h3({ style: { marginTop: "0" } }, "Built with VenJS"),
    venjs.p({ class: "page-copy" }, "Button, Input and Card components composed together."),
    venjs.div({ class: "nav" }, [
      venjs.button({ class: "nav-btn active", onclick: () => {} }, "Primary"),
      venjs.button({ variant: "outline", class: "nav-btn", onclick: () => {} }, "Outline")
    ])
  ])
]);

window.DemoPage = () => venjs.div({ class: "app" }, [
  venjs.h1({ class: "hero-title" }, "VenJS Live Demo"),
  venjs.p({ class: "hero-copy" }, "A few examples built with signals and components."),
  DemoCounter(),
  DemoBinding(),
  DemoCards()
]);
