import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
    addDoc,
    collection,
    getFirestore,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
    measurementId: ""
};

let adminEmails = [];
let runtimeConfigLoaded = false;

let animBG = null;
let reverseRafId = null;
let reverseActive = false;
let auth = null;
let db = null;
let unsubscribeNews = null;

async function loadRuntimeConfig() {
    if (runtimeConfigLoaded) {
        return;
    }

    const loadedEnv = window.PART_RUNTIME_CONFIG || null;

    if (!loadedEnv) {
        runtimeConfigLoaded = true;
        return;
    }

    firebaseConfig.apiKey = loadedEnv.PART_FIREBASE_API_KEY || "";
    firebaseConfig.authDomain = loadedEnv.PART_FIREBASE_AUTH_DOMAIN || "";
    firebaseConfig.projectId = loadedEnv.PART_FIREBASE_PROJECT_ID || "";
    firebaseConfig.storageBucket = loadedEnv.PART_FIREBASE_STORAGE_BUCKET || "";
    firebaseConfig.messagingSenderId = loadedEnv.PART_FIREBASE_MESSAGING_SENDER_ID || "";
    firebaseConfig.appId = loadedEnv.PART_FIREBASE_APP_ID || "";
    firebaseConfig.measurementId = loadedEnv.PART_FIREBASE_MEASUREMENT_ID || "";

    adminEmails = String(loadedEnv.PART_ADMIN_EMAILS || "")
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean);

    runtimeConfigLoaded = true;
}

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
    video.src = "GalaxyBG_2.mp4";
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

function hasFirebaseConfig() {
    return Object.values(firebaseConfig).every((value) => typeof value === "string" && value.trim() !== "");
}

function isAdminUser(user) {
    const email = user?.email || "";
    return adminEmails.includes(email);
}

function setStatus(element, message, statusClass = "") {
    if (!element) {
        return;
    }
    element.textContent = message;
    element.classList.remove("status-ok", "status-error");
    if (statusClass) {
        element.classList.add(statusClass);
    }
}

function friendlyFirebaseMessage(error, fallbackPrefix) {
    const code = String(error?.code || "");
    if (code === "permission-denied") {
        return "Could not load news: Firestore denied access. Check rules for the news collection.";
    }
    if (code === "auth/configuration-not-found") {
        return "Login failed: Enable Email/Password in Firebase Authentication -> Sign-in method.";
    }
    const detail = error?.message ? ` ${error.message}` : "";
    return `${fallbackPrefix}${detail}`;
}

