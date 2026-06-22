(function () {
  "use strict";

  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const el = (tag, cls) => { const n = document.createElement(tag); if (cls) n.className = cls; return n; };

  const Auth = {
    token: () => { try { return localStorage.getItem("vm_token"); } catch (e) { return null; } },
    set: (token, email) => {
      try { localStorage.setItem("vm_token", token); if (email) localStorage.setItem("vm_email", email); } catch (e) {}
    },
    clear: () => { try { localStorage.removeItem("vm_token"); localStorage.removeItem("vm_email"); } catch (e) {} }
  };

  function logout() { Auth.clear(); location.replace("/"); }

  async function api(path, opts) {
    opts = opts || {};
    const headers = opts.headers || {};
    const token = Auth.token();
    if (token) headers["Authorization"] = "Bearer " + token;
    let res;
    try {
      res = await fetch(path, Object.assign({}, opts, { headers }));
    } catch (e) {
      return { ok: false, status: 0, data: null };
    }
    if (res.status === 401 || res.status === 403) { logout(); return { ok: false, status: res.status, data: null }; }
    let data = null;
    try { data = await res.json(); } catch (e) {}
    return { ok: res.ok, status: res.status, data };
  }

  let toastTimer;
  function toast(msg, isError) {
    const node = $("#toast");
    if (!node) return;
    node.textContent = msg;
    node.classList.toggle("toast--err", !!isError);
    node.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove("is-on"), 2600);
  }

  function seededBars(seed, count) {
    let h = 2166136261 >>> 0;
    const s = String(seed);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    const out = [];
    for (let i = 0; i < count; i++) {
      h ^= h << 13; h >>>= 0; h ^= h >> 17; h ^= h << 5; h >>>= 0;
      out.push(0.18 + (h % 1000) / 1000 * 0.82);
    }
    return out;
  }
  function drawWave(container, heights) {
    container.textContent = "";
    heights.forEach((v) => {
      const bar = el("span", "bar");
      bar.style.height = Math.round(v * 100) + "%";
      container.appendChild(bar);
    });
  }
  function fillStaticWaves() {
    $$("[data-bars]").forEach((node) => {
      const key = node.getAttribute("data-bars");
      const count = key === "busy" ? 9 : 14;
      drawWave(node, seededBars("vm-" + key, count));
    });
  }

  function fmtDate(iso) {
    const d = iso ? new Date(iso) : new Date();
    if (isNaN(d.getTime())) return "";
    try {
      return new Intl.DateTimeFormat(window.vmLocale(), { dateStyle: "medium", timeStyle: "short" }).format(d);
    } catch (e) { return d.toLocaleString(); }
  }
  function titleFromTranscript(text) {
    const clean = (text || "").replace(/\s+/g, " ").trim();
    if (!clean) return t("note_untitled");
    const words = clean.split(" ");
    return words.slice(0, 7).join(" ") + (words.length > 7 ? "…" : "");
  }

  function initLogin() {
    if (Auth.token()) { location.replace("/app"); return; }

    let mode = new URLSearchParams(location.search).get("mode") === "signup" ? "signup" : "signin";
    const form = $("#authForm");
    const errorBox = $("#authError");
    const submitLabel = $("#authSubmitLabel");
    const switchText = $("#switchText");
    const switchLink = $("#switchLink");
    const tabSignin = $("#tabSignin");
    const tabSignup = $("#tabSignup");

    function showError(msg) { errorBox.textContent = msg; errorBox.classList.add("is-visible"); }
    function clearError() { errorBox.classList.remove("is-visible"); }

    function setMode(next) {
      mode = next;
      const isSignup = mode === "signup";
      tabSignin.classList.toggle("is-active", !isSignup);
      tabSignup.classList.toggle("is-active", isSignup);
      submitLabel.setAttribute("data-i18n", isSignup ? "auth_signup" : "auth_signin");
      submitLabel.textContent = t(isSignup ? "auth_signup" : "auth_signin");
      switchText.setAttribute("data-i18n", isSignup ? "auth_have_account" : "auth_no_account");
      switchText.textContent = t(isSignup ? "auth_have_account" : "auth_no_account");
      switchLink.setAttribute("data-i18n", isSignup ? "auth_switch_signin" : "auth_switch_signup");
      switchLink.textContent = t(isSignup ? "auth_switch_signin" : "auth_switch_signup");
      $("#password").setAttribute("autocomplete", isSignup ? "new-password" : "current-password");
      clearError();
    }

    tabSignin.addEventListener("click", () => setMode("signin"));
    tabSignup.addEventListener("click", () => setMode("signup"));
    switchLink.addEventListener("click", (e) => { e.preventDefault(); setMode(mode === "signin" ? "signup" : "signin"); });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearError();
      const email = $("#email").value.trim();
      const password = $("#password").value;
      if (!email || !password) { showError(t("err_fill_fields")); return; }

      const submitBtn = $("#authSubmit");
      submitBtn.disabled = true;
      try {
        if (mode === "signup") {
          const reg = await api("/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
          });
          if (!reg.ok) { showError((reg.data && reg.data.detail) || t("err_login_failed")); return; }
        }
        const res = await api("/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });
        if (res.status === 0) { showError(t("err_network")); return; }
        if (!res.ok || !res.data || !res.data.access_token) {
          showError((res.data && res.data.detail) || t("err_login_failed")); return;
        }
        Auth.set(res.data.access_token, email);
        location.replace("/app");
      } finally {
        submitBtn.disabled = false;
      }
    });

    setMode(mode);
  }

  function initApp() {
    if (!Auth.token()) { location.replace("/login"); return; }

    const state = { notes: [], filter: { from: "", to: "" }, pollers: new Map() };

    $("#logoutBtn").addEventListener("click", logout);

    const list = $("#notesList");
    const emptyState = $("#emptyState");
    const countEl = $("#noteCount");

    function chevron() {
      const ns = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(ns, "svg");
      svg.setAttribute("class", "note__chev");
      svg.setAttribute("width", "16"); svg.setAttribute("height", "16");
      svg.setAttribute("viewBox", "0 0 16 16"); svg.setAttribute("fill", "none");
      const p = document.createElementNS(ns, "path");
      p.setAttribute("d", "M6 3l5 5-5 5"); p.setAttribute("stroke", "currentColor");
      p.setAttribute("stroke-width", "1.6"); p.setAttribute("stroke-linecap", "round");
      p.setAttribute("stroke-linejoin", "round");
      svg.appendChild(p);
      return svg;
    }

    function noteCard(note) {
      const li = el("li", "note");
      li.dataset.id = note.id;
      const status = note.status || "done";

      const head = el("button", "note__head");
      head.type = "button";
      head.setAttribute("aria-expanded", "false");

      const wave = el("span", "wave wave--mini note__wave");
      drawWave(wave, seededBars(String(note.id) + (note.filename || ""), 14));

      const body = el("span", "note__body");
      const title = el("span", "note__title");
      const summary = el("span", "note__summary");
      title.dir = "auto";
      summary.dir = "auto";
      body.append(title, summary);

      const meta = el("span", "note__meta");
      meta.textContent = fmtDate(note.created_at);
      head.append(wave, body, meta);

      if (status === "processing") {
        li.classList.add("note--processing");
        title.textContent = t("status_processing");
        const spin = el("span", "note__spinner spin");
        head.appendChild(spin);
        li.appendChild(head);
        return li;
      }

      if (status === "error") {
        li.classList.add("note--error");
        title.textContent = t("status_error");
        head.appendChild(chevron());
        const detail = el("div", "note__detail");
        const errText = el("div", "note__error-text");
        errText.textContent = note.error || t("status_error");
        detail.appendChild(errText);
        detail.appendChild(createDeleteButton(note));
        wireExpand(li, head);
        li.append(head, detail);
        return li;
      }

      title.textContent = titleFromTranscript(note.transcript);
      summary.textContent = note.summary || "";
      head.appendChild(chevron());

      const detail = el("div", "note__detail");

      let audio = null;
      if (note.filename) {
        audio = el("audio", "note__player");
        audio.controls = true; audio.preload = "none";
        detail.appendChild(audio);
      }

      const sumLabel = el("div", "field-label"); sumLabel.textContent = t("label_summary");
      const sumText = el("div", "note__text note__text--summary"); sumText.textContent = note.summary || "—";
      sumText.dir = "auto";
      const trLabel = el("div", "field-label"); trLabel.textContent = t("label_transcript");
      const trText = el("div", "note__text"); trText.textContent = note.transcript || "—";
      trText.dir = "auto";

      const copyBtn = el("button", "btn btn--sm");
      copyBtn.type = "button"; copyBtn.textContent = t("note_copy");
      copyBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        try { await navigator.clipboard.writeText(note.transcript || ""); toast(t("note_copied")); } catch (err) {}
      });
      const actions = el("div", "note__actions");
      actions.append(copyBtn, createDeleteButton(note));

      detail.append(sumLabel, sumText, trLabel, trText, actions);

      let audioLoaded = false;
      wireExpand(li, head, () => {
        if (!li.classList.contains("is-open")) return;
        if (audio && !audioLoaded) {
          audioLoaded = true;
          fetch("/notes/" + note.id + "/audio", { headers: { Authorization: "Bearer " + Auth.token() } })
            .then((r) => (r.ok ? r.blob() : null))
            .then((blob) => { if (blob) audio.src = URL.createObjectURL(blob); })
            .catch(() => {});
        }
      });

      li.append(head, detail);
      return li;
    }

    function createDeleteButton(note) {
      const btn = el("button", "btn btn--sm btn--danger");
      btn.type = "button"; btn.textContent = t("note_delete");
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!window.confirm(t("confirm_delete"))) return;
        const res = await api("/notes/" + note.id, { method: "DELETE" });
        if (!res.ok && res.status !== 204) { toast(t("err_delete"), true); return; }
        stopPolling(note.id);
        state.notes = state.notes.filter((n) => n.id !== note.id);
        removeCard(note.id);
        toast(t("toast_deleted"));
      });
      return btn;
    }

    function wireExpand(li, head, onToggle) {
      head.addEventListener("click", () => {
        const open = li.classList.toggle("is-open");
        head.setAttribute("aria-expanded", String(open));
        if (onToggle) onToggle();
      });
    }

    function updateCount() {
      const n = state.notes.length;
      emptyState.classList.toggle("is-hidden", n > 0);
      countEl.textContent = !n ? "" : (n === 1 ? t("count_one") : t("count_many", { n }));
    }
    function renderAll() {
      list.textContent = "";
      state.notes.forEach((n) => list.appendChild(noteCard(n)));
      updateCount();
      state.notes.forEach((n) => { if ((n.status || "done") === "processing") startPolling(n.id); });
    }
    function prependCard(note) {
      emptyState.classList.add("is-hidden");
      list.insertBefore(noteCard(note), list.firstChild);
    }
    function replaceCard(note) {
      const old = list.querySelector('.note[data-id="' + note.id + '"]');
      if (old) old.replaceWith(noteCard(note));
    }
    function removeCard(id) {
      const old = list.querySelector('.note[data-id="' + id + '"]');
      if (old) old.remove();
      updateCount();
    }

    function startPolling(id) {
      if (state.pollers.has(id)) return;
      const tick = async () => {
        const res = await api("/notes/" + id);
        if (!res.ok || !res.data) { stopPolling(id); return; }
        const note = res.data;
        const idx = state.notes.findIndex((n) => n.id === id);
        if (idx >= 0) state.notes[idx] = note;
        if (note.status === "processing") {
          state.pollers.set(id, setTimeout(tick, 3000));
        } else {
          stopPolling(id);
          replaceCard(note);
        }
      };
      state.pollers.set(id, setTimeout(tick, 3000));
    }
    function stopPolling(id) {
      const tmr = state.pollers.get(id);
      if (tmr) clearTimeout(tmr);
      state.pollers.delete(id);
    }

    async function loadNotes() {
      const params = new URLSearchParams();
      if (state.filter.from) params.set("from_date", state.filter.from + "T00:00:00");
      if (state.filter.to) params.set("to_date", state.filter.to + "T23:59:59");
      const qs = params.toString();
      const res = await api("/notes/" + (qs ? "?" + qs : ""));
      if (!res.ok) { if (res.status !== 401 && res.status !== 403) toast(t("err_load"), true); return; }
      state.pollers.forEach((_, id) => stopPolling(id));
      state.notes = Array.isArray(res.data) ? res.data : [];
      renderAll();
    }

    const fromInput = $("#fromDate");
    const toInput = $("#toDate");
    const clearBtn = $("#clearFilter");
    function syncClearVisibility() {
      clearBtn.classList.toggle("is-hidden", !(state.filter.from || state.filter.to));
    }
    function applyDateFilter() {
      state.filter.from = fromInput.value;
      state.filter.to = toInput.value;
      syncClearVisibility();
      loadNotes();
    }
    fromInput.addEventListener("change", applyDateFilter);
    toInput.addEventListener("change", applyDateFilter);
    clearBtn.addEventListener("click", () => {
      fromInput.value = ""; toInput.value = "";
      state.filter = { from: "", to: "" };
      syncClearVisibility();
      loadNotes();
    });

    const composer = $("#composer");
    async function uploadBlob(file) {
      composer.classList.add("is-busy");
      const fd = new FormData();
      fd.append("file", file);
      const res = await api("/notes/upload", { method: "POST", body: fd });
      composer.classList.remove("is-busy");
      if (!res.ok || !res.data) {
        toast((res.data && res.data.detail) || t("err_upload"), true);
        return;
      }
      const note = res.data;
      state.notes.unshift(note);
      prependCard(note);
      updateCount();
      if (note.status === "processing") startPolling(note.id);
      toast(t("toast_saved"));
    }

    const dropzone = $("#dropzone");
    const fileInput = $("#fileInput");
    const dzText = $("#dzText");
    fileInput.addEventListener("change", () => {
      if (fileInput.files && fileInput.files[0]) { uploadBlob(fileInput.files[0]); fileInput.value = ""; }
    });
    ["dragenter", "dragover"].forEach((evt) =>
      dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add("is-drag"); dzText.textContent = t("upload_release"); }));
    ["dragleave", "dragend"].forEach((evt) =>
      dropzone.addEventListener(evt, () => { dropzone.classList.remove("is-drag"); dzText.textContent = t("upload_drop"); }));
    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("is-drag");
      dzText.textContent = t("upload_drop");
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) uploadBlob(f);
    });

    const recBtn = $("#recBtn");
    const recLabel = $("#recLabel");
    const recWave = $("#recWave");
    const recTimer = $("#recTimer");
    let mediaRecorder = null;
    let chunks = [];
    let micStream = null;
    let timerId = null;
    let startedAt = 0;

    function tickTimer() {
      const s = Math.floor((Date.now() - startedAt) / 1000);
      recTimer.textContent = Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
    }

    function setRecordingUI(on) {
      recBtn.dataset.state = on ? "recording" : "idle";
      recLabel.textContent = t(on ? "record_stop" : "record_start");
      recWave.classList.toggle("is-hidden", !on);
      recTimer.classList.toggle("is-hidden", !on);
    }

    async function startRecording() {
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e) {
        toast(t("err_mic"), true);
        return;
      }
      chunks = [];
      mediaRecorder = new MediaRecorder(micStream);
      mediaRecorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      mediaRecorder.onstop = onRecordingStop;
      mediaRecorder.start();
      startedAt = Date.now();
      tickTimer();
      timerId = setInterval(tickTimer, 500);
      setRecordingUI(true);
    }

    function onRecordingStop() {
      clearInterval(timerId);
      micStream.getTracks().forEach((tr) => tr.stop());
      setRecordingUI(false);
      recTimer.textContent = "0:00";
      const type = mediaRecorder.mimeType || "audio/webm";
      const ext = type.indexOf("ogg") >= 0 ? "ogg" : "webm";
      const blob = new Blob(chunks, { type });
      if (!blob.size) return;
      const file = new File([blob], "recording-" + Date.now() + "." + ext, { type });
      uploadBlob(file);
    }

    recBtn.addEventListener("click", () => {
      if (mediaRecorder && mediaRecorder.state === "recording") mediaRecorder.stop();
      else startRecording();
    });

    document.addEventListener("vm:langchange", () => {
      renderAll();
      dzText.textContent = t("upload_drop");
    });

    loadNotes();
  }

  function initLanding() {
    const title = $("#pvTitle");
    const summary = $("#pvSummary");
    const duration = $("#pvDur");
    if (!title || !summary || !duration) return;

    const durations = ["01:24", "00:47", "00:32"];
    let index = 0;
    const renderPreview = () => {
      const key = index + 1;
      title.textContent = t("preview_title_" + key);
      summary.textContent = t("preview_summary_" + key);
      duration.textContent = durations[index];
    };

    renderPreview();
    document.addEventListener("vm:langchange", renderPreview);
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const card = $(".product-preview");
      setInterval(() => {
        if (card) card.classList.add("is-fading");
        setTimeout(() => {
          index = (index + 1) % durations.length;
          renderPreview();
          if (card) card.classList.remove("is-fading");
        }, 150);
      }, 1000);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    fillStaticWaves();
    const page = document.body.getAttribute("data-page");
    if (page === "login") initLogin();
    else if (page === "app") initApp();
    else if (page === "landing") initLanding();
  });
})();
