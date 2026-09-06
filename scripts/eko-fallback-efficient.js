(() => {
    if (window.__GORIVA_EKO_FALLBACK__) return;

    // Important performance guard:
    // The homepage already requests today's fuel_prices data directly. The old
    // fallback wrapped every matching fetch and synchronously waited for up to
    // 1,200 historical EKO rows before returning the original response. That
    // delayed first render and made normal price pagination dependent on an
    // unrelated historical query.
    //
    // Keep the guard enabled so the legacy fallback inside script.js cannot
    // install its own, even heavier, historical fetch wrapper. Current EKO rows
    // continue to come from the normal today's-data request without any extra
    // blocking network call.
    window.__GORIVA_EKO_FALLBACK__ = true;
})();
