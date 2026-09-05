document.documentElement.classList.add("js-enhanced");

const header = document.querySelector("[data-header]");
const navToggle = document.querySelector("[data-nav-toggle]");
const navigation = document.querySelector("[data-nav]");
const progress = document.querySelector("[data-case-progress]");
const copyButton = document.querySelector("[data-copy-email]");
const copyStatus = document.querySelector("[data-copy-status]");

let framePending = false;
let statusTimer;

function updateScrollUI() {
  const scrollTop = window.scrollY;

  header?.classList.toggle("is-scrolled", scrollTop > 18);

  if (progress) {
    const available = document.documentElement.scrollHeight - window.innerHeight;
    const fraction = available > 0 ? Math.min(scrollTop / available, 1) : 0;
    progress.style.transform = `scaleX(${fraction})`;
  }

  framePending = false;
}

function requestScrollUpdate() {
  if (framePending) return;
  framePending = true;
  window.requestAnimationFrame(updateScrollUI);
}

function closeNavigation() {
  if (!navToggle || !navigation) return;
  navToggle.setAttribute("aria-expanded", "false");
  navigation.classList.remove("is-open");
}

navToggle?.addEventListener("click", () => {
  const isOpen = navToggle.getAttribute("aria-expanded") === "true";
  navToggle.setAttribute("aria-expanded", String(!isOpen));
  navigation?.classList.toggle("is-open", !isOpen);
});

navigation?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", closeNavigation);
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || navToggle?.getAttribute("aria-expanded") !== "true") return;
  closeNavigation();
  navToggle?.focus();
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 620) closeNavigation();
});

window.addEventListener("scroll", requestScrollUpdate, { passive: true });
updateScrollUI();

document.querySelectorAll("[data-year]").forEach((element) => {
  element.textContent = String(new Date().getFullYear());
});

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const revealTargets = document.querySelectorAll("[data-reveal]");

document.querySelectorAll("[data-watch-gallery]").forEach((gallery) => {
  if (reducedMotion) return;

  const track = gallery.querySelector("[data-watch-track]");
  const sourceSet = gallery.querySelector("[data-watch-set]");
  if (!track || !sourceSet) return;

  const duplicateSet = sourceSet.cloneNode(true);
  duplicateSet.removeAttribute("data-watch-set");
  duplicateSet.setAttribute("aria-hidden", "true");
  duplicateSet.querySelectorAll("img").forEach((image) => image.setAttribute("alt", ""));
  track.append(duplicateSet);
  gallery.classList.add("is-ready");
});

if (reducedMotion || !("IntersectionObserver" in window)) {
  revealTargets.forEach((target) => target.classList.add("is-visible"));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8%", threshold: 0.08 },
  );

  revealTargets.forEach((target) => observer.observe(target));
}

function showCopyStatus(message) {
  if (!copyStatus) return;
  window.clearTimeout(statusTimer);
  copyStatus.textContent = message;
  copyStatus.classList.add("is-visible");
  statusTimer = window.setTimeout(() => copyStatus.classList.remove("is-visible"), 2200);
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const temporaryInput = document.createElement("textarea");
  temporaryInput.value = value;
  temporaryInput.setAttribute("readonly", "");
  temporaryInput.style.position = "fixed";
  temporaryInput.style.opacity = "0";
  document.body.append(temporaryInput);
  temporaryInput.select();
  const succeeded = document.execCommand("copy");
  temporaryInput.remove();

  if (!succeeded) throw new Error("Copy command was not accepted.");
}

copyButton?.addEventListener("click", async () => {
  const email = copyButton.dataset.email;
  if (!email) return;

  try {
    await copyText(email);
    showCopyStatus("Email copied");
  } catch {
    showCopyStatus("Could not copy. Select the address instead.");
  }
});
