// The shared global navigation is the authoritative header/navigation renderer.
// This legacy homepage module previously rebuilt the same header first, injected
// a large duplicate style block and then got replaced again by global-nav.js.
// Keep only the unique homepage poll bootstrap so the visible functionality is
// unchanged without doing duplicate DOM/layout work on the critical path.
(() => {
    if (document.querySelector('script[data-home-fuel-poll]')) return;

    const pollScript = document.createElement("script");
    pollScript.src = "scripts/home-fuel-poll.js?v=20260831-perf2";
    pollScript.defer = true;
    pollScript.dataset.homeFuelPoll = "true";
    document.body.appendChild(pollScript);
})();
