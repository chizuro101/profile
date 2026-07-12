// Reuse the shared Firebase connection from firebase.js (real project config
// and the `messages` collection your Chatbox already uses), so there is a
// single source of truth and messages persist across refreshes.
import {
  db, auth, firebaseReady, collection, addDoc, query, orderBy, limit,
  onSnapshot, signInAnonymously
} from "./firebase.js";

/* ============================= Utilities ============================= */
const STORAGE_KEY = "communityChat.displayName"; // sessionStorage — cleared when the tab/window closes
const COLOR_KEY = "communityChat.color";
const EXPIRE_MS = 24 * 60 * 60 * 1000; // messages auto-hide after 24 hours

function relativeTime(date) {
  if (!date) return "now";
  const diffSec = Math.round((Date.now() - date.getTime()) / 1000);
  if (diffSec < 10) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}

function pickRandomColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue} 65% 62%)`;
}

function makeId() {
  return "m-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
}

const DEVICE_ICONS = {
  desktop: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="13" rx="1.5"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`,
  mobile: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2"></rect><line x1="11" y1="18" x2="13" y2="18"></line></svg>`
};

function detectDevice() {
  const ua = navigator.userAgent || "";
  return /Mobi|Android|iPhone|iPad/i.test(ua) ? "mobile" : "desktop";
}

