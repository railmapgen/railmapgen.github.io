export interface SafeAreaInsets {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

interface ViewportRect {
    top: number;
    left: number;
    width: number;
    height: number;
}

const edges = ['top', 'right', 'bottom', 'left'] as const;
const nativeClass = 'rmt-native-edge-to-edge';
const sharedViewportClass = 'rmt-shared-viewport';

const intersects = (first: ViewportRect, second: ViewportRect) =>
    first.width > 0 &&
    first.height > 0 &&
    second.width > 0 &&
    second.height > 0 &&
    first.left < second.left + second.width &&
    first.left + first.width > second.left &&
    first.top < second.top + second.height &&
    first.top + first.height > second.top;

/** The floating host menu button can move beyond a child's old 40px menu slot. */
export const getHeaderMenuRight = (menu: ViewportRect | undefined, header: ViewportRect): number =>
    menu && intersects(menu, header) ? menu.left + menu.width : 0;

/** Every Apple page shares one content rectangle, with one physical exclusion. */
export const getSharedViewport = (
    userAgent: string,
    viewport: ViewportRect,
    insets: SafeAreaInsets,
    nativeNotchSide?: string,
    orientationAngle?: number,
    nativeDevice?: string,
    maxTouchPoints = 0
): { enabled: boolean; insets: SafeAreaInsets } => {
    const none = { top: 0, right: 0, bottom: 0, left: 0 };
    const phone = nativeDevice === 'phone' || (!nativeDevice && /iPhone/.test(userAgent));
    const pad =
        nativeDevice === 'pad' ||
        (!nativeDevice && (/iPad/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1)));
    if (!phone && !pad) return { enabled: false, insets: none };
    const nativeLandscape = nativeNotchSide === 'left' || nativeNotchSide === 'right';
    if (pad || nativeNotchSide === 'top' || (!nativeLandscape && viewport.width <= viewport.height)) {
        return { enabled: true, insets: { ...none, top: Math.max(0, Math.min(insets.top, viewport.height)) } };
    }
    let side = nativeLandscape ? nativeNotchSide : undefined;
    if (!side && insets.left !== insets.right) side = insets.left > insets.right ? 'left' : 'right';
    if (!side && orientationAngle !== undefined) {
        const angle = ((orientationAngle % 360) + 360) % 360;
        if (angle === 90) side = 'left';
        else if (angle === 270) side = 'right';
    }
    // Native metadata (or orientation) selects the actual cutout side. Do not
    // turn symmetric corner insets into two independent control boundaries.
    return {
        enabled: true,
        insets: {
            ...none,
            left: side === 'left' ? Math.max(0, Math.min(insets.left, viewport.width)) : 0,
            right: side === 'right' ? Math.max(0, Math.min(insets.right, viewport.width)) : 0,
        },
    };
};

/** Only the part of a frame intersecting a system obstruction needs an inset. */
export const getFrameSafeArea = (
    frame: ViewportRect,
    viewport: ViewportRect,
    insets: SafeAreaInsets
): SafeAreaInsets => {
    const clamp = (value: number, size: number) => Math.min(Math.max(value, 0), Math.max(size, 0));
    return {
        top: clamp(viewport.top + insets.top - frame.top, frame.height),
        right: clamp(frame.left + frame.width - (viewport.left + viewport.width - insets.right), frame.width),
        bottom: clamp(frame.top + frame.height - (viewport.top + viewport.height - insets.bottom), frame.height),
        left: clamp(viewport.left + insets.left - frame.left, frame.width),
    };
};

/** Intersect physical cutouts with the viewport still visible above the keyboard. */
export const getVisibleSafeArea = (
    viewport: ViewportRect,
    visibleViewport: ViewportRect,
    insets: SafeAreaInsets
): SafeAreaInsets => ({
    top: Math.min(viewport.height, Math.max(insets.top, visibleViewport.top - viewport.top, 0)),
    right: Math.min(
        viewport.width,
        Math.max(insets.right, viewport.left + viewport.width - visibleViewport.left - visibleViewport.width, 0)
    ),
    bottom: Math.min(
        viewport.height,
        Math.max(insets.bottom, viewport.top + viewport.height - visibleViewport.top - visibleViewport.height, 0)
    ),
    left: Math.min(viewport.width, Math.max(insets.left, visibleViewport.left - viewport.left, 0)),
});

/**
 * The host owns safe-area propagation. Bundled child pages consume the variables,
 * rather than independently applying the physical screen's insets a second time.
 */
