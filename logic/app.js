const app = document.getElementById("app");

const routeLink = (label, route) => Chex.button({
  class: window.router.path.value === route ? "nav-btn active" : "nav-btn",
  onclick: () => window.router.navigate(route)
}, label);

const App = () => Chex.div({ class: "app" }, [
  Chex.h1({ class: "hero-title" }, "Chex Multi-Page Demo"),
  Chex.p({ class: "hero-copy" }, "Each page lives in its own file under components/."),
  Chex.div({ class: "nav" }, [
    routeLink("Home", "/home"),
    routeLink("About", "/about"),
    routeLink("Contact", "/contact"),
    routeLink("Demo", "/demo")
  ]),
  window.router.view()
]);

Chex.render(app, App);

if (window.router.path.value === "/") {
  window.router.navigate("/home");
}

Chex.animate('.hero-title', {
  slideFrom: "top",
  duration: 700,
  opacity: [0, 1]
});

Chex.animate('.page', {
  slideFrom: "bottom",
  duration: 500,
  opacity: [0, 1]
});
