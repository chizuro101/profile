console.clear();

// -------------------------------------------------
// ------------------ Utilities --------------------
// -------------------------------------------------

// Math utilities
const wrap = (n, max) => (n + max) % max;
const lerp = (a, b, t) => a + (b - a) * t;

// DOM utilities
const isHTMLElement = (el) => el instanceof HTMLElement;

const genId = (() => {
    let count = 0;
    return () => {
        return (count++).toString();
    };
})();

class Raf {
    constructor() {
        this.rafId = 0;
        this.raf = this.raf.bind(this);
        this.callbacks = [];

        this.start();
    }

    start() {
        this.raf();
    }

    stop() {
        cancelAnimationFrame(this.rafId);
    }

    raf() {
        this.callbacks.forEach(({ callback, id }) => callback({ id }));
        this.rafId = requestAnimationFrame(this.raf);
    }

    add(callback, id) {
        this.callbacks.push({ callback, id: id || genId() });
    }

    remove(id) {
        this.callbacks = this.callbacks.filter((callback) => callback.id !== id);
    }
}

class Vec2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    set(x, y) {
        this.x = x;
        this.y = y;
    }

    lerp(v, t) {
        this.x = lerp(this.x, v.x, t);
        this.y = lerp(this.y, v.y, t);
    }
}

const vec2 = (x = 0, y = 0) => new Vec2(x, y);

export function tilt(node, options) {
    let { trigger, target } = resolveOptions(node, options);

    let lerpAmount = 0.06;

    const rotDeg = { current: vec2(), target: vec2() };
    const bgPos = { current: vec2(), target: vec2() };

    const update = (newOptions) => {
        destroy();
        ({ trigger, target } = resolveOptions(node, newOptions));
        init();
    };

    let rafId;

    function ticker({ id }) {
        rafId = id;

        rotDeg.current.lerp(rotDeg.target, lerpAmount);
        bgPos.current.lerp(bgPos.target, lerpAmount);

        for (const el of target) {
            el.style.setProperty("--rotX", rotDeg.current.y.toFixed(2) + "deg");
            el.style.setProperty("--rotY", rotDeg.current.x.toFixed(2) + "deg");

            el.style.setProperty("--bgPosX", bgPos.current.x.toFixed(2) + "%");
            el.style.setProperty("--bgPosY", bgPos.current.y.toFixed(2) + "%");
        }
    }

    const onMouseMove = ({ offsetX, offsetY }) => {
        lerpAmount = 0.1;

        for (const el of target) {
            const ox = (offsetX - el.clientWidth * 0.5) / (Math.PI * 3);
            const oy = -(offsetY - el.clientHeight * 0.5) / (Math.PI * 4);

            rotDeg.target.set(ox, oy);
            bgPos.target.set(-ox * 0.3, oy * 0.3);
        }
    };

    const onMouseLeave = () => {
        lerpAmount = 0.06;

        rotDeg.target.set(0, 0);
        bgPos.target.set(0, 0);
    };

    const addListeners = () => {
        trigger.addEventListener("mousemove", onMouseMove);
        trigger.addEventListener("mouseleave", onMouseLeave);
    };

    const removeListeners = () => {
        trigger.removeEventListener("mousemove", onMouseMove);
        trigger.removeEventListener("mouseleave", onMouseLeave);
    };

    const init = () => {
        addListeners();
        raf.add(ticker);
    };

    const destroy = () => {
        removeListeners();
        raf.remove(rafId);
    };

    init();

    return { destroy, update };
}

function resolveOptions(node, options) {
    return {
        trigger: options?.trigger ?? node,
        target: options?.target
            ? Array.isArray(options.target)
                ? options.target
                : [options.target]
            : [node]
    };
}

// -----------------------------------------------------

// Global Raf Instance
const raf = new Raf();

