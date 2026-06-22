(function () {
  "use strict";

  const STRINGS = {
    en: {
      app_name: "VoiceMate",
      auth_tagline: "Speak it, we'll write it down",

      auth_signin: "Sign in",
      auth_signup: "Create account",
      auth_email: "Email",
      auth_password: "Password",
      auth_email_ph: "ahmed@example.com",
      auth_password_ph: "••••••••",
      auth_no_account: "New here?",
      auth_have_account: "Already have an account?",
      auth_switch_signup: "Create an account",
      auth_switch_signin: "Sign in instead",
      err_fill_fields: "Please enter your email and password",
      err_login_failed: "Couldn't sign you in — check your details",
      err_network: "Network error — is the server running?",

      nav_logout: "Log out",

      dash_title: "Your notes",
      dash_subtitle: "Record a thought or drop an audio file — we'll transcribe and summarize it",
      record_start: "Record",
      record_stop: "Stop",
      composer_or: "or",
      upload_drop: "Drop an audio file, or click to choose",
      upload_release: "Release to upload",
      processing: "Transcribing your audio…",
      toast_saved: "Note saved",
      err_upload: "Upload failed — please try again",
      err_audio_too_short: "Audio must be at least 5 seconds",
      err_mic: "Couldn't access the microphone",

      filter_from: "From",
      filter_to: "To",
      filter_clear: "Clear",
      count_one: "1 note",
      count_many: "{n} notes",

      note_untitled: "Untitled note",
      label_summary: "Summary",
      label_transcript: "Transcript",
      note_copy: "Copy transcript",
      note_copied: "Copied",
      note_delete: "Delete",
      confirm_delete: "Delete this note? This can't be undone",
      toast_deleted: "Note deleted",
      err_delete: "Couldn't delete the note",

      status_processing: "Transcribing…",
      status_error: "Couldn't process this audio",

      empty_title: "No notes yet",
      empty_body: "Hit record or drop a file above to capture your first voice note",
      err_load: "Couldn't load your notes",

      land_nav_signin: "Sign in",
      land_chip: "Voice notes, transcribed",
      land_hero_title: "Turn spoken thoughts into clear notes",
      land_hero_sub: "Record a thought or upload audio. VoiceMate turns it into a clear, organized note.",
      land_cta_start: "Get started",
      land_cta_signin: "I have an account",
      feat1_t: "Record in your browser",
      feat1_d: "One tap to capture a thought — nothing to install",
      feat3_t: "Private by design",
      feat3_d: "Whisper runs on your server, keeping recordings within your setup.",
      feat4_t: "Arabic & English",
      feat4_d: "Full right-to-left support with an instant language switch",

      cta_title: "Start your first voice note",
      cta_sub: "Create a free account and keep every thought in one place.",
      preview_eyebrow: "A note, ready to review",
      preview_status: "Transcribed",
      preview_summary_label: "Summary",
      preview_title_1: "Team standup",
      preview_summary_1: "Development is on track, the login screen ships Thursday, and QA starts Friday",
      preview_title_2: "Client call",
      preview_summary_2: "They need the report by month-end and want a short demo next week",
      preview_title_3: "Voice memo",
      preview_summary_3: "Pick up groceries after work and book the dentist for Thursday"
    },

    ar: {
      app_name: "فويس‑ميت",
      auth_tagline: "قول واحنا نكتبهالك",

      auth_signin: "تسجيل الدخول",
      auth_signup: "اعمل حساب",
      auth_email: "الإيميل",
      auth_password: "كلمة السر",
      auth_email_ph: "ahmed@example.com",
      auth_password_ph: "••••••••",
      auth_no_account: "لسه ماعندكش حساب؟",
      auth_have_account: "عندك حساب قبل كده؟",
      auth_switch_signup: "اعمل حساب جديد",
      auth_switch_signin: "سجل دخول",
      err_fill_fields: "اكتب الإيميل وكلمة السر الأول",
      err_login_failed: "بياناتك مش مظبوطة جرب تاني",
      err_network: "في مشكلة في الاتصال اتأكد إن السيرفر شغال",

      nav_logout: "خروج",

      dash_title: "ملاحظاتك",
      dash_subtitle: "سجل فكرة أو ارفع ملف صوتي واحنا هنحوله نص ونلخصهولك",
      record_start: "سجل",
      record_stop: "وقف",
      composer_or: "أو",
      upload_drop: "اسحب ملف صوتي هنا أو دوس عشان تختار",
      upload_release: "سيبه هنا",
      processing: "بنحول صوتك لنص…",
      toast_saved: "اتحفظت الملاحظة",
      err_upload: "الرفع مانفعش جرب تاني",
      err_audio_too_short: "الصوت لازم يكون 5 ثواني على الاقل",
      err_mic: "مش عارفين نوصل للمايك",

      filter_from: "من",
      filter_to: "لحد",
      filter_clear: "مسح",
      count_one: "ملاحظة واحدة",
      count_many: "{n} ملاحظة",

      note_untitled: "ملاحظة من غير عنوان",
      label_summary: "الملخص",
      label_transcript: "النص الكامل",
      note_copy: "انسخ النص",
      note_copied: "اتنسخ",
      note_delete: "امسح",
      confirm_delete: "هتمسح الملاحظة دي؟ مفيش رجوع",
      toast_deleted: "اتمسحت الملاحظة",
      err_delete: "مش عارفين نمسح الملاحظة",

      status_processing: "بنحولها لنص…",
      status_error: "مش عارفين نعالج الصوت ده",

      empty_title: "لسه مفيش ملاحظات",
      empty_body: "دوس سجل أو ارفع ملف من فوق وابدأ أول ملاحظة ليك",
      err_load: "مش عارفين نحمل ملاحظاتك",

      land_nav_signin: "تسجيل الدخول",
      land_chip: "من الصوت للنص في ثواني",
      land_hero_title: "حول كلامك إلى ملاحظات واضحة",
      land_hero_sub: "سجل فكرة أو ارفع ملف صوتي وvoicemate  هيحوله لملاحظة مرتبة",
      land_cta_start: "ابدأ دلوقتي",
      land_cta_signin: "عندي حساب",

      feat1_t: "سجل من المتصفح",
      feat1_d: "دوسة واحدة تلتقط بيها فكرتك من غير ما تنزل أي تطبيق",
      feat3_t: "خصوصيتك أولا",
      feat3_d: "Whisper بيشتغل على السيرفر بتاعك والتسجيلات بتفضل داخل إعداداتك.",
      feat4_t: "عربي وإنجليزي",
      feat4_d: "واجهة عربي كاملة وتبديل بين اللغتين في ثانية",

      cta_title: "ابدأ أول ملاحظة بصوتك",
      cta_sub: "اعمل حساب مجاني واحفظ أفكارك في مكان واحد.",
      preview_eyebrow: "ملاحظة جاهزة للمراجعة",
      preview_status: "اتحولت لنص",
      preview_summary_label: "الملخص",
      preview_title_1: "اجتماع الفريق",
      preview_summary_1: "التطوير ماشي تمام شاشة الدخول هتنزل الخميس والاختبار يبدأ الجمعة",
      preview_title_2: "مكالمة مع عميل",
      preview_summary_2: "عايزين التقرير آخر الشهر وعايزين عرض سريع الأسبوع الجاي",
      preview_title_3: "مذكرة صوتية",
      preview_summary_3: "اجيب طلبات البيت بعد الشغل واحجز ميعاد العيادة الخميس"
    }
  };

  function pickInitialLang() {
    try {
      const saved = localStorage.getItem("vm_lang");
      if (saved === "ar" || saved === "en") return saved;
    } catch (e) {}
    return (navigator.language || "en").toLowerCase().indexOf("ar") === 0 ? "ar" : "en";
  }

  let current = pickInitialLang();

  window.t = function (key, vars) {
    let s = (STRINGS[current] && STRINGS[current][key]) || (STRINGS.en[key] || key);
    if (vars) for (const k in vars) s = s.replace("{" + k + "}", vars[k]);
    return s;
  };
  window.vmLang = function () { return current; };
  window.vmLocale = function () { return current === "ar" ? "ar-EG" : "en-US"; };

  function apply(lang) {
    current = lang;
    const dict = STRINGS[lang] || STRINGS.en;
    const root = document.documentElement;
    root.lang = lang;
    root.dir = lang === "ar" ? "rtl" : "ltr";

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      const v = dict[el.getAttribute("data-i18n")];
      if (v != null) el.textContent = v;
    });
    document.querySelectorAll("[data-i18n-ph]").forEach(function (el) {
      const v = dict[el.getAttribute("data-i18n-ph")];
      if (v != null) el.setAttribute("placeholder", v);
    });

    const toggle = document.getElementById("langToggle");
    if (toggle) {
      const label = toggle.querySelector(".lang-toggle__label") || toggle;
      label.textContent = lang === "ar" ? "English" : "عربي";
    }

    document.dispatchEvent(new CustomEvent("vm:langchange", { detail: { lang: lang } }));
  }

  window.vmSetLang = function (lang) {
    try { localStorage.setItem("vm_lang", lang); } catch (e) {}
    apply(lang);
  };

  document.addEventListener("DOMContentLoaded", function () {
    apply(current);
    const toggle = document.getElementById("langToggle");
    if (toggle) {
      toggle.addEventListener("click", function () {
        window.vmSetLang(current === "ar" ? "en" : "ar");
      });
    }
  });
})();
