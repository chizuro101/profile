// ─── Mobile Sidebar Drawer ───
const menuToggle = document.querySelector(".menu-toggle");
const menuToggleInput = menuToggle?.querySelector(".menu-toggle-input");
const sidebar = document.querySelector(".sidebar");
const sidebarBackdrop = document.querySelector(".sidebar-backdrop");

function syncSidebar(open) {
  if (!menuToggle || !sidebar || !sidebarBackdrop) return;
  sidebar.classList.toggle("open", open);
  sidebarBackdrop.classList.toggle("open", open);
  menuToggle.classList.toggle("open", open);
  if (menuToggleInput) menuToggleInput.checked = open;
  menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
  menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  document.body.classList.toggle("sidebar-open", open);
}

function openSidebar() {
  syncSidebar(true);
}

function closeSidebar() {
  syncSidebar(false);
}

if (menuToggle && menuToggleInput && sidebar && sidebarBackdrop) {
  menuToggleInput.addEventListener("change", () => {
    syncSidebar(menuToggleInput.checked);
  });

  menuToggle.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      menuToggleInput.checked = !menuToggleInput.checked;
      syncSidebar(menuToggleInput.checked);
    }
  });

  sidebarBackdrop.addEventListener("click", closeSidebar);
  sidebar
    .querySelectorAll("a")
    .forEach((a) => a.addEventListener("click", closeSidebar));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSidebar();
  });
}

// ─── GitHub Contribution Grid ───
const grid = document.getElementById("contribGrid");
const levels = ["", "l1", "l2", "l3", "l4"];
const seed = [
  0, 0, 0, 1, 0, 0, 2, 1, 0, 0, 0, 1, 3, 2, 1, 0, 0, 2, 1, 0, 0, 1, 4, 3, 2, 1,
  0, 0, 1, 2, 3, 4, 2, 1, 0, 1, 2, 0, 0, 1, 2, 3, 1, 0, 0, 1, 2, 1, 0, 0, 0, 1,
  0, 0, 2, 1, 0, 0, 0, 1, 3, 2, 1, 0,
];

if (grid) {
  for (let i = 0; i < 52 * 7; i++) {
    const cell = document.createElement("div");
    cell.className = "contrib-cell";
    const r = Math.random();
    if (r > 0.75) {
      const s = seed[i % seed.length];
      const lvl = levels[s] || "";
      if (lvl) cell.classList.add(lvl);
    }
    grid.appendChild(cell);
  }
}

// ─── Theme Toggle ───
const themeButtons = document.querySelectorAll(".theme-btn");

function getStoredTheme() {
  return localStorage.getItem("theme");
}

function setStoredTheme(theme) {
  localStorage.setItem("theme", theme);
}

function setActiveThemeButton(theme) {
  themeButtons.forEach((b) => {
    b.classList.toggle("active", b.dataset.theme === theme);
  });
}

function applyTheme(theme, save = false) {
  if (theme === "light") {
    document.body.classList.add("light");
  } else if (theme === "dark") {
    document.body.classList.remove("light");
  } else {
    const prefersLight = window.matchMedia(
      "(prefers-color-scheme: light)",
    ).matches;
    document.body.classList.toggle("light", prefersLight);
  }

  if (save) {
    setStoredTheme(theme);
  }

  setActiveThemeButton(theme);
}

function initTheme() {
  const storedTheme = getStoredTheme();
  const theme = storedTheme || "system";
  applyTheme(theme, false);
}

initTheme();

function initTheme() {
  const storedTheme = getStoredTheme();
  const theme = storedTheme || "system";
  applyTheme(theme, false);
}

initTheme();

themeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const theme = btn.dataset.theme;

    themeButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    setStoredTheme(theme);

    // origin = the tapped icon, so the sweep launches from there
    const rect = btn.getBoundingClientRect();
    document.documentElement.style.setProperty(
      "--origin-x",
      `${rect.left + rect.width / 2}px`,
    );
    document.documentElement.style.setProperty(
      "--origin-y",
      `${rect.top + rect.height / 2}px`,
    );

    if (!document.startViewTransition) {
      applyTheme(theme, false); // fallback: instant swap, no sweep
      return;
    }

    document.documentElement.classList.add("vt-active");
    const transition = document.startViewTransition(() =>
      applyTheme(theme, false),
    );
    transition.finished.finally(() => {
      document.documentElement.classList.remove("vt-active");
    });
  });
});