function init() {
    const loader = document.querySelector(".loader");

    const slides = [...document.querySelectorAll(".slide")];
    const slidesInfo = [...document.querySelectorAll(".slide-info")];

    const buttons = {
        prev: document.querySelector(".slider--btn__prev"),
        next: document.querySelector(".slider--btn__next")
    };

    if (loader) {
        loader.style.opacity = 0;
        loader.style.pointerEvents = "none";
    }

    slides.forEach((slide, i) => {
        const slideInner = slide.querySelector(".slide__inner");
        const slideInfoInner = slidesInfo[i] ? slidesInfo[i].querySelector(".slide-info__inner") : null;

        const targets = [slideInner];
        if (slideInfoInner) targets.push(slideInfoInner);

        tilt(slide, { target: targets });
    });

    if (buttons.prev && typeof buttons.prev.addEventListener === 'function') {
        buttons.prev.addEventListener("click", change(-1));
    }
    if (buttons.next && typeof buttons.next.addEventListener === 'function') {
        buttons.next.addEventListener("click", change(1));
    }

    // Image overlay: clicking a slide image opens a focused image overlay
    (function () {
        const overlay = document.createElement('div');
        overlay.className = 'image-overlay';
        overlay.innerHTML = '<div class="image-overlay__inner">\n    <img src="" alt="" class="image-overlay__img" />\n    <button class="image-overlay__close" aria-label="Close">\n      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n        <path d="M18 6L6 18"/>\n        <path d="M6 6l12 12"/>\n      </svg>\n    </button>\n  </div>';
        document.body.appendChild(overlay);

        const overlayImg = overlay.querySelector('.image-overlay__img');
        const overlayClose = overlay.querySelector('.image-overlay__close');

        function openOverlay(src, alt) {
            overlayImg.src = src;
            overlayImg.alt = alt || '';
            overlay.classList.add('open');
            document.body.style.overflow = 'hidden';
        }

        function closeOverlay() {
            overlay.classList.remove('open');
            overlayImg.src = '';
            document.body.style.overflow = '';
        }

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay || e.target === overlayClose) closeOverlay();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay.classList.contains('open')) {
                closeOverlay();
            }
        });

        const imgs = Array.from(document.querySelectorAll('.slide--image'));
        imgs.forEach((img) => {
            img.style.cursor = 'zoom-in';
            img.addEventListener('click', (ev) => {
                ev.stopPropagation();
                openOverlay(img.src, img.alt || '');
            });
        });
    })();
}

function setup() {
    // No loading screen: initialize slider immediately
    init();
}

function change(direction) {
    return () => {
        const current = {
            slide: document.querySelector(".slide[data-current]"),
            slideInfo: document.querySelector(".slide-info[data-current]"),
            slideBg: document.querySelector(".slide__bg[data-current]")
        };
        const previous = {
            slide: document.querySelector(".slide[data-previous]"),
            slideInfo: document.querySelector(".slide-info[data-previous]"),
            slideBg: document.querySelector(".slide__bg[data-previous]")
        };
        const next = {
            slide: document.querySelector(".slide[data-next]"),
            slideInfo: document.querySelector(".slide-info[data-next]"),
            slideBg: document.querySelector(".slide__bg[data-next]")
        };

        const removeAttrSafe = (obj, attr) => {
            Object.values(obj).forEach((el) => {
                if (el && typeof el.removeAttribute === "function") el.removeAttribute(attr);
            });
        };

        const setAttrSafe = (obj, attr) => {
            Object.values(obj).forEach((el) => {
                if (el && typeof el.setAttribute === "function") el.setAttribute(attr, "");
            });
        };

        removeAttrSafe(current, "data-current");
        removeAttrSafe(previous, "data-previous");
        removeAttrSafe(next, "data-next");

        // swap references depending on direction
        let a = current, b = previous, c = next;

        if (direction === 1) {
            a = next; b = current; c = previous;
        } else if (direction === -1) {
            a = previous; b = next; c = current;
        }

        // remove inline z-index styles so CSS stack order stays consistent
        if (a.slide && a.slide.style) a.slide.style.zIndex = "";
        if (b.slide && b.slide.style) b.slide.style.zIndex = "";
        if (c.slide && c.slide.style) c.slide.style.zIndex = "";

        setAttrSafe(a, "data-current");
        setAttrSafe(b, "data-previous");
        setAttrSafe(c, "data-next");
    };
}

// Start
setup();
