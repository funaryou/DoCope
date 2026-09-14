/**
 * Sunsetホーム操作（モーダル・カードメニュー・紙色パレット）
 * デザイン元: doc/materials/design/deepseek-v4-flash-free/part2/screens/sunset/common.js
 * 登録・編集・削除は実バックエンド（/register /update/{id} /delete/{id}）へ送信します。
 */
(function () {
  "use strict";

  function closeAllModals() {
    document.querySelectorAll(".modal-back").forEach((m) => m.classList.remove("on"));
  }

  function openModal(id) {
    const m = document.getElementById("modal-" + id);
    if (m) m.classList.add("on");
  }

  function closeMenus() {
    document.querySelectorAll(".card-menu.open").forEach((m) => m.classList.remove("open"));
  }

  function setSelectedPaperColor(field, color) {
    const palette = document.querySelector('.color-palette[data-field="' + field + '"]');
    if (!palette) return;
    const normalized = String(color || "#fff1e6").toLowerCase();
    palette.querySelectorAll(".color-swatch").forEach((s) => {
      s.classList.toggle("on", s.dataset.color.toLowerCase() === normalized);
    });
    const form = palette.closest("form");
    const hidden = form ? form.querySelector("[data-color-input]") : null;
    if (hidden) hidden.value = color || "#fff1e6";
    const custom = palette.closest(".field") ? palette.closest(".field").querySelector(".color-custom") : null;
    if (custom && /^#[0-9a-f]{6}$/i.test(color || "")) custom.value = color;
  }

  document.querySelectorAll("[data-open-modal]").forEach((b) => {
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      closeMenus();
      const kind = b.dataset.openModal;
      if (kind === "edit") {
        const id = b.dataset.id;
        const form = document.getElementById("editForm");
        if (form && id) form.action = "/update/" + id;
        const nameEl = document.querySelector("[data-edit-name]");
        const pathEl = document.querySelector("[data-edit-path]");
        const descEl = document.querySelector("[data-edit-description]");
        if (nameEl) nameEl.value = b.dataset.name || "";
        if (pathEl) pathEl.value = b.dataset.path || "";
        if (descEl) descEl.value = b.dataset.description || "";
        setSelectedPaperColor("edit-paper", b.dataset.color || "#fff1e6");
      }
      if (kind === "delete") {
        const id = b.dataset.id;
        const form = document.getElementById("deleteForm");
        if (form && id) form.action = "/delete/" + id;
        document.querySelectorAll("[data-delete-name]").forEach((n) => {
          n.textContent = b.dataset.name || "プロジェクト";
        });
      }
      if (kind === "register") {
        setSelectedPaperColor("register-paper", "#fff1e6");
      }
      openModal(kind);
    });
  });

  document.querySelectorAll("[data-close-modal]").forEach((b) => {
    b.addEventListener("click", closeAllModals);
  });

  document.querySelectorAll(".modal-back").forEach((m) => {
    m.addEventListener("click", (e) => {
      if (e.target === m) closeAllModals();
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeAllModals();
      closeMenus();
    }
  });

  document.querySelectorAll(".card-menu-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const menu = btn.closest(".card-menu");
      const wasOpen = menu.classList.contains("open");
      closeMenus();
      if (!wasOpen) menu.classList.add("open");
    });
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".card-menu")) closeMenus();
  });

  // カード全体クリックでファイル閲覧へ（メニュー操作は除外）
  document.querySelectorAll(".card[data-id]").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest(".card-menu") || e.target.closest("[data-open-modal]")) return;
      window.location.href = "/workspace/" + card.dataset.id;
    });
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        window.location.href = "/workspace/" + card.dataset.id;
      }
    });
  });

  document.querySelectorAll(".color-palette").forEach((palette) => {
    palette.addEventListener("click", (e) => {
      const sw = e.target.closest(".color-swatch");
      if (!sw) return;
      palette.querySelectorAll(".color-swatch").forEach((s) => s.classList.remove("on"));
      sw.classList.add("on");
      const form = palette.closest("form");
      const hidden = form ? form.querySelector("[data-color-input]") : null;
      if (hidden) hidden.value = sw.dataset.color;
      const custom = palette.closest(".field") ? palette.closest(".field").querySelector(".color-custom") : null;
      if (custom) custom.value = sw.dataset.color;
    });
  });

  document.querySelectorAll(".color-custom").forEach((input) => {
    input.addEventListener("input", (e) => {
      const field = e.target.closest(".field");
      if (!field) return;
      const palette = field.querySelector(".color-palette");
      const form = e.target.closest("form");
      const hidden = form ? form.querySelector("[data-color-input]") : null;
      if (hidden) hidden.value = e.target.value;
      if (!palette) return;
      palette.querySelectorAll(".color-swatch").forEach((s) => s.classList.remove("on"));
      const match = palette.querySelector('[data-color="' + e.target.value.toLowerCase() + '"]');
      if (match) match.classList.add("on");
    });
  });

  // カード文字色の自動切替: --card-color のRGB平均が白寄りなら黒系、黒寄りなら白系を適用
  var DARK_INK = "#2c160e";
  var LIGHT_INK = "#fff8f6";

  function parseHexColor(hex) {
    var h = String(hex || "").trim();
    if (/^#[0-9a-fA-F]{3}$/.test(h)) {
      h = "#" + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
    }
    var m = /^#([0-9a-fA-F]{6})$/.exec(h);
    if (!m) return null;
    return {
      r: parseInt(m[1].slice(0, 2), 16),
      g: parseInt(m[1].slice(2, 4), 16),
      b: parseInt(m[1].slice(4, 6), 16)
    };
  }

  function pickInk(bgHex) {
    var rgb = parseHexColor(bgHex);
    if (!rgb) return DARK_INK;
    var avg = (rgb.r + rgb.g + rgb.b) / 3;
    return avg >= 128 ? DARK_INK : LIGHT_INK;
  }

  function applyCardInk() {
    document.querySelectorAll(".card[data-card], .card[data-id]").forEach((card) => {
      var bg = card.dataset.color
        || (card.style.getPropertyValue("--card-color") || "").trim()
        || "#fff1e6";
      card.style.setProperty("--card-ink", pickInk(bg));
    });
  }

  applyCardInk();
})();
