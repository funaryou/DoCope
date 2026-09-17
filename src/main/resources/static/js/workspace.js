/**
 * ワークスペースのツリー描画・ファイルプレビュー制御（Signal Atlas）
 * 拡張子定義は preview-config.js（window.PreviewConfig）を参照します。
 * projectId は workspace.html 側の inline script で
 * window.WORKSPACE_PROJECT_ID として注入されます。
 * デザイン元: doc/materials/design/deepseek-v4-flash-free/part2/screens/sunset/
 * SVGは設計書の上下同時表示ではなく、ユーザー指示により
 * 描画表示／コード表示のボタン切替とします。
 */
(function () {
  "use strict";

  const projectId = window.WORKSPACE_PROJECT_ID;
  let currentPath = "";
  let currentFile = null;
  const stateKey = `documents-bridge:workspace:${projectId}`;
  const defaultTreeSettings = { showHidden: false, showSystem: false };
  let workspaceState = loadWorkspaceState();

  function loadWorkspaceState() {
    try {
      const saved = JSON.parse(localStorage.getItem(stateKey) || "{}");
      return {
        file: saved.file || null,
        folders: Array.isArray(saved.folders) ? saved.folders : [],
        settings: { ...defaultTreeSettings, ...(saved.settings || {}) }
      };
    } catch (e) {
      return { file: null, folders: [], settings: { ...defaultTreeSettings } };
    }
  }

  function saveWorkspaceState() {
    try {
      localStorage.setItem(stateKey, JSON.stringify(workspaceState));
    } catch (e) {
      // プライベートブラウジング等でlocalStorageが使えなくても閲覧自体は継続する。
    }
  }

  function extOf(path) {
    const i = path.lastIndexOf(".");
    return i < 0 ? "" : path.slice(i + 1).toLowerCase();
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function baseName(path) {
    const i = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
    return i < 0 ? path : path.slice(i + 1);
  }

  function fileHead(name, path) {
    return '<div class="file-head"><h2>' + escapeHtml(name) + '</h2>'
      + '<div class="crumbs">' + escapeHtml(path) + '</div></div>';
  }

  async function loadChildren(path) {
    const params = new URLSearchParams({
      showHidden: String(workspaceState.settings.showHidden),
      showSystem: String(workspaceState.settings.showSystem)
    });
    if (path) params.set("path", path);
    const url = `/tree/${projectId}?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`ツリー取得に失敗しました（HTTP ${res.status}）`);
    }
    return res.json();
  }

  function showTreeMessage(container, message, tone) {
    container.innerHTML = "";
    const messageEl = document.createElement("p");
    messageEl.className = "tree-message" + (tone ? " " + tone : "");
    messageEl.textContent = message;
    container.appendChild(messageEl);
  }

  async function renderTree(path, container) {
    showTreeMessage(container, "フォルダを読み込んでいます…");
    const children = await loadChildren(path);
    container.innerHTML = "";
    if (children.length === 0) {
      showTreeMessage(container, "表示できる項目はありません。", "empty");
      return;
    }
    for (const node of children) {
      if (node.directory) {
        const wrapper = document.createElement("div");
        wrapper.className = "tree-node";
        const row = document.createElement("div");
        row.className = "tree-row folder";
        const tw = document.createElement("span");
        tw.className = "tw";
        tw.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>';
        const folderIcon = document.createElement("span");
        folderIcon.className = "folder-icon";
        folderIcon.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 6.5h6l2 2h9v9.5a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2v-9.5a2 2 0 0 1 2-2Z"/><path d="M2.5 10h18"/></svg>';
        const tname = document.createElement("span");
        tname.className = "tname";
        tname.textContent = node.name;
        row.dataset.path = node.relativePath;
        row.setAttribute("aria-expanded", "false");
        row.appendChild(tw);
        row.appendChild(folderIcon);
        row.appendChild(tname);
        const sub = document.createElement("div");
        sub.className = "tree-children";
        sub.hidden = true;
        row.addEventListener("click", async () => {
          const open = wrapper.classList.toggle("open");
          row.setAttribute("aria-expanded", String(open));
          if (open && !sub.dataset.loaded) {
            currentPath = node.relativePath;
            try {
              await renderTree(node.relativePath, sub);
              sub.dataset.loaded = "1";
            } catch (error) {
              showTreeMessage(sub, error.message || "フォルダを読み込めませんでした。", "error");
            }
          }
          sub.hidden = !open;
          if (open) {
            if (!workspaceState.folders.includes(node.relativePath)) workspaceState.folders.push(node.relativePath);
          } else {
            workspaceState.folders = workspaceState.folders.filter((folder) => folder !== node.relativePath && !folder.startsWith(node.relativePath + "/"));
          }
          saveWorkspaceState();
        });
        wrapper.appendChild(row);
        wrapper.appendChild(sub);
        container.appendChild(wrapper);
      } else {
        const row = document.createElement("div");
        row.className = "tree-row file";
        row.dataset.path = node.relativePath;
        const tw = document.createElement("span");
        tw.className = "tw";
        const tname = document.createElement("span");
        tname.className = "tname";
        tname.textContent = node.name;
        const ext = document.createElement("span");
        ext.className = "ext";
        ext.textContent = extOf(node.relativePath) || "-";
        row.appendChild(tw);
        row.appendChild(tname);
        row.appendChild(ext);
        row.addEventListener("click", () => showFile(node).catch((error) => showViewerMessage(error.message || "ファイルを読み込めませんでした。", "error")));
        container.appendChild(row);
      }
    }
  }

  function showViewerMessage(message, tone) {
    const body = document.getElementById("viewerBody");
    if (!body) return;
    body.innerHTML = '<div class="viewer-message ' + (tone || "") + '"><span class="viewer-message-mark">!</span><p>' + escapeHtml(message) + '</p></div>';
  }

  function setModes(modes) {
    const bar = document.getElementById("vtModes");
    if (!bar) return;
    if (modes && modes.length > 1) {
      bar.style.display = "flex";
    } else {
      bar.style.display = "none";
    }
    renderMode((modes && modes[0]) || "render");
  }

  function renderMode(mode) {
    document.querySelectorAll("#vtModes button").forEach(function (b) {
      b.classList.toggle("on", b.dataset.mode === mode);
    });
    const body = document.getElementById("viewerBody");
    if (!body) return;
    Array.prototype.forEach.call(body.children || [], function (n) {
      if (n.dataset && n.dataset.render !== undefined) {
        n.hidden = mode !== "render";
      } else if (n.dataset && n.dataset.code !== undefined) {
        n.hidden = mode !== "code";
      }
    });
  }

  function parseCsv(text, delimiter) {
    return text.split(/\r?\n/).filter((line) => line.length > 0).map((line) => line.split(delimiter));
  }

  function csvTableHtml(name, path, text, delimiter) {
    const rows = parseCsv(text, delimiter);
    if (rows.length === 0) {
      return fileHead(name, path) + '<div class="source"><pre><code>' + escapeHtml(text) + "</code></pre></div>";
    }
    let out = fileHead(name, path) + '<table class="csv-table"><thead><tr>';
    for (const c of rows[0]) {
      out += "<th>" + escapeHtml(c) + "</th>";
    }
    out += "</tr></thead><tbody>";
    for (let i = 1; i < rows.length; i++) {
      out += "<tr>";
      for (const c of rows[i]) {
        out += "<td>" + escapeHtml(c) + "</td>";
      }
      out += "</tr>";
    }
    return out + "</tbody></table>";
  }

  async function showFile(node) {
    const relPath = node.relativePath;
    const ext = extOf(relPath);
    const name = baseName(relPath);
    const cfg = window.PreviewConfig || {};
    const TEXT_EXTS = cfg.TEXT_EXTS || [];
    const IMAGE_EXTS = cfg.IMAGE_EXTS || [];
    const PDF_EXT = cfg.PDF_EXT || "pdf";
    const VIDEO_EXTS = cfg.VIDEO_EXTS || [];
    const AUDIO_EXTS = cfg.AUDIO_EXTS || [];
    const MARKDOWN_EXTS = cfg.MARKDOWN_EXTS || ["md", "markdown"];
    const CSV_EXTS = cfg.CSV_EXTS || ["csv", "tsv"];
    const SVG_EXT = cfg.SVG_EXT || "svg";

    document.querySelectorAll(".tree-row.file").forEach((r) => r.classList.remove("selected"));
    const sel = document.querySelector('.tree-row.file[data-path="' + CSS.escape(relPath) + '"]');
    if (sel) sel.classList.add("selected");

    const vtName = document.getElementById("vtName");
    if (vtName) vtName.textContent = relPath;
    const body = document.getElementById("viewerBody");
    if (!body) return;
    currentFile = { path: relPath, ext };
    workspaceState.file = relPath;
    saveWorkspaceState();
    showViewerMessage("ファイルを読み込んでいます…");

    // SVG: 描画／コードの切替（ユーザー指示。設計書の同時表示から変更）
    if (ext === SVG_EXT) {
      const [fileRes, codeRes] = await Promise.all([
        fetch(`/file/${projectId}?path=${encodeURIComponent(relPath)}`),
        fetch(`/content/${projectId}?path=${encodeURIComponent(relPath)}`)
      ]);
      const blob = await fileRes.blob();
      const objectUrl = URL.createObjectURL(blob);
      const code = await codeRes.text();
      body.innerHTML =
        '<div data-render>' + fileHead(name, relPath)
        + '<div class="img-view"><img src="' + objectUrl + '" alt="' + escapeHtml(name) + '" style="max-width:100%"></div></div>'
        + '<div data-code hidden><div class="source">' + fileHead(name, relPath)
        + "<pre><code>" + escapeHtml(code) + "</code></pre></div></div>";
      setModes(["render", "code"]);
      return;
    }

    if (MARKDOWN_EXTS.includes(ext)) {
      const res = await fetch(`/content/${projectId}?path=${encodeURIComponent(relPath)}`);
      const text = await res.text();
      body.innerHTML =
        '<div data-render><div class="md">' + fileHead(name, relPath)
        + "<pre><code>" + escapeHtml(text) + "</code></pre></div></div>"
        + '<div data-code hidden><div class="source">' + fileHead(name, relPath)
        + "<pre><code>" + escapeHtml(text) + "</code></pre></div></div>";
      setModes(["render", "code"]);
      return;
    }

    if (CSV_EXTS.includes(ext)) {
      const res = await fetch(`/content/${projectId}?path=${encodeURIComponent(relPath)}`);
      const text = await res.text();
      const delimiter = ext === "tsv" ? "\t" : ",";
      body.innerHTML = '<div data-render>' + csvTableHtml(name, relPath, text, delimiter) + "</div>";
      setModes(["render"]);
      return;
    }

    if (TEXT_EXTS.includes(ext)) {
      const res = await fetch(`/content/${projectId}?path=${encodeURIComponent(relPath)}`);
      const text = await res.text();
      body.innerHTML = '<div data-render><div class="source">' + fileHead(name, relPath)
        + "<pre><code>" + escapeHtml(text) + "</code></pre></div></div>";
      setModes(["render"]);
      return;
    }

    if (IMAGE_EXTS.includes(ext)) {
      body.innerHTML = '<div data-render>' + fileHead(name, relPath)
        + '<div class="img-view"><img src="/file/' + projectId + "?path=" + encodeURIComponent(relPath)
        + '" alt="' + escapeHtml(name) + '" style="max-width:100%"></div></div>';
      setModes(["render"]);
      return;
    }

    if (ext === PDF_EXT) {
      body.innerHTML = '<div data-render>' + fileHead(name, relPath)
        + '<embed src="/file/' + projectId + "?path=" + encodeURIComponent(relPath)
        + '" type="application/pdf" style="width:100%;height:600px"></div>';
      setModes(["render"]);
      return;
    }

    if (VIDEO_EXTS.includes(ext)) {
      body.innerHTML = '<div data-render>' + fileHead(name, relPath)
        + '<div class="player-ph"><video src="/file/' + projectId + "?path=" + encodeURIComponent(relPath)
        + '" controls style="max-width:100%"></video></div></div>';
      setModes(["render"]);
      return;
    }

    if (AUDIO_EXTS.includes(ext)) {
      body.innerHTML = '<div data-render>' + fileHead(name, relPath)
        + '<div class="player-ph"><audio src="/file/' + projectId + "?path=" + encodeURIComponent(relPath)
        + '" controls></audio></div></div>';
      setModes(["render"]);
      return;
    }

    body.innerHTML = '<div data-render>' + fileHead(name, relPath)
      + '<div class="fallback"><div class="fb-icon">?</div><h4>このファイルはプレビューできません</h4>'
      + "<p>" + escapeHtml(relPath) + "</p>"
      + '<a class="btn primary" href="/file/' + projectId + "?path=" + encodeURIComponent(relPath) + '">ダウンロード</a></div></div>';
    setModes(["render"]);
  }

  document.querySelectorAll("#vtModes button").forEach(function (b) {
    b.addEventListener("click", function () {
      renderMode(b.dataset.mode);
    });
  });

  async function reloadTree(path) {
    const container = document.getElementById("tree");
    if (!container) return;
    await restoreTree(container);
  }

  async function restoreTree(container) {
    await renderTree("", container);
    const folders = [...workspaceState.folders].sort((a, b) => a.split("/").length - b.split("/").length);
    for (const folderPath of folders) {
      const row = container.querySelector('.tree-row.folder[data-path="' + CSS.escape(folderPath) + '"]');
      if (!row || row.parentElement.classList.contains("open")) continue;
      row.click();
      // clickハンドラは非同期なので、生成された子要素の読み込み完了を待つ。
      await new Promise((resolve) => setTimeout(resolve, 0));
      const children = row.nextElementSibling;
      while (row.parentElement.classList.contains("open") && !children.dataset.loaded && !children.querySelector(".tree-message.error")) {
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    }
    if (workspaceState.file) {
      const fileRow = container.querySelector('.tree-row.file[data-path="' + CSS.escape(workspaceState.file) + '"]');
      if (fileRow) fileRow.click();
    }
  }

  function setupTreeSettings() {
    const controls = document.querySelectorAll("[data-tree-setting]");
    controls.forEach((input) => {
      const key = input.dataset.treeSetting;
      input.checked = Boolean(workspaceState.settings[key]);
      input.addEventListener("change", async () => {
        workspaceState.settings[key] = input.checked;
        saveWorkspaceState();
        const tree = document.getElementById("tree");
        if (tree) await restoreTree(tree);
      });
    });
    document.querySelector("[data-reset-tree-settings]")?.addEventListener("click", async () => {
      workspaceState.settings = { ...defaultTreeSettings };
      controls.forEach((input) => { input.checked = false; });
      saveWorkspaceState();
      const tree = document.getElementById("tree");
      if (tree) await restoreTree(tree);
    });
  }

  function setupSidebarResizer() {
    const resizer = document.querySelector("[data-sidebar-resizer]");
    if (!resizer) return;
    const root = document.documentElement;
    const saved = Number(localStorage.getItem("documents-bridge:sidebar-width"));
    if (saved >= 220 && saved <= 420) root.style.setProperty("--sidebar-width", saved + "px");
    const setWidth = (width) => root.style.setProperty("--sidebar-width", Math.max(220, Math.min(420, width)) + "px");
    const start = (event) => {
      if (window.matchMedia("(max-width: 767px)").matches) return;
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = document.getElementById("sidebar")?.getBoundingClientRect().width || 280;
      const move = (moveEvent) => setWidth(startWidth + moveEvent.clientX - startX);
      const end = () => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", end);
        const width = parseInt(getComputedStyle(root).getPropertyValue("--sidebar-width"), 10);
        if (width) localStorage.setItem("documents-bridge:sidebar-width", String(width));
        document.body.classList.remove("resizing");
      };
      document.body.classList.add("resizing");
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", end, { once: true });
    };
    resizer.addEventListener("pointerdown", start);
    resizer.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const current = document.getElementById("sidebar")?.getBoundingClientRect().width || 280;
      setWidth(current + (event.key === "ArrowRight" ? 16 : -16));
      localStorage.setItem("documents-bridge:sidebar-width", getComputedStyle(root).getPropertyValue("--sidebar-width").trim());
    });
  }

  const treeEl = document.getElementById("tree");
  setupTreeSettings();
  setupSidebarResizer();
  if (projectId !== null && projectId !== undefined && treeEl) {
    restoreTree(treeEl).catch((error) => {
      showTreeMessage(treeEl, error.message || "フォルダを読み込めませんでした。", "error");
    });

    const source = new EventSource(`/events/${projectId}`);
    source.onmessage = () => reloadTree(currentPath);
  }
})();