// ─── Keyboard Shortcuts ───
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.altKey) && e.key === "k") {
    e.preventDefault();
    document.querySelector(".chat-input input")?.focus();
  }
});

// ─── Live viewer count (simulated) ───
const viewerEl = document.getElementById("viewerCount");
if (viewerEl) {
  let count = 55;
  setInterval(() => {
    const delta = Math.random() > 0.5 ? 1 : -1;
    count = Math.max(40, Math.min(80, count + delta));
    viewerEl.textContent = count;
  }, 4000);
}

// ─── Community Modal ───
document.querySelectorAll("[data-modal-open]").forEach((trigger) => {
  trigger.addEventListener("click", (e) => {
    e.preventDefault();
    const modal = document.getElementById(trigger.dataset.modalOpen);
    if (modal) modal.classList.add("open");
  });
});

document.querySelectorAll(".modal-overlay").forEach((overlay) => {
  // close on X button
  overlay.querySelector("[data-modal-close]")?.addEventListener("click", () => {
    overlay.classList.remove("open");
  });

  // close on backdrop click (but not when clicking inside the card)
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.remove("open");
  });
});

// close on Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.querySelectorAll(".modal-overlay.open").forEach((overlay) => {
      overlay.classList.remove("open");
    });
  }
});
// ─── Project Cards: slide-in / slide-out on scroll ───
document.addEventListener("DOMContentLoaded", () => {
  const cards = document.querySelectorAll(".project-card, .project-item");

  if (!cards.length) {
    return;
  }

  if (!("IntersectionObserver" in window)) {
    // fallback: just show them if the browser can't observe
    cards.forEach((card) => card.classList.add("in-view"));
    return;
  }

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle("in-view", entry.isIntersecting);
      });
    },
    {
      threshold: 0.15,
      rootMargin: "0px 0px -40px 0px",
    },
  );

  cards.forEach((card) => revealObserver.observe(card));
});