function formatPublishedDate(rawDate) {
    if (!rawDate) {
        return "Just now";
    }
    const date = rawDate.toDate ? rawDate.toDate() : new Date(rawDate);
    if (Number.isNaN(date.getTime())) {
        return "Just now";
    }
    return new Intl.DateTimeFormat("en-AU", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(date);
}

function renderNews(posts) {
    const newsList = document.getElementById("newsList");
    if (!newsList) {
        return;
    }

    newsList.innerHTML = "";
    for (const post of posts) {
        const article = document.createElement("article");
        article.className = "news-item";

        const meta = document.createElement("div");
        meta.className = "news-meta";
        meta.textContent = `${formatPublishedDate(post.createdAt)}${post.authorEmail ? ` • ${post.authorEmail}` : ""}`;

        const title = document.createElement("h3");
        title.className = "news-title";
        title.textContent = post.title || "Untitled update";

        const body = document.createElement("p");
        body.className = "news-body";
        body.textContent = post.body || "";

        article.append(meta, title, body);

        if (post.link) {
            const link = document.createElement("a");
            link.className = "news-link";
            link.href = post.link;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.textContent = "Read more";
            article.append(link);
        }

        newsList.append(article);
    }
}

function subscribeToNews() {
    const newsStatus = document.getElementById("newsStatus");
    const newsList = document.getElementById("newsList");
    if (!newsList) {
        return;
    }

    const parsedLimit = Number.parseInt(newsList.dataset.limit || "20", 10);
    const newsLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20;
    const newsCollection = collection(db, "news");
    const newsQuery = query(newsCollection, orderBy("createdAt", "desc"), limit(newsLimit));

    if (typeof unsubscribeNews === "function") {
        unsubscribeNews();
    }

    unsubscribeNews = onSnapshot(newsQuery, (snapshot) => {
        const posts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        if (posts.length === 0) {
            setStatus(newsStatus, "No updates yet. Check back soon.");
            renderNews([]);
            return;
        }
        setStatus(newsStatus, "");
        renderNews(posts);
    }, (error) => {
        setStatus(newsStatus, friendlyFirebaseMessage(error, "Could not load news:"), "status-error");
    });
}

function updateAdminUI(user) {
    const loginForm = document.getElementById("loginForm");
    const newsForm = document.getElementById("newsForm");
    const adminMessage = document.getElementById("adminMessage");

    if (!loginForm || !newsForm || !adminMessage) {
        return;
    }

    if (!user) {
        loginForm.hidden = false;
        newsForm.hidden = true;
        setStatus(adminMessage, "Please sign in with an admin account.");
        return;
    }

    if (!isAdminUser(user)) {
        loginForm.hidden = true;
        newsForm.hidden = true;
        setStatus(adminMessage, "This account is not authorized to publish news.", "status-error");
        return;
    }

    loginForm.hidden = true;
    newsForm.hidden = false;
    setStatus(adminMessage, `Signed in as ${user.email}`, "status-ok");
}

function setupAdminActions() {
    const loginForm = document.getElementById("loginForm");
    const newsForm = document.getElementById("newsForm");
    const signOutButton = document.getElementById("signOutButton");
    const adminMessage = document.getElementById("adminMessage");

    if (!loginForm || !newsForm || !signOutButton || !adminMessage) {
        return;
    }

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(loginForm);
        const email = String(formData.get("email") || "").trim();
        const password = String(formData.get("password") || "");

        try {
            await signInWithEmailAndPassword(auth, email, password);
            setStatus(adminMessage, "Login successful.", "status-ok");
            loginForm.reset();
        } catch (error) {
            setStatus(adminMessage, friendlyFirebaseMessage(error, "Login failed:"), "status-error");
        }
    });

    newsForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const activeUser = auth.currentUser;
        if (!activeUser || !isAdminUser(activeUser)) {
            setStatus(adminMessage, "Admin authorization required.", "status-error");
            return;
        }

        const formData = new FormData(newsForm);
        const title = String(formData.get("title") || "").trim();
        const body = String(formData.get("body") || "").trim();
        const link = String(formData.get("link") || "").trim();

        if (!title || !body) {
            setStatus(adminMessage, "Title and content are required.", "status-error");
            return;
        }

        try {
            await addDoc(collection(db, "news"), {
                title,
                body,
                link,
                authorEmail: activeUser.email || "",
                createdAt: serverTimestamp()
            });
            setStatus(adminMessage, "News item published.", "status-ok");
            newsForm.reset();
        } catch (error) {
            setStatus(adminMessage, `Publish failed: ${error.message}`, "status-error");
        }
    });

    signOutButton.addEventListener("click", async () => {
        try {
            await signOut(auth);
            setStatus(adminMessage, "Signed out.");
        } catch (error) {
            setStatus(adminMessage, `Sign out failed: ${error.message}`, "status-error");
        }
    });

}

async function setupFirebaseFeatures() {
    await loadRuntimeConfig();
    const newsStatus = document.getElementById("newsStatus");
    const hasNewsUI = Boolean(document.getElementById("newsList"));
    const hasAdminUI = Boolean(document.getElementById("loginForm") && document.getElementById("newsForm"));
    const adminMessage = document.getElementById("adminMessage");

    if (!hasFirebaseConfig()) {
        setStatus(newsStatus, "Firebase is not configured yet. Add values to public/env-config.js.", "status-error");
        setStatus(adminMessage, "Firebase Auth is disabled until public/env-config.js is configured.", "status-error");
        return;
    }

    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    if (hasAdminUI) {
        setupAdminActions();
    }

    if (hasNewsUI) {
        subscribeToNews();
    }

    if (hasNewsUI || hasAdminUI) {
        onAuthStateChanged(auth, (user) => {
            if (hasAdminUI) {
                updateAdminUI(user);
            }
            if (hasNewsUI) {
                subscribeToNews();
            }
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    setupMenu();

    if (!isMobile()) {
        createLandingVideo();
        setupVideoScrub();
    }

    void setupFirebaseFeatures();
});

