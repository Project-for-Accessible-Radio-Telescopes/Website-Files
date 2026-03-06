let animBG = null;
let reverseRafId = null;
let reverseActive = false;

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
    const reverseSpeed = 1; // seconds of video per real-time second

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
    video.src = "GalaxyBG_2.mp4";
    video.muted = true;
    video.autoplay = true;
    // video.loop = true; No looping, we want something like start -> end -> start
    video.playsInline = true;

    video.addEventListener("loadeddata", () => {
        fallbackImage.remove();
    });

    video.addEventListener("error", () => {
        // Keep fallback image if video fails.
        animBG = null;
    });

    video.addEventListener("ended", () => {
        playReverseFromEnd(video);
    });

    animBG = video;
    document.body.prepend(video);
}

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

function setupVideoScrub() {
    window.addEventListener("mousemove", (event) => {
        // We first need to find if the mouse is on one of the sections
        // If it is, then we don't want to scrub the video, since the user is likely trying to read the text
        const sections = document.querySelectorAll(".content-section");
        for (const section of sections) {
             const rect = section.getBoundingClientRect();
             if (
                 event.clientX >= rect.left &&
                 event.clientX <= rect.right &&
                 event.clientY >= rect.top &&
                 event.clientY <= rect.bottom
             ) {
                 return; // Mouse is over a section, don't scrub
             }
        }

        if (!animBG || !Number.isFinite(animBG.duration) || animBG.duration <= 0) {
            return;
        }

        if (reverseActive) {
            stopReversePlayback();
        }

        const progress = event.clientX / Math.max(window.innerWidth, 1);
        animBG.currentTime = progress * animBG.duration;
    });
}

document.addEventListener("DOMContentLoaded", () => {
    setupMenu();
    if (!isMobile()) {
        createLandingVideo();
        setupVideoScrub();
    }
});

