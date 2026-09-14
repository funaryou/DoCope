/**
 * ワークスペースのツリー描画・ファイルプレビュー制御（Sunset適用版）
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
    const url = path
      ? `/tree/${projectId}?path=${encodeURIComponent(path)}`
      : `/tree/${projectId}`;
    const res = await fetch(url);
    return res.json();
  }

  async function renderTree(path, container) {
    const children = await loadChildren(path);
    container.innerHTML = "";
    for (const node of children) {
      if (node.directory) {
        const wrapper = document.createElement("div");
        wrapper.className = "tree-node";
        const row = document.createElement("div");
        row.className = "tree-row folder";
        const tw = document.createElement("span");
        tw.className = "tw";
        tw.textContent = "▸";
        const tname = document.createElement("span");
        tname.className = "tname";
        tname.textContent = node.name;
        row.appendChild(tw);
        row.appendChild(tname);
        const sub = document.createElement("div");
        sub.className = "tree-children";
        sub.hidden = true;
        row.addEventListener("click", async () => {
          const open = wrapper.classList.toggle("open");
          if (open && !sub.dataset.loaded) {
            await renderTree(node.relativePath, sub);
            sub.dataset.loaded = "1";
          }
          sub.hidden = !open;
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
        row.addEventListener("click", () => showFile(node));
        container.appendChild(row);
      }
    }
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
    if (!path) {
      await renderTree("", container);
      return;
    }
    await renderTree("", container);
  }

  const treeEl = document.getElementById("tree");
  if (projectId !== null && projectId !== undefined && treeEl) {
    renderTree("", treeEl);

    const source = new EventSource(`/events/${projectId}`);
    source.onmessage = () => reloadTree(currentPath);
  }
})();