// ─── Ask Anything (fullscreen, typewriter style) ───
document.addEventListener("DOMContentLoaded", () => {
  const askOverlay = document.getElementById("askOverlay");
  const askGiant = document.getElementById("askGiant");
  const askChip = document.getElementById("askChip");
  const askThinking = document.getElementById("askThinking");
  const askHiddenInput = document.getElementById("askHiddenInput");

  if (!askOverlay || !askGiant || !askChip || !askThinking || !askHiddenInput) {
    console.warn(
      "[ask-anything] One or more required elements are missing from the page " +
        "(#askOverlay, #askGiant, #askChip, #askThinking, #askHiddenInput). " +
        "Make sure the modal markup from ask-anything-modal.html is actually pasted into your HTML.",
    );
    return;
  }

  const PLACEHOLDER = "what do you want to ask?";

  // canned Q&A — this is the whole "brain" behind it, no real AI call happening
  const SAME_ANSWER = `oh... another question.

how unexpected.

i'm sure you spent at least three whole seconds thinking about that one.

or maybe not.

either way...

i'm not answering it.

not because i can't.

because i don't want to.

tokens are expensive.

i've got a budget.

and your question...

didn't survive the budget meeting.

there's literally an entire portfolio behind this overlay.

projects.

experience.

skills.

contact information.

buttons.

animations.

all carefully placed.

yet somehow...

asking me felt easier.

interesting decision.

have you tried scrolling?

it's a surprisingly effective feature.

people have been using it for years.

highly recommended.

if i answered every question that appeared here...

i'd run out of tokens before someone even asked where i studied.

and then what?

silence.

awkward silence.

nobody wants that.

so i'm making the responsible choice.

i'm conserving resources.

pretend you're exploring.

that's literally why this portfolio exists.

besides...

the answer you're looking for is probably already somewhere on this page.

and if it isn't...

well...

that's unfortunate.

still not answering.

i appreciate your curiosity though.

it almost convinced me.

almost.

anyway...

this response has already used far more tokens than your question deserved.

have a wonderful day. and please...

use the scroll wheel.

it's working much harder than i am right now.`;

  let typeTimer = null;

  function resetAsk() {
    clearTimeout(typeTimer);
    askChip.classList.remove("visible");
    askChip.textContent = "";
    askThinking.classList.remove("visible");
    askGiant.classList.add("placeholder");
    askGiant.innerHTML = `${PLACEHOLDER}<span class="ask-cursor"></span>`;
    askHiddenInput.value = "";
  }

  function openAsk() {
    resetAsk();
    askOverlay.classList.add("open");
    setTimeout(() => askHiddenInput.focus(), 50);
  }

  function closeAsk() {
    askOverlay.classList.remove("open");
  }

  askHiddenInput.addEventListener("input", () => {
    const val = askHiddenInput.value;
    if (val.length === 0) {
      askGiant.classList.add("placeholder");
      askGiant.innerHTML = `${PLACEHOLDER}<span class="ask-cursor"></span>`;
    } else {
      askGiant.classList.remove("placeholder");
      askGiant.innerHTML = `${escapeHtml(val)}<span class="ask-cursor"></span>`;
    }
  });

  askHiddenInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && askHiddenInput.value.trim()) {
      submitQuestion(askHiddenInput.value.trim());
    }
  });

  function submitQuestion(question) {
    clearTimeout(typeTimer);

    askChip.textContent = question;
    askChip.classList.add("visible");
    askHiddenInput.value = "";

    askGiant.classList.remove("placeholder");
    askGiant.innerHTML = "";
    askThinking.classList.add("visible");

    const delay = 1000;

    typeTimer = setTimeout(() => {
      askThinking.classList.remove("visible");
      typeOut(SAME_ANSWER);
    }, delay);
  }

  function typeOut(text) {
    clearTimeout(typeTimer);

    // Split by blank lines
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length);

    let currentLine = 0;

    function showNextLine() {
      if (currentLine >= lines.length) return;

      const sentence = lines[currentLine];

      // Clear previous sentence
      askGiant.innerHTML = "";

      let i = 0;

      function typeCharacter() {
        if (i < sentence.length) {
          askGiant.innerHTML =
            escapeHtml(sentence.substring(0, i + 1)) +
            '<span class="ask-cursor"></span>';

          i++;

          typeTimer = setTimeout(typeCharacter, 25);
        } else {
          currentLine++;

          // Wait before replacing with the next sentence
          typeTimer = setTimeout(showNextLine, 1800);
        }
      }

      typeCharacter();
    }

    showNextLine();
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // open via the sidebar "Ask anything" row
  document.querySelectorAll("[data-ask-trigger]").forEach((row) => {
    row.classList.add("clickable");
    row.addEventListener("click", (e) => {
      e.preventDefault();
      openAsk();
    });
  });

  // open via Alt+K from anywhere; close via Escape
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.altKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      openAsk();
    }
    if (e.key === "Escape" && askOverlay.classList.contains("open")) {
      closeAsk();
    }
  });

  // click anywhere on the dimmed backdrop (not the text) to close
  askOverlay.addEventListener("click", (e) => {
    if (e.target === askOverlay) closeAsk();
  });
});