export const installNativeSafeAreaBridge = (rootDocument: Document = document): (() => void) => {
    const rootWindow = rootDocument.defaultView;
    if (!rootWindow || !rootDocument.documentElement.classList.contains(nativeClass)) return () => {};

    const originalRootInsets = [...edges.map(edge => `--rmt-safe-area-${edge}`), '--rmt-host-menu-right'].map(
        property => {
            return {
                property,
                value: rootDocument.documentElement.style.getPropertyValue(property),
                priority: rootDocument.documentElement.style.getPropertyPriority(property),
            };
        }
    );
    const originalViewportInsets = edges.map(edge => {
        const property = `--rmt-host-viewport-${edge}`;
        return {
            property,
            value: rootDocument.documentElement.style.getPropertyValue(property),
            priority: rootDocument.documentElement.style.getPropertyPriority(property),
        };
    });
    const hadSharedViewportClass = rootDocument.documentElement.classList.contains(sharedViewportClass);

    const probe = rootDocument.createElement('span');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText =
        'position:fixed;visibility:hidden;pointer-events:none;width:0;height:0;' +
        edges
            .map(edge => `padding-${edge}:var(--rmt-physical-safe-area-${edge}, env(safe-area-inset-${edge}, 0px))`)
            .join(';');
    rootDocument.body.append(probe);

    let disposed = false;
    let animationFrame: number | undefined;
    const documents = new Map<Document, () => void>();
    const frames = new Map<HTMLIFrameElement, () => void>();
    const resizeObserver = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(() => schedule());

    const writeInsets = (
        element: HTMLElement,
        insets: SafeAreaInsets,
        scale: { x: number; y: number },
        prefix = '--rmt-safe-area-'
    ) => {
        for (const edge of edges) {
            const property = prefix + edge;
            const factor = edge === 'top' || edge === 'bottom' ? scale.y : scale.x;
            const value = `${factor > 0 ? insets[edge] / factor : 0}px`;
            // Avoid creating a MutationObserver loop for unchanged geometry.
            if (element.style.getPropertyValue(property) !== value) element.style.setProperty(property, value);
        }
    };

    const schedule = () => {
        if (disposed || animationFrame !== undefined) return;
        animationFrame = rootWindow.requestAnimationFrame(() => {
            animationFrame = undefined;
            update();
        });
    };

    const observeDocument = (owner: Document) => {
        if (documents.has(owner)) return;
        const observer = new MutationObserver(schedule);
        observer.observe(owner.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style', 'data-rmt-notch-side', 'data-rmt-device'],
        });
        owner.addEventListener('scroll', schedule, true);
        owner.addEventListener('transitionend', schedule, true);
        owner.defaultView?.addEventListener('resize', schedule);
        documents.set(owner, () => {
            observer.disconnect();
            owner.removeEventListener('scroll', schedule, true);
            owner.removeEventListener('transitionend', schedule, true);
            owner.defaultView?.removeEventListener('resize', schedule);
        });
    };

    const update = () => {
        if (disposed) return;
        const styles = rootWindow.getComputedStyle(probe);
        const physicalInsets = Object.fromEntries(
            edges.map(edge => [edge, Number.parseFloat(styles.getPropertyValue(`padding-${edge}`)) || 0])
        ) as unknown as SafeAreaInsets;
        const visualViewport = rootWindow.visualViewport;
        const viewport = {
            top: 0,
            left: 0,
            width: rootWindow.innerWidth,
            height: rootWindow.innerHeight,
        };
        const visibleViewport = visualViewport
            ? {
                  top: visualViewport.offsetTop,
                  left: visualViewport.offsetLeft,
                  width: visualViewport.width,
                  height: visualViewport.height,
              }
            : viewport;
        const sharedViewport = getSharedViewport(
            rootWindow.navigator.userAgent,
            viewport,
            physicalInsets,
            rootDocument.documentElement.dataset.rmtNotchSide,
            rootWindow.orientation ?? rootWindow.screen.orientation?.angle,
            rootDocument.documentElement.dataset.rmtDevice,
            rootWindow.navigator.maxTouchPoints
        );
        // Keyboard/panning exclusions apply to the same viewport as the system
        // edge. The canvas never extends behind a separately inset toolbar.
        const insets = getVisibleSafeArea(viewport, visibleViewport, sharedViewport.insets);
        if (!rootDocument.documentElement.classList.contains(sharedViewportClass)) {
            rootDocument.documentElement.classList.add(sharedViewportClass);
        }
        for (const edge of edges) {
            const property = `--rmt-host-viewport-${edge}`;
            const value = `${insets[edge]}px`;
            if (rootDocument.documentElement.style.getPropertyValue(property) !== value) {
                rootDocument.documentElement.style.setProperty(property, value);
            }
        }
        writeInsets(rootDocument.documentElement, { top: 0, right: 0, bottom: 0, left: 0 }, { x: 1, y: 1 });
        const activeDocuments = new Set<Document>();
        const activeFrames = new Set<HTMLIFrameElement>();
        const menuButton = rootDocument.querySelector<HTMLElement>('[data-rmt-menu-button]');
        const menuBounds = menuButton?.getBoundingClientRect();

        const visit = (owner: Document, origin: { top: number; left: number }, scale = { x: 1, y: 1 }) => {
            activeDocuments.add(owner);
            observeDocument(owner);
            let menuRight = 0;
            for (const header of owner.querySelectorAll<HTMLElement>('.rm-window__header, .rmg-window__header')) {
                const windowRoot = header.closest('.rm-window, .rmg-window');
                const nested = windowRoot?.parentElement?.closest('.rm-window, .rmg-window');
                const clip =
                    header.matches('.rm-window__app-clip-header, .rmg-window__app-clip-header') ||
                    header.closest('.rm-window--is-app-clip, .rmg-window--is-app-clip');
                if (nested || clip) continue;
                const bounds = header.getBoundingClientRect();
                const rect = {
                    top: origin.top + bounds.top * scale.y,
                    left: origin.left + bounds.left * scale.x,
                    width: bounds.width * scale.x,
                    height: bounds.height * scale.y,
                };
                const right = getHeaderMenuRight(menuBounds, rect);
                if (right && scale.x > 0) menuRight = Math.max(menuRight, (right - origin.left) / scale.x);
                if (header.matches('[data-rmt-auxiliary] > .rm-window__header')) {
                    const headerInsets = getFrameSafeArea(rect, viewport, insets);
                    headerInsets.left = Math.max(headerInsets.left, Math.min(rect.width, right - rect.left));
                    writeInsets(header, headerInsets, scale, '--rmt-header-safe-');
                }
            }
            const menuValue = `${menuRight}px`;
            if (owner.documentElement.style.getPropertyValue('--rmt-host-menu-right') !== menuValue) {
                owner.documentElement.style.setProperty('--rmt-host-menu-right', menuValue);
            }
            for (const frame of owner.querySelectorAll('iframe')) {
                activeFrames.add(frame);
                if (!frames.has(frame)) {
                    frame.addEventListener('load', schedule);
                    resizeObserver?.observe(frame);
                    frames.set(frame, () => {
                        frame.removeEventListener('load', schedule);
                        resizeObserver?.unobserve(frame);
                    });
                }
                try {
                    const child = frame.contentDocument;
                    if (!child?.documentElement.classList.contains(nativeClass)) continue;
                    const bounds = frame.getBoundingClientRect();
                    const frameScale = {
                        x: scale.x * (frame.offsetWidth ? bounds.width / frame.offsetWidth : 1),
                        y: scale.y * (frame.offsetHeight ? bounds.height / frame.offsetHeight : 1),
                    };
                    const rect = {
                        top: origin.top + bounds.top * scale.y + frame.clientTop * frameScale.y,
                        left: origin.left + bounds.left * scale.x + frame.clientLeft * frameScale.x,
                        width: frame.clientWidth * frameScale.x,
                        height: frame.clientHeight * frameScale.y,
                    };
                    const childInsets = getFrameSafeArea(rect, viewport, insets);
                    writeInsets(child.documentElement, childInsets, frameScale);
                    visit(child, rect, frameScale);
                } catch {
                    // Cross-origin frames retain their own layout and are never modified.
                }
            }
        };

        visit(rootDocument, { top: 0, left: 0 });
        for (const [frame, release] of frames) {
            if (!activeFrames.has(frame)) {
                release();
                frames.delete(frame);
            }
        }
        for (const [owner, release] of documents) {
            if (!activeDocuments.has(owner)) {
                release();
                documents.delete(owner);
            }
        }
    };

    rootWindow.addEventListener('orientationchange', schedule);
    rootWindow.visualViewport?.addEventListener('resize', schedule);
    rootWindow.visualViewport?.addEventListener('scroll', schedule);
    update();

    return () => {
        disposed = true;
        if (animationFrame !== undefined) rootWindow.cancelAnimationFrame(animationFrame);
        for (const release of frames.values()) release();
        for (const release of documents.values()) release();
        resizeObserver?.disconnect();
        rootWindow.removeEventListener('orientationchange', schedule);
        rootWindow.visualViewport?.removeEventListener('resize', schedule);
        rootWindow.visualViewport?.removeEventListener('scroll', schedule);
        for (const { property, value, priority } of [...originalRootInsets, ...originalViewportInsets]) {
            if (value) rootDocument.documentElement.style.setProperty(property, value, priority);
            else rootDocument.documentElement.style.removeProperty(property);
        }
        rootDocument.documentElement.classList.toggle(sharedViewportClass, hadSharedViewportClass);
        probe.remove();
    };
};