function resolveLocation() {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`https://api-bdc.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
          const data = await res.json();
          const city = data.city || data.locality || data.principalSubdivision || null;
          const country = data.countryCode || "";
          resolve(city ? (country ? `${city}, ${country}` : city) : null);
        } catch (e) { resolve(null); }
      },
      () => resolve(null),
      { timeout: 6000, maximumAge: 600000 }
    );
  });
}

let myLocation = null;       // resolved via geolocation (e.g. "Tanjay, PH"); null if denied/unavailable
let myDevice = detectDevice();

/* ============================= Name modal ============================= */
const overlay = document.getElementById("name-modal-overlay");
const nameInput = document.getElementById("name-input");
const nameError = document.getElementById("name-error");
const nameContinueBtn = document.getElementById("name-continue");

let displayName = sessionStorage.getItem(STORAGE_KEY) || "";
let currentColor = sessionStorage.getItem(COLOR_KEY) || "";
if (displayName && !currentColor) currentColor = pickRandomColor();

function sanitizeName(raw) { return raw.replace(/\s+/g, " ").trim().slice(0, 24); }
function showModal() { overlay.style.display = "flex"; setTimeout(() => nameInput.focus(), 50); }
function hideModal() { overlay.style.display = "none"; }

function submitName() {
  const val = sanitizeName(nameInput.value);
  if (val.length < 2) { nameError.textContent = "Name must be at least 2 characters."; return; }
  displayName = val;
  if (!currentColor) currentColor = pickRandomColor();
  sessionStorage.setItem(STORAGE_KEY, displayName);
  sessionStorage.setItem(COLOR_KEY, currentColor);
  unlockComposer();
  hideModal();
  startApp();
}

function lockComposer() {
  composer.classList.add("locked");
  msgInput.disabled = true;
  sendBtn.disabled = true;
  msgInput.placeholder = "enter a display name to chat…";
}
function unlockComposer() {
  composer.classList.remove("locked");
  msgInput.disabled = false;
  sendBtn.disabled = false;
  msgInput.placeholder = "say something…";
}
nameContinueBtn.addEventListener("click", submitName);
nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); submitName(); } });

/* ============================= Connection banner ============================= */
const connBanner = document.getElementById("connection-banner");
function setConnected(isConnected) {
  connBanner.classList.toggle("show", !isConnected);
}
window.addEventListener("online", () => setConnected(true));
window.addEventListener("offline", () => setConnected(false));
setConnected(navigator.onLine);

/* ============================= Chat module ============================= */
const messagesEl = document.getElementById("messages");
const composer = document.getElementById("composer");
const msgInput = document.getElementById("msg-input");
const sendBtn = document.getElementById("send-btn");
const spamWarning = document.getElementById("spam-warning");
const chattingAsName = document.getElementById("chatting-as-name");
const msgCountNumber = document.getElementById("msg-count-number");

let lastSendTime = 0;
const SEND_COOLDOWN_MS = 1200;
let recentSendTimestamps = [];

function isNearBottom() {
  return messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < 80;
}
function scrollToBottom(force = false) {
  if (!force && !isNearBottom()) return;
  // Jump instantly (bypass CSS smooth scrolling) and re-apply on the next
  // frame so we truly land at the bottom even after late layout / image reflow.
  const prev = messagesEl.style.scrollBehavior;
  messagesEl.style.scrollBehavior = "auto";
  messagesEl.scrollTop = messagesEl.scrollHeight;
  requestAnimationFrame(() => { messagesEl.scrollTop = messagesEl.scrollHeight; });
  messagesEl.style.scrollBehavior = prev;
}

const CHAR_AVATARS = [
  "avatar.svg", "avatar (1).svg", "avatar (2).svg", "avatar (3).svg",
  "avatar (4).svg", "avatar (5).svg", "avatar (6).svg", "avatar (7).svg", "avatar (8).svg"
];

// Derive a stable char avatar for a user from their uid/name so the same
// person always gets the same image. No extra Firestore field is needed
// (the rules cap the doc at 6 fields), so this is computed at render time.
function avatarFor(msg) {
  const key = (msg.uid && !String(msg.uid).startsWith("local-"))
    ? msg.uid
    : (msg.name || "anon");
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return CHAR_AVATARS[Math.abs(h) % CHAR_AVATARS.length];
}

function renderMessage(msg, myUid) {
  const own = msg.uid === myUid;
  const row = document.createElement("div");
  row.className = "msg-row";

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.style.background = msg.color || "hsl(220 10% 80%)";
  const avatarImg = document.createElement("img");
  avatarImg.src = "../assets/img/char/" + encodeURI(avatarFor(msg));
  avatarImg.alt = "";
  avatar.appendChild(avatarImg);

  const col = document.createElement("div");
  col.className = "msg-col";

  const meta = document.createElement("div");
  meta.className = "msg-meta";
  const nameSpan = document.createElement("span");
  nameSpan.className = "name";
  nameSpan.textContent = own ? "You" : (msg.name || "Anonymous");
  meta.appendChild(nameSpan);

  if (msg.location) {
    const sep = document.createElement("span"); sep.className = "sep"; sep.textContent = "·";
    const loc = document.createElement("span"); loc.textContent = msg.location;
    meta.appendChild(sep); meta.appendChild(loc);
  }

  const sepDev = document.createElement("span"); sepDev.className = "sep"; sepDev.textContent = "·";
  const devIcon = document.createElement("span");
  devIcon.innerHTML = DEVICE_ICONS[msg.device === "mobile" ? "mobile" : "desktop"];
  meta.appendChild(sepDev); meta.appendChild(devIcon);

  const sepTime = document.createElement("span"); sepTime.className = "sep"; sepTime.textContent = "·";
  const timeSpan = document.createElement("span"); timeSpan.className = "time";
  const ts = Number(msg.ts) || 0;
  timeSpan.dataset.ts = ts;
  timeSpan.textContent = relativeTime(ts ? new Date(ts) : null);
  meta.appendChild(sepTime); meta.appendChild(timeSpan);

  const bubble = document.createElement("div");
  bubble.className = "bubble" + (msg.pending ? " pending" : "");
  bubble.textContent = msg.text;

  col.appendChild(meta);
  col.appendChild(bubble);
  row.appendChild(avatar);
  row.appendChild(col);
  return row;
}

function refreshTimestamps() {
  let visible = 0;
  document.querySelectorAll("#messages [data-ts]").forEach(el => {
    const ts = Number(el.dataset.ts);
    if (!ts) return;
    if (Date.now() - ts > EXPIRE_MS) { el.closest(".msg-row")?.remove(); return; }
    el.textContent = relativeTime(new Date(ts));
    visible++;
  });
  msgCountNumber.textContent = String(visible);
}
setInterval(refreshTimestamps, 30000);

function autoResizeInput() {
  msgInput.style.height = "auto";
  msgInput.style.height = Math.min(msgInput.scrollHeight, 100) + "px";
}
msgInput.addEventListener("input", autoResizeInput);
msgInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
});
composer.addEventListener("submit", (e) => { e.preventDefault(); handleSend(); });

function checkClientSpam() {
  const now = Date.now();
  recentSendTimestamps = recentSendTimestamps.filter(t => now - t < 10000);
  if (now - lastSendTime < SEND_COOLDOWN_MS) return "cooldown";
  if (recentSendTimestamps.length >= 6) return "flood";
  return null;
}

function buildMessageDoc(text) {
  return {
    color: currentColor,
    device: myDevice,
    id: makeId(),
    location: myLocation,
    name: displayName,
    text,
    ts: Date.now(),
    uid: currentUid
  };
}

async function handleSend() {
  if (!displayName) { showModal(); return; } // hard guard: no name, no send — regardless of UI state
  const text = msgInput.value.trim();
  if (!text || text.length > 500) return;

  const spamReason = checkClientSpam();
  if (spamReason) {
    spamWarning.textContent = spamReason === "cooldown"
      ? "Slow down a little — please wait a moment before sending again."
      : "You're sending messages too quickly. Take a short break.";
    spamWarning.classList.add("show");
    setTimeout(() => spamWarning.classList.remove("show"), 2500);
    return;
  }

  lastSendTime = Date.now();
  recentSendTimestamps.push(lastSendTime);
  msgInput.value = "";
  autoResizeInput();

  if (!firebaseReady) { appendLocalMessage(text); return; }

  try {
    await addDoc(collection(db, "messages"), buildMessageDoc(text));
  } catch (err) {
    console.error("Failed to send message:", err);
    const code = (err && err.code) || (err && err.message) || "unknown error";
    spamWarning.textContent = "Message couldn't be sent — " + code;
    spamWarning.classList.add("show");
    setTimeout(() => spamWarning.classList.remove("show"), 3500);
  }
}

function appendLocalMessage(text) {
  const row = renderMessage({ ...buildMessageDoc(text), pending: true }, currentUid);
  messagesEl.appendChild(row);
  scrollToBottom(true);
  msgCountNumber.textContent = String(Number(msgCountNumber.textContent || 0) + 1);
}

function listenToMessages() {
  if (!firebaseReady) return;
  let firstLoad = true;
  const q = query(collection(db, "messages"), orderBy("ts", "desc"), limit(50));
  onSnapshot(q, (snapshot) => {
    const docs = [];
    snapshot.forEach(doc => docs.push(doc.data()));
    docs.reverse();
    // On first render always jump to the newest; afterwards only follow if the
    // user is already near the bottom (so reading history isn't yanked down).
    const stickToBottom = firstLoad ? true : isNearBottom();
    messagesEl.innerHTML = "";
    let visible = 0;
    docs.forEach(data => {
      const ts = Number(data.ts) || 0;
      if (ts && Date.now() - ts > EXPIRE_MS) return; // skip messages older than 24h
      messagesEl.appendChild(renderMessage({ ...data, ts }, currentUid));
      visible++;
    });
    if (stickToBottom) scrollToBottom(true);
    firstLoad = false;
    msgCountNumber.textContent = String(visible);
  }, (err) => console.error("Message listener error:", err));
}

/* ============================= Boot ============================= */
let currentUid = "local-" + Math.random().toString(36).slice(2, 10);

async function startApp() {
  chattingAsName.textContent = displayName;
  myLocation = await resolveLocation();

  if (!firebaseReady) return;

  // Reads don't require auth, so start listening immediately. This keeps
  // messages on screen across refreshes even if anonymous sign-in is
  // unavailable — only sending falls back to a local id.
  listenToMessages();

  try {
    const cred = await signInAnonymously(auth);
    if (cred && cred.user) currentUid = cred.user.uid;
  } catch (e) {
    console.warn("Anonymous auth unavailable — messages still load, sending uses a local id.", e);
  }
}

if (displayName) { unlockComposer(); hideModal(); startApp(); } else { lockComposer(); showModal(); }