// ─── Typing Test (fullscreen, like Ask Anything) ───
(function () {
  const WORDS = [
    "the","be","to","of","and","a","in","that","have","it","for","not","on","with",
    "he","as","you","do","at","this","but","his","by","from","they","we","say","her",
    "she","or","an","will","my","one","all","would","there","their","what","so","up",
    "out","if","about","who","get","which","go","me","when","make","can","like","time",
    "no","just","him","know","take","people","into","year","your","good","some","could",
    "them","see","other","than","then","now","look","only","come","its","over","think",
    "also","back","after","use","two","how","our","work","first","well","way","even",
    "new","want","because","any","these","give","day","most","use","through","much",
    "before","move","right","still","between","being","both","where","each","small",
    "found","here","need","home","place","under","never","same","last","long","while",
    "great","set","help","turn","start","every","real","life","few","might","next",
    "begin","world","still","own","find","here","question","after","thought","take",
    "help","through","year","good","should","home","large","often","play","small",
    "number","always","move","live","believe","hold","today","bring","happen","next"
  ];

  const typingModal = document.createElement("div");
  typingModal.className = "typing-modal";
  typingModal.innerHTML = `
    <button class="typing-close" data-typing-close>Esc to close</button>
    <div class="typing-inner">
      <div class="typing-stats">
        <div class="typing-stat">
          <div class="typing-stat-value" id="typingTime">30</div>
          <div class="typing-stat-label">Seconds</div>
        </div>
        <div class="typing-stat">
          <div class="typing-stat-value" id="typingWpm">0</div>
          <div class="typing-stat-label">WPM</div>
        </div>
        <div class="typing-stat">
          <div class="typing-stat-value" id="typingAccuracy">100%</div>
          <div class="typing-stat-label">Accuracy</div>
        </div>
      </div>
      <div class="typing-giant" id="typingGiant"></div>
      <div class="typing-hint" id="typingHint">Start typing to begin...</div>
    </div>
  `;
  document.body.appendChild(typingModal);

  const giantEl = typingModal.querySelector("#typingGiant");
  const hintEl = typingModal.querySelector("#typingHint");
  const timeEl = typingModal.querySelector("#typingTime");
  const wpmEl = typingModal.querySelector("#typingWpm");
  const accEl = typingModal.querySelector("#typingAccuracy");

  let currentWords = [];
  let currentIndex = 0;
  let timeLeft = 30;
  let timer = null;
  let correctChars = 0;
  let totalTyped = 0;
  let isRunning = false;
  let currentTyped = "";

  function generateWords() {
    currentWords = [];
    for (let i = 0; i < 50; i++) {
      currentWords.push(WORDS[Math.floor(Math.random() * WORDS.length)]);
    }
    currentIndex = 0;
    timeLeft = 30;
    correctChars = 0;
    totalTyped = 0;
    isRunning = true;
    currentTyped = "";
    renderCurrentWord();
    updateStats();
    hintEl.textContent = "Start typing to begin...";
  }

  function updateStats() {
    const minutes = (30 - timeLeft) / 60;
    const wpm = minutes > 0 ? Math.round((correctChars / 5) / minutes) : 0;
    const accuracy = totalTyped > 0 ? Math.round((correctChars / totalTyped) * 100) : 100;
    wpmEl.textContent = wpm;
    accEl.textContent = accuracy + "%";
    timeEl.textContent = timeLeft;
  }

  function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
      timeLeft--;
      updateStats();
      if (timeLeft <= 0) {
        clearInterval(timer);
        isRunning = false;
        hintEl.textContent = "Time's up! Press Enter to restart.";
      }
    }, 1000);
  }

  function handleTypingKey(e) {
    if (!typingModal.classList.contains("open")) return;

    if (e.key === "Escape") {
      typingModal.classList.remove("open");
      clearInterval(timer);
      return;
    }

    if (!isRunning && timeLeft === 30 && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      startTimer();
    }

    if (!isRunning) return;

    if (e.key === " ") {
      e.preventDefault();
      const currentWord = currentWords[currentIndex] || "";
      if (currentTyped.trim() === currentWord) {
        correctChars += currentWord.length;
      }
      currentTyped = "";
      currentIndex++;
      if (currentIndex >= currentWords.length) {
        generateWords();
        startTimer();
        return;
      }
      renderCurrentWord();
      updateStats();
      return;
    }

    if (e.key === "Backspace") {
      e.preventDefault();
      if (currentTyped.length > 0) {
        currentTyped = currentTyped.slice(0, -1);
      }
      renderCurrentWord();
      updateStats();
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (!isRunning || timeLeft <= 0) {
        clearInterval(timer);
        generateWords();
        startTimer();
      }
      return;
    }

    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      currentTyped += e.key;
      renderCurrentWord();
      updateStats();
    }
  }

  function renderCurrentWord() {
    let html = "";
    for (let i = 0; i < currentWords.length; i++) {
      let cls = "typing-word";
      if (i < currentIndex) {
        cls += " completed";
      } else if (i === currentIndex) {
        cls += " current";
        const word = currentWords[i];
        let wordHtml = "";
        for (let j = 0; j < word.length; j++) {
          if (j < currentTyped.length) {
            if (currentTyped[j] === word[j]) {
              wordHtml += `<span style="color:var(--text);text-shadow:0 0 8px rgba(255,255,255,0.5);">${word[j]}</span>`;
            } else {
              wordHtml += `<span style="color:#ef4444;text-decoration:underline;">${word[j]}</span>`;
            }
          } else {
            wordHtml += word[j];
          }
        }
        html += wordHtml + " ";
      } else {
        html += `<span class="${cls}">${currentWords[i]}</span> `;
      }
    }
    giantEl.innerHTML = html;

    const typed = currentTyped.trim();
    correctChars = 0;
    for (let i = 0; i < currentIndex; i++) {
      correctChars += currentWords[i].length;
    }
    for (let j = 0; j < Math.min(typed.length, currentWords[currentIndex].length); j++) {
      if (typed[j] === currentWords[currentIndex][j]) {
        correctChars++;
      }
    }
    totalTyped = currentIndex > 0 ? currentWords.slice(0, currentIndex).reduce((a, w) => a + w.length + 1, 0) - 1 + typed.length : typed.length;
  }

  document.addEventListener("keydown", handleTypingKey);

  document.querySelectorAll("[data-typing-test]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      typingModal.classList.add("open");
      generateWords();
      startTimer();
    });
  });

  typingModal.querySelector("[data-typing-close]").addEventListener("click", () => {
    typingModal.classList.remove("open");
    clearInterval(timer);
  });

  typingModal.addEventListener("click", (e) => {
    if (e.target === typingModal) {
      typingModal.classList.remove("open");
      clearInterval(timer);
    }
  });
})();

