import {
    getFrameSafeArea,
    getSharedViewport,
    getVisibleSafeArea,
    installNativeSafeAreaBridge,
} from './native-safe-area';

describe('shared Apple viewport', () => {
    const viewport = { top: 0, left: 0, width: 874, height: 402 };
    const physical = { top: 32, right: 62, bottom: 21, left: 62 };

    it('uses one shared notch boundary in both iPhone landscape directions', () => {
        expect(getSharedViewport('iPhone', viewport, physical, 'left').insets).toEqual({
            top: 0,
            right: 0,
            bottom: 0,
            left: 62,
        });
        expect(getSharedViewport('iPhone', viewport, physical, 'right').insets).toEqual({
            top: 0,
            right: 62,
            bottom: 0,
            left: 0,
        });
    });

    it('uses only the top notch edge in iPhone portrait', () => {
        expect(getSharedViewport('iPhone', { ...viewport, width: 402, height: 874 }, physical, 'top')).toEqual({
            enabled: true,
            insets: { top: 32, right: 0, bottom: 0, left: 0 },
        });
    });

    it('keeps the native notch edge when a keyboard or window size changes the aspect ratio', () => {
        expect(getSharedViewport('iPhone', viewport, physical, 'top').insets).toEqual({
            top: 32,
            right: 0,
            bottom: 0,
            left: 0,
        });
        expect(getSharedViewport('iPhone', { ...viewport, width: 402, height: 874 }, physical, 'left').insets).toEqual({
            top: 0,
            right: 0,
            bottom: 0,
            left: 62,
        });
    });

    it('uses the iPad status edge in full screen and narrow windows, including desktop user agents', () => {
        for (const width of [390, 874]) {
            const bounds = { ...viewport, width };
            const expected = { enabled: true, insets: { top: 32, right: 0, bottom: 0, left: 0 } };
            expect(getSharedViewport('iPad', bounds, physical)).toEqual(expected);
            expect(getSharedViewport('Macintosh', bounds, physical, '', 0, 'pad')).toEqual(expected);
            expect(getSharedViewport('Macintosh', bounds, physical, '', 0, undefined, 5)).toEqual(expected);
        }
        expect(getSharedViewport('Macintosh', viewport, physical).insets).toEqual({
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
        });
    });

    it('uses measured metadata, clamps exclusions, and never guesses symmetric corner margins', () => {
        expect(getSharedViewport('iPhone', viewport, { ...physical, left: 53, right: 0 }).insets.left).toBe(53);
        expect(getSharedViewport('iPhone', viewport, physical, undefined, -90).insets.right).toBe(62);
        expect(getSharedViewport('iPhone', viewport, physical).insets).toEqual({
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
        });
        expect(getSharedViewport('iPad', viewport, { ...physical, top: 1000 }).insets.top).toBe(402);
    });
});

describe('getFrameSafeArea', () => {
    const viewport = { top: 0, left: 0, width: 844, height: 390 };
    const insets = { top: 0, right: 47, bottom: 21, left: 47 };

    it('keeps the full viewport available and reports only the obstructed frame edges', () => {
        expect(getFrameSafeArea(viewport, viewport, insets)).toEqual(insets);
        expect(getFrameSafeArea({ top: 40, left: 420, width: 424, height: 350 }, viewport, insets)).toEqual({
            top: 0,
            right: 47,
            bottom: 21,
            left: 0,
        });
    });

    it('does not reapply screen insets to a nested frame already inside the safe area', () => {
        expect(getFrameSafeArea({ top: 40, left: 60, width: 720, height: 300 }, viewport, insets)).toEqual({
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
        });
    });

    it('limits insets for collapsed or fully obscured frames', () => {
        expect(getFrameSafeArea({ top: 0, left: 0, width: 20, height: 0 }, viewport, insets)).toEqual({
            top: 0,
            right: 0,
            bottom: 0,
            left: 20,
        });
    });

    it('supports a viewport with a nonzero origin', () => {
        expect(
            getFrameSafeArea(
                { top: 0, left: 0, width: 390, height: 844 },
                { top: 20, left: 0, width: 390, height: 480 },
                { top: 47, right: 0, bottom: 0, left: 0 }
            )
        ).toEqual({ top: 67, right: 0, bottom: 344, left: 0 });
    });
});

describe('visible safe area', () => {
    const viewport = { top: 0, left: 0, width: 390, height: 844 };
    const physical = { top: 47, right: 0, bottom: 34, left: 0 };

    it('uses the keyboard edge without adding the home indicator inset twice', () => {
        expect(getVisibleSafeArea(viewport, { top: 20, left: 0, width: 390, height: 480 }, physical)).toEqual({
            top: 47,
            right: 0,
            bottom: 344,
            left: 0,
        });
        expect(getVisibleSafeArea(viewport, viewport, physical)).toEqual(physical);
    });
});

describe('shared native viewport bridge', () => {
    let release: (() => void) | undefined;
    let pendingFrames: FrameRequestCallback[];
    let physical: { top: number; right: number; bottom: number; left: number };

    const addFrame = (owner: Document, left: number, top: number, width: number, height: number) => {
        const frame = owner.createElement('iframe');
        owner.body.append(frame);
        frame.contentDocument!.documentElement.classList.add('rmt-native-edge-to-edge');
        for (const [property, value] of Object.entries({
            clientWidth: width,
            clientHeight: height,
            clientLeft: 0,
            clientTop: 0,
            offsetWidth: width,
            offsetHeight: height,
        }))
            Object.defineProperty(frame, property, { value, configurable: true });
        vi.spyOn(frame, 'getBoundingClientRect').mockReturnValue({ left, top, width, height } as DOMRect);
        return frame;
    };
    const resizeFrame = (frame: HTMLIFrameElement, left: number, top: number, width: number, height: number) => {
        for (const [property, value] of Object.entries({
            clientWidth: width,
            clientHeight: height,
            offsetWidth: width,
            offsetHeight: height,
        }))
            Object.defineProperty(frame, property, { value, configurable: true });
        vi.mocked(frame.getBoundingClientRect).mockReturnValue({ left, top, width, height } as DOMRect);
    };
    const flushFrame = () => {
        const callbacks = pendingFrames;
        pendingFrames = [];
        callbacks.forEach(callback => callback(0));
    };
    const expectNoExtraInsets = (owner: Document) => {
        for (const edge of ['top', 'right', 'bottom', 'left'])
            expect(owner.documentElement.style.getPropertyValue(`--rmt-safe-area-${edge}`)).toBe('0px');
    };
    beforeEach(() => {
        pendingFrames = [];
        physical = { top: 24, right: 47, bottom: 21, left: 47 };
        document.documentElement.classList.add('rmt-native-edge-to-edge');
        document.documentElement.dataset.rmtDevice = 'pad';
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
            pendingFrames.push(callback);
            return pendingFrames.length;
        });
        vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
        vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(844);
        vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(390);
        const original = window.getComputedStyle.bind(window);
        vi.spyOn(window, 'getComputedStyle').mockImplementation(element => {
            if (element.matches('span[aria-hidden="true"]'))
                return {
                    getPropertyValue: (property: string) =>
                        `${physical[property.replace('padding-', '') as keyof typeof physical]}px`,
                } as CSSStyleDeclaration;
            return original(element);
        });
    });
    afterEach(() => {
        release?.();
        release = undefined;
        document.body.replaceChildren();
        document.documentElement.classList.remove('rmt-native-edge-to-edge', 'rmt-shared-viewport');
        delete document.documentElement.dataset.rmtNotchSide;
        delete document.documentElement.dataset.rmtDevice;
        vi.restoreAllMocks();
    });

    it('gives iPad canvas, host controls, and nested pages exactly one shared top boundary', () => {
        const frame = addFrame(document, 0, 24, 844, 366);
        const nested = addFrame(frame.contentDocument!, 0, 40, 844, 326);
        release = installNativeSafeAreaBridge();
        expect(document.documentElement.classList.contains('rmt-shared-viewport')).toBe(true);
        expect(document.documentElement.style.getPropertyValue('--rmt-host-viewport-top')).toBe('24px');
        for (const edge of ['left', 'right', 'bottom'])
            expect(document.documentElement.style.getPropertyValue(`--rmt-host-viewport-${edge}`)).toBe('0px');
        expectNoExtraInsets(document);
        expectNoExtraInsets(frame.contentDocument!);
        expectNoExtraInsets(nested.contentDocument!);
        expect(frame.style.padding).toBe('');
    });

    it('moves the common iPhone boundary across landscape sides and to the portrait notch edge', async () => {
        document.documentElement.dataset.rmtDevice = 'phone';
        document.documentElement.dataset.rmtNotchSide = 'left';
        const frame = addFrame(document, 47, 0, 797, 390);
        release = installNativeSafeAreaBridge();
        expect(document.documentElement.style.getPropertyValue('--rmt-host-viewport-left')).toBe('47px');
        expectNoExtraInsets(frame.contentDocument!);

        document.documentElement.dataset.rmtNotchSide = 'right';
        resizeFrame(frame, 0, 0, 797, 390);
        await Promise.resolve();
        flushFrame();
        expect(document.documentElement.style.getPropertyValue('--rmt-host-viewport-left')).toBe('0px');
        expect(document.documentElement.style.getPropertyValue('--rmt-host-viewport-right')).toBe('47px');
        expectNoExtraInsets(frame.contentDocument!);

        vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(390);
        vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(844);
        physical.top = 62;
        document.documentElement.dataset.rmtNotchSide = 'top';
        resizeFrame(frame, 0, 62, 390, 782);
        window.dispatchEvent(new Event('resize'));
        flushFrame();
        expect(document.documentElement.style.getPropertyValue('--rmt-host-viewport-top')).toBe('62px');
        expect(document.documentElement.style.getPropertyValue('--rmt-host-viewport-right')).toBe('0px');
        expect(document.documentElement.style.getPropertyValue('--rmt-host-viewport-bottom')).toBe('0px');
        expectNoExtraInsets(document);
        expectNoExtraInsets(frame.contentDocument!);
    });

    it('recognizes an asynchronously published native iPad marker in desktop mode', async () => {
        delete document.documentElement.dataset.rmtDevice;
        vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Macintosh');
        release = installNativeSafeAreaBridge();
        expect(document.documentElement.style.getPropertyValue('--rmt-host-viewport-top')).toBe('0px');
        document.documentElement.dataset.rmtDevice = 'pad';
        await Promise.resolve();
        flushFrame();
        expect(document.documentElement.style.getPropertyValue('--rmt-host-viewport-top')).toBe('24px');
    });

    it('keeps all three remaining iPad edges open after window resizing and native chrome changes', () => {
        const frame = addFrame(document, 0, 24, 844, 366);
        release = installNativeSafeAreaBridge();
        vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(600);
        vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(711);
        physical = { top: 65, right: 10, bottom: 10, left: 32 };
        resizeFrame(frame, 0, 65, 600, 646);
        window.dispatchEvent(new Event('resize'));
        flushFrame();
        expect(document.documentElement.style.getPropertyValue('--rmt-host-viewport-top')).toBe('65px');
        for (const edge of ['left', 'right', 'bottom'])
            expect(document.documentElement.style.getPropertyValue(`--rmt-host-viewport-${edge}`)).toBe('0px');
        expectNoExtraInsets(frame.contentDocument!);
    });

    it('shrinks the same canvas and controls rectangle above the keyboard, then restores the full bottom edge', () => {
        const previous = Object.getOwnPropertyDescriptor(window, 'visualViewport');
        const visible = Object.assign(new EventTarget(), { offsetTop: 0, offsetLeft: 0, width: 844, height: 390 });
        Object.defineProperty(window, 'visualViewport', { value: visible, configurable: true });
        try {
            const frame = addFrame(document, 0, 24, 844, 366);
            release = installNativeSafeAreaBridge();
            expect(document.documentElement.style.getPropertyValue('--rmt-host-viewport-bottom')).toBe('0px');
            visible.height = 200;
            resizeFrame(frame, 0, 24, 844, 176);
            visible.dispatchEvent(new Event('resize'));
            flushFrame();
            expect(document.documentElement.style.getPropertyValue('--rmt-host-viewport-bottom')).toBe('190px');
            expectNoExtraInsets(document);
            expectNoExtraInsets(frame.contentDocument!);
            visible.height = 390;
            resizeFrame(frame, 0, 24, 844, 366);
            visible.dispatchEvent(new Event('resize'));
            flushFrame();
            expect(document.documentElement.style.getPropertyValue('--rmt-host-viewport-bottom')).toBe('0px');
        } finally {
            if (previous) Object.defineProperty(window, 'visualViewport', previous);
            else Reflect.deleteProperty(window, 'visualViewport');
        }
    });

    it('observes new nested pages while leaving unmarked pages untouched', () => {
        release = installNativeSafeAreaBridge();
        const frame = addFrame(document, 0, 24, 844, 366);
        const external = addFrame(document, 0, 24, 844, 366);
        external.contentDocument!.documentElement.classList.remove('rmt-native-edge-to-edge');
        document.dispatchEvent(new Event('scroll'));
        flushFrame();
        expectNoExtraInsets(frame.contentDocument!);
        expect(external.contentDocument!.documentElement.style.getPropertyValue('--rmt-safe-area-top')).toBe('');
    });

    it('stops scheduling layout frames once the shared boundary is unchanged', async () => {
        addFrame(document, 0, 24, 844, 366);
        release = installNativeSafeAreaBridge();
        await Promise.resolve();
        flushFrame();
        await Promise.resolve();
        expect(pendingFrames).toHaveLength(0);
    });

    it('preserves the host menu slot within the shared rectangle, without an extra hardware gutter', () => {
        const menu = document.createElement('button');
        menu.dataset.rmtMenuButton = '';
        document.body.append(menu);
        vi.spyOn(menu, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 24, width: 40, height: 40 } as DOMRect);
        const frame = addFrame(document, 0, 24, 844, 366);
        const child = frame.contentDocument!;
        child.body.innerHTML =
            '<div class="rm-window" data-rmt-auxiliary><header class="rm-window__header"></header></div>';
        const header = child.querySelector('header')!;
        vi.spyOn(header, 'getBoundingClientRect').mockReturnValue({
            left: 0,
            top: 0,
            width: 844,
            height: 40,
        } as DOMRect);
        release = installNativeSafeAreaBridge();
        expect(child.documentElement.style.getPropertyValue('--rmt-host-menu-right')).toBe('40px');
        expect(header.style.getPropertyValue('--rmt-header-safe-left')).toBe('40px');
        expect(header.style.getPropertyValue('--rmt-header-safe-top')).toBe('0px');
        expectNoExtraInsets(child);
    });

    it('recovers a hidden frame and restores prior host properties on cleanup', () => {
        document.documentElement.style.setProperty('--rmt-host-viewport-top', '3px');
        const frame = addFrame(document, 0, 24, 844, 366);
        vi.mocked(frame.getBoundingClientRect).mockReturnValue({ left: 0, top: 0, width: 0, height: 0 } as DOMRect);
        release = installNativeSafeAreaBridge();
        expectNoExtraInsets(frame.contentDocument!);
        resizeFrame(frame, 0, 24, 844, 366);
        window.dispatchEvent(new Event('resize'));
        flushFrame();
        expectNoExtraInsets(frame.contentDocument!);
        release();
        release = undefined;
        expect(document.documentElement.style.getPropertyValue('--rmt-host-viewport-top')).toBe('3px');
        document.documentElement.style.removeProperty('--rmt-host-viewport-top');
        expect(document.documentElement.classList.contains('rmt-shared-viewport')).toBe(false);
        window.dispatchEvent(new Event('resize'));
        expect(pendingFrames).toHaveLength(0);
    });

    it('does not change ordinary website pages', () => {
        document.documentElement.classList.remove('rmt-native-edge-to-edge');
        installNativeSafeAreaBridge()();
        expect(document.querySelector('span[aria-hidden="true"]')).toBeNull();
    });
});
