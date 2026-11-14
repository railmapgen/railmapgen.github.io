/* The host crops every child viewport once. This adapter only reconciles the
   shell menu button with old component header slots; app padding stays local. */
(() => {
    const root = document.documentElement;
    if (!root.classList.contains('rmt-native-edge-to-edge') || root.dataset.rmtComponent === 'host') return;
    const headers = '.rm-window__header, .rmg-window__header';
    let scheduled = false;
    const observed = new Set();
    const resizeObserver = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(() => schedule());
    const setProperty = (element, property, value) => {
        if (element.style.getPropertyValue(property) !== value) element.style.setProperty(property, value);
    };
    const mark = (element, name, enabled) => {
        if (enabled && !element.hasAttribute(name)) element.setAttribute(name, '');
        else if (!enabled && element.hasAttribute(name)) element.removeAttribute(name);
    };
    const update = () => {
        scheduled = false;
        const menuRight = parseFloat(getComputedStyle(root).getPropertyValue('--rmt-host-menu-right')) || 0;
        const active = new Set();
        for (const element of document.querySelectorAll(headers)) {
            active.add(element);
            if (!observed.has(element)) {
                resizeObserver?.observe(element);
                observed.add(element);
            }
            const rect = element.getBoundingClientRect();
            const windowRoot = element.closest('.rm-window, .rmg-window');
            const nested = windowRoot?.parentElement?.closest('.rm-window, .rmg-window');
            const clip =
                element.matches('.rm-window__app-clip-header, .rmg-window__app-clip-header') ||
                element.closest('.rm-window--is-app-clip, .rmg-window--is-app-clip');
            const screenHeader = !nested && !clip;
            const scale = element.offsetWidth ? rect.width / element.offsetWidth : 1;
            const localLeft = screenHeader ? Math.max(0, Math.min(rect.width, menuRight - rect.left)) : 0;
            setProperty(element, '--rmt-control-safe-left', `${scale > 0 ? localLeft / scale : 0}px`);
            mark(element, 'data-rmt-screen-header', screenHeader);
        }
        for (const element of observed) {
            if (!active.has(element)) {
                resizeObserver?.unobserve(element);
                observed.delete(element);
            }
        }
    };
    const schedule = () => {
        if (!scheduled) {
            scheduled = true;
            requestAnimationFrame(update);
        }
    };
    new MutationObserver(schedule).observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style'],
    });
    window.addEventListener('resize', schedule);
    document.addEventListener('scroll', schedule, true);
    document.addEventListener('transitionend', schedule, true);
    document.addEventListener('visibilitychange', schedule);
    schedule();
})();