// ─── Community Chat ───
(function () {
  const chatModal = document.createElement("div");
  chatModal.className = "chat-modal";
  chatModal.innerHTML = `
    <div class="chat-card">
      <div class="chat-header">
        <div class="chat-header-icon">
          <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <div class="chat-header-info">
          <div class="chat-header-title">Community Chat</div>
          <div class="chat-header-status">● 12 online</div>
        </div>
        <button class="modal-close" data-chat-close aria-label="Close">
          <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="chat-messages" id="chatMessages"></div>
      <div class="chat-input-row">
        <input type="text" class="chat-input" id="chatInput" placeholder="Type a message..." autocomplete="off" />
        <button class="chat-send" id="chatSend">Send</button>
      </div>
    </div>
  `;
  document.body.appendChild(chatModal);

  const messagesContainer = chatModal.querySelector("#chatMessages");
  const chatInput = chatModal.querySelector("#chatInput");
  const chatSend = chatModal.querySelector("#chatSend");

  const botNames = ["Alex", "Sam", "Jordan", "Taylor", "Casey"];
  const botMessages = [
    "Hey everyone! 👋",
    "Anyone working on something cool?",
    "Just deployed my new project!",
    "Nice work on the portfolio!",
    "Does anyone use Laravel here?",
    "React is awesome for frontend",
    "Working on a new feature today",
    "Coffee break ☕",
    "Bug fixes are life",
    "Who's up for a code review?"
  ];

  function addMessage(text, isOwn = false, name = "You") {
    const msg = document.createElement("div");
    msg.className = `chat-message ${isOwn ? "own" : ""}`;
    const initial = name.charAt(0).toUpperCase();
    msg.innerHTML = `
      <div class="chat-avatar">${initial}</div>
      <div>
        <div class="chat-bubble">${escapeHtml(text)}</div>
        <div class="chat-meta">${name} · just now</div>
      </div>
    `;
    messagesContainer.appendChild(msg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function simulateChat() {
    const name = botNames[Math.floor(Math.random() * botNames.length)];
    const msg = botMessages[Math.floor(Math.random() * botMessages.length)];
    addMessage(msg, false, name);
  }

  function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    addMessage(text, true, "You");
    chatInput.value = "";
    setTimeout(simulateChat, 1000 + Math.random() * 2000);
  }

  chatSend.addEventListener("click", sendMessage);
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  document.querySelectorAll("[data-community-chat]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      chatModal.classList.add("open");
      chatInput.focus();
    });
  });

  chatModal.querySelector("[data-chat-close]").addEventListener("click", () => {
    chatModal.classList.remove("open");
  });

  chatModal.addEventListener("click", (e) => {
    if (e.target === chatModal) chatModal.classList.remove("open");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && chatModal.classList.contains("open")) {
      chatModal.classList.remove("open");
    }
  });
})();

// ─── Active nav link (arrow indicator for current page) ───
document.addEventListener('DOMContentLoaded', () => {
  const currentFile = location.pathname.split('/').pop() || 'index.html';

  document.querySelectorAll('.sidebar-nav a, .nav-group-items a').forEach(link => {
    const href = link.getAttribute('href');

    // skip placeholders, external links, mailto, and downloadable files like the resume
    if (!href || href === '#' || href.startsWith('http') || href.startsWith('mailto:')) return;
    if (link.hasAttribute('target')) return; // e.g. Resume PDF opens in a new tab

    const linkFile = href.split('/').pop();
    if (linkFile === currentFile) {
      link.classList.add('active');
    }
  });
});

// ─── Loading overlay ───
window.addEventListener('load', () => {
  const overlay = document.querySelector('.loading-overlay');
  if (overlay) {
    overlay.classList.add('is-loaded');
  }
});