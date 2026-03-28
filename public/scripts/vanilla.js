/**
 * vanilla.js - Static hosting compatible script (no modules, no Firebase)
 * Provides core UI functionality: menu toggle, animations, video effects
 */

(function() {
    'use strict';

    // State
    let animBG = null;
    let reverseRafId = null;
    let reverseActive = false;

    // ============================================================================
    // Video Background - Reverse Playback
    // ============================================================================

    function stopReversePlayback() {
        if (reverseRafId !== null) {
            cancelAnimationFrame(reverseRafId);
            reverseRafId = null;
        }
        reverseActive = false;
    }

    function playReverseFromEnd(video) {
        if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
            return;
        }

        stopReversePlayback();
        reverseActive = true;
        video.pause();
        video.currentTime = video.duration;

        let lastTs = null;
        const reverseSpeed = 1;

        const step = (ts) => {
            if (!reverseActive) {
                return;
            }

            if (lastTs === null) {
                lastTs = ts;
            }

            const dt = (ts - lastTs) / 1000;
            lastTs = ts;
            video.currentTime = Math.max(0, video.currentTime - dt * reverseSpeed);

            if (video.currentTime <= 0.001) {
                stopReversePlayback();
                video.currentTime = 0;
                video.playbackRate = 1;
                video.play();
                return;
            }

            reverseRafId = requestAnimationFrame(step);
        };

        reverseRafId = requestAnimationFrame(step);
    }

    function isMobile() {
        return window.matchMedia("(max-width: 860px)").matches;
    }

    function createLandingVideo() {
        const fallbackImage = document.getElementById("landingPNG");
        if (!fallbackImage) {
            return;
        }

        const video = document.createElement("video");
        video.id = "videoBG";
        video.src = "assets/video/GalaxyBG_2.mp4";
        video.muted = true;
        video.autoplay = true;
        video.playsInline = true;

        video.addEventListener("loadeddata", () => {
            fallbackImage.remove();
        });

        video.addEventListener("error", () => {
            animBG = null;
        });

        video.addEventListener("ended", () => {
            playReverseFromEnd(video);
        });

        animBG = video;
        document.body.prepend(video);
    }

    // ============================================================================
    // Instruction Flow - Scroll Animation
    // ============================================================================

    function setupInstructionFlow() {
        const steps = Array.from(document.querySelectorAll("[data-step]"));
        if (steps.length === 0) {
            return;
        }

        document.body.classList.add("has-step-animations");

        const observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                entry.target.classList.toggle("is-visible", entry.isIntersecting);
            }
        }, {
            threshold: 0.35,
            rootMargin: "0px 0px -12% 0px"
        });

        steps.forEach((step, index) => {
            step.style.transitionDelay = `${Math.min(index * 70, 250)}ms`;
            observer.observe(step);
        });
    }

    // ============================================================================
    // Menu Toggle
    // ============================================================================

    function setupMenu() {
        const menuToggle = document.getElementById("menuToggle");
        const menu = document.getElementById("siteNav");
        if (!menuToggle || !menu) {
            return;
        }

        menuToggle.addEventListener("click", () => {
            const willOpen = !menu.classList.contains("is-open");
            menu.classList.toggle("is-open", willOpen);
            menuToggle.setAttribute("aria-expanded", String(willOpen));
        });

        menu.querySelectorAll("a").forEach((link) => {
            link.addEventListener("click", () => {
                menu.classList.remove("is-open");
                menuToggle.setAttribute("aria-expanded", "false");
            });
        });

        document.addEventListener("click", (event) => {
            if (!menu.contains(event.target) && !menuToggle.contains(event.target)) {
                menu.classList.remove("is-open");
                menuToggle.setAttribute("aria-expanded", "false");
            }
        });
    }

    // ============================================================================
    // Video Scrubbing - Mouse Position Control
    // ============================================================================

    function setupVideoScrub() {
        const sections = document.querySelectorAll(".content-section");
        const sectionRects = [];

        function computeSectionRects() {
            sectionRects.length = 0;
            for (const section of sections) {
                sectionRects.push(section.getBoundingClientRect());
            }
        }

        computeSectionRects();
        window.addEventListener("resize", computeSectionRects);
        window.addEventListener("scroll", computeSectionRects, { passive: true });

        let lastMouseEvent = null;
        let mouseMoveScheduled = false;
        window.addEventListener("mousemove", (event) => {
            lastMouseEvent = event;
            if (mouseMoveScheduled) {
                return;
            }

            mouseMoveScheduled = true;
            requestAnimationFrame(() => {
                mouseMoveScheduled = false;
                const e = lastMouseEvent;
                if (!e) {
                    return;
                }

                // Check if mouse is over content sections
                for (let i = 0; i < sectionRects.length; i += 1) {
                    const rect = sectionRects[i];
                    if (
                        e.clientX >= rect.left &&
                        e.clientX <= rect.right &&
                        e.clientY >= rect.top &&
                        e.clientY <= rect.bottom
                    ) {
                        return;
                    }
                }

                if (!animBG || !Number.isFinite(animBG.duration) || animBG.duration <= 0) {
                    return;
                }

                if (reverseActive) {
                    stopReversePlayback();
                }

                const progress = e.clientX / Math.max(window.innerWidth, 1);
                animBG.currentTime = progress * animBG.duration;
            });
        });
    }

    // ============================================================================
    // Initialize on DOM Ready
    // ============================================================================

    function init() {
        setupMenu();
        setupInstructionFlow();

        if (!isMobile()) {
            createLandingVideo();
            setupVideoScrub();
        }
    }

    // Wait for DOM to be ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
