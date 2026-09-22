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
  const stateKey = `do-cope:workspace:${projectId}`;
  const settingsKey = "do-cope:tree-settings";
  const defaultTreeSettings = { showHidden: false, showSystem: false };
  const mobileViewport = window.matchMedia("(max-width: 767px)");
  let workspaceState = loadWorkspaceState();
  let mobileDeferredFile = null;

  // On a phone, open the workspace as a file picker. A file remembered from
  // desktop is intentionally not auto-opened because it hides the tree and
  // makes the initial mobile view feel like an unexpected deep link.
  if (mobileViewport.matches) {
    mobileDeferredFile = workspaceState.file;
    workspaceState.file = null;
  }

  function updateMobileEmptyViewer() {
    document.body.classList.toggle("no-file", !workspaceState.file);
  }

  updateMobileEmptyViewer();

  function loadWorkspaceState() {
    try {
      const saved = JSON.parse(localStorage.getItem(stateKey) || "{}");
      const sharedSettings = JSON.parse(localStorage.getItem(settingsKey) || "null");
      const settings = sharedSettings && typeof sharedSettings === "object"
        ? sharedSettings
        : (saved.settings || {});
      return {
        file: saved.file || null,
        folders: Array.isArray(saved.folders) ? saved.folders : [],
        settings: { ...defaultTreeSettings, ...settings }
      };
    } catch (e) {
      return { file: null, folders: [], settings: { ...defaultTreeSettings } };
    }
  }

  function saveWorkspaceState() {
    try {
      localStorage.setItem(stateKey, JSON.stringify({
        // Keep a desktop file available for the next desktop visit while the
        // mobile picker is temporarily showing no selection.
        file: mobileViewport.matches && !workspaceState.file
          ? mobileDeferredFile
          : workspaceState.file,
        folders: workspaceState.folders
      }));
      localStorage.setItem(settingsKey, JSON.stringify(workspaceState.settings));
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

  const FILE_TONES = Object.freeze({
    md: "#d7a06c", markdown: "#d7a06c", txt: "#bfc8d2",
    java: "#df806e", py: "#84bd9e", js: "#e0be67", ts: "#75a8d9",
    json: "#c19ae8", yaml: "#77c1b2", yml: "#77c1b2", sh: "#9ebd87",
    sql: "#d6a26e", xml: "#d68c72", css: "#d48bb7", html: "#e18a69",
    properties: "#b7a8d8", csv: "#83b8ac", tsv: "#83b8ac", svg: "#cba477"
  });

  function setFileTone(body, ext) {
    if (!body) return;
    body.dataset.fileExt = ext || "plain";
    if (FILE_TONES[ext]) body.style.setProperty("--file-tone", FILE_TONES[ext]);
    else body.style.removeProperty("--file-tone");
  }

  const TOKYO_KEYWORDS = new Set((
    "as async await break case catch class const continue debugger default delete do else export extends finally for from function "
    + "if implements import in instanceof interface let new package private protected public return static super switch throw try typeof var void while with yield "
    + "def elif except lambda pass raise and or not is match final synchronized throws"
  ).split(/\s+/));
  const TOKYO_TYPES = new Set((
    "String Number Boolean Object Array Map Set Date Promise Error void null undefined any unknown never int long short byte float double char boolean true false"
  ).split(/\s+/));
  const HASH_COMMENT_EXTS = new Set(["py", "sh", "yaml", "yml", "properties", "rb", "pl"]);

  function syntaxHighlight(source, ext) {
    const text = String(source || "");
    const output = [];
    let i = 0;
    const add = (className, value) => output.push(className
      ? '<span class="' + className + '">' + escapeHtml(value) + "</span>"
      : escapeHtml(value));

    while (i < text.length) {
      const rest = text.slice(i);
      if (/^\s/.test(rest)) {
        const match = /^[\s]+/.exec(rest)[0];
        add("", match); i += match.length; continue;
      }
      if (rest.startsWith("//") || rest.startsWith("/*") || (HASH_COMMENT_EXTS.has(ext) && rest.startsWith("#"))) {
        const end = rest.startsWith("/*")
          ? Math.max(rest.indexOf("*/", 2) + 2, 2)
          : (rest.indexOf("\n") < 0 ? rest.length : rest.indexOf("\n"));
        add("tok-comment", rest.slice(0, end)); i += end; continue;
      }
      if ("'\"`".includes(text[i])) {
        const quote = text[i];
        let end = i + 1;
        while (end < text.length) {
          if (text[end] === "\\") { end += 2; continue; }
          if (text[end] === quote) { end += 1; break; }
          end += 1;
        }
        add("tok-string", text.slice(i, end)); i = end; continue;
      }
      const number = /^\b(?:0x[\da-f]+|\d+(?:\.\d+)?)\b/i.exec(rest);
      if (number) { add("tok-number", number[0]); i += number[0].length; continue; }
      const word = /^[A-Za-z_$][\w$]*/.exec(rest);
      if (word) {
        const value = word[0];
        const after = rest.slice(value.length).match(/^\s*/)[0].length;
        const next = rest.slice(value.length + after, value.length + after + 1);
        let className = "tok-plain";
        if (TOKYO_KEYWORDS.has(value)) className = "tok-keyword";
        else if (TOKYO_TYPES.has(value)) className = "tok-type";
        else if (next === "(") className = "tok-function";
        else if (next === ":") className = "tok-property";
        add(className, value); i += value.length; continue;
      }
      if (/^[+\-*%=<>!&|?:/]+/.test(rest)) {
        const operator = /^[+\-*%=<>!&|?:/]+/.exec(rest)[0];
        add("tok-operator", operator); i += operator.length; continue;
      }
      add("tok-punctuation", text[i]); i += 1;
    }
    return output.join("");
  }

  function sourceCodeHtml(text, ext) {
    return '<pre><code class="tok-code">' + syntaxHighlight(text, ext) + "</code></pre>";
  }

  function normalizeSyntaxExt(language) {
    const value = String(language || "").trim().toLowerCase();
    return ({
      javascript: "js", js: "js", jsx: "js",
      typescript: "ts", ts: "ts", tsx: "ts",
      python: "py", py: "py",
      shell: "sh", bash: "sh", zsh: "sh", sh: "sh",
      yml: "yaml", yaml: "yaml",
      markdown: "md", md: "md"
    })[value] || value;
  }

  function inlineMarkdown(value) {
    let html = escapeHtml(value);
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
    return html;
  }

  function markdownHtml(text) {
    const lines = String(text || "").replace(/\r/g, "").split("\n");
    const out = [];
    let paragraph = [];
    let listType = null;
    let inCode = false;
    let codeLines = [];
    let codeLanguage = "";

    const closeParagraph = () => {
      if (!paragraph.length) return;
      out.push("<p>" + inlineMarkdown(paragraph.join("\n")).replace(/\n/g, "<br>") + "</p>");
      paragraph = [];
    };
    const closeList = () => {
      if (listType) out.push("</" + listType + ">");
      listType = null;
    };
    const closeCode = () => {
      if (!inCode) return;
      out.push('<pre class="md-code"><code class="tok-code">'
        + syntaxHighlight(codeLines.join("\n"), normalizeSyntaxExt(codeLanguage))
        + "</code></pre>");
      codeLines = [];
      codeLanguage = "";
      inCode = false;
    };

    const tableCells = (line) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const fence = /^\s*```([^\s`]*)/.exec(line);
      if (fence) {
        closeParagraph();
        closeList();
        if (inCode) closeCode();
        else {
          inCode = true;
          codeLanguage = fence[1] || "";
        }
        continue;
      }
      if (inCode) {
        codeLines.push(line);
        continue;
      }
      const heading = /^(#{1,6})\s+(.+)$/.exec(line);
      const unordered = /^\s*[-*+]\s+(.+)$/.exec(line);
      const ordered = /^\s*\d+[.)]\s+(.+)$/.exec(line);
      const tableSeparator = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(lines[i + 1] || "");
      if (line.includes("|") && tableSeparator) {
        closeParagraph(); closeList();
        const headers = tableCells(line);
        const rows = [];
        i += 2;
        while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") {
          rows.push(tableCells(lines[i]));
          i += 1;
        }
        i -= 1;
        out.push('<table class="md-table"><thead><tr>'
          + headers.map((cell) => "<th>" + inlineMarkdown(cell) + "</th>").join("")
          + "</tr></thead><tbody>"
          + rows.map((row) => "<tr>" + headers.map((_, index) => "<td>" + inlineMarkdown(row[index] || "") + "</td>").join("") + "</tr>").join("")
          + "</tbody></table>");
        continue;
      }
      if (heading) {
        closeParagraph(); closeList();
        out.push("<h" + heading[1].length + ">" + inlineMarkdown(heading[2]) + "</h" + heading[1].length + ">");
      } else if (unordered || ordered) {
        closeParagraph();
        const nextType = unordered ? "ul" : "ol";
        if (listType !== nextType) { closeList(); out.push("<" + nextType + ">"); listType = nextType; }
        out.push("<li>" + inlineMarkdown((unordered || ordered)[1]) + "</li>");
      } else if (/^\s*>\s?/.test(line)) {
        closeParagraph(); closeList();
        out.push("<blockquote>" + inlineMarkdown(line.replace(/^\s*>\s?/, "")) + "</blockquote>");
      } else if (/^\s*(---+|\*\*\*+)\s*$/.test(line)) {
        closeParagraph(); closeList(); out.push("<hr>");
      } else if (line.trim() === "") {
        closeParagraph(); closeList();
      } else {
        closeList(); paragraph.push(line);
      }
    }
    closeCode(); closeParagraph(); closeList();
    return out.join("") || "<p class=\"md-empty\">内容がありません。</p>";
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

  function setupViewerScrollbar() {
    const viewer = document.querySelector(".viewer");
    const body = document.getElementById("viewerBody");
    const rail = document.querySelector("[data-viewer-scrollbar]");
    const railContent = rail?.firstElementChild;
    if (!viewer || !body || !rail || !railContent) return;

    let target = null;
    let frame = 0;
    let syncing = false;

    const visible = (element) => element.getClientRects().length > 0
      && element.clientWidth > 0
      && element.scrollWidth > element.clientWidth + 1;

    const selectTarget = () => {
      const candidates = [...body.querySelectorAll(".source pre, .md-code")].filter(visible);
      if (!candidates.length) return null;
      const viewerRect = viewer.getBoundingClientRect();
      return candidates.find((candidate) => {
        const rect = candidate.getBoundingClientRect();
        return rect.bottom > viewerRect.top && rect.top < viewerRect.bottom;
      }) || candidates[0];
    };

    const attachTarget = (next) => {
      if (target === next) return;
      if (target) target.removeEventListener("scroll", schedule);
      target = next;
      if (target) target.addEventListener("scroll", schedule, { passive: true });
    };

    const refresh = () => {
      frame = 0;
      const next = selectTarget();
      attachTarget(next);
      if (!target) {
        rail.classList.remove("is-active");
        rail.setAttribute("aria-hidden", "true");
        rail.style.width = "";
        rail.style.marginLeft = "";
        return;
      }
      const viewerRect = viewer.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      // The rail must use the code surface's viewport width. If it uses the
      // whole viewer width, its own scroll range becomes zero and it looks
      // like a decorative frame instead of a usable scrollbar.
      rail.style.width = (target.clientWidth + 2) + "px";
      const viewerContentLeft = viewerRect.left + parseFloat(getComputedStyle(viewer).paddingLeft || "0");
      rail.style.marginLeft = Math.max(0, targetRect.left - viewerContentLeft) + "px";
      rail.style.marginRight = "0";
      railContent.style.width = target.scrollWidth + "px";
      rail.classList.add("is-active");
      rail.setAttribute("aria-hidden", "false");
      syncing = true;
      rail.scrollLeft = target.scrollLeft;
      syncing = false;
    };

    function schedule() {
      if (frame) return;
      frame = requestAnimationFrame(refresh);
    }

    rail.addEventListener("scroll", () => {
      if (!target || syncing) return;
      target.scrollLeft = rail.scrollLeft;
    }, { passive: true });

    // Let users drag the code surface itself on touch screens and with a
    // pointer. The vertical gesture remains native; once a gesture is clearly
    // horizontal, move the active pre instead of requiring the tiny bottom rail.
    let pointer = null;
    let viewerScale = 1;
    let previousPinchDistance = 0;

    const setViewerScale = (scale) => {
      // Keep the usable range wide enough that a normal pinch does not hit a
      // visible boundary too early.
      viewerScale = Math.min(5, Math.max(0.5, scale));
      body.style.setProperty("--viewer-zoom", String(viewerScale));
    };
    body.resetViewerZoom = () => setViewerScale(1);
    const touchDistance = (touches) => Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );

    const clearPointer = () => {
      if (pointer?.target) pointer.target.classList.remove("is-dragging");
      pointer = null;
    };
    body.addEventListener("pointerdown", (event) => {
      if (!target || event.button > 0) return;
      const targetElement = event.target.closest?.(".source pre, .md-code");
      if (targetElement !== target) return;
      pointer = {
        id: event.pointerId,
        target,
        startX: event.clientX,
        startY: event.clientY,
        startScrollLeft: target.scrollLeft,
        dragging: false
      };
    });
    body.addEventListener("pointermove", (event) => {
      if (!pointer || event.pointerId !== pointer.id) return;
      const dx = event.clientX - pointer.startX;
      const dy = event.clientY - pointer.startY;
      if (!pointer.dragging) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (Math.abs(dy) >= Math.abs(dx)) {
          clearPointer();
          return;
        }
        pointer.dragging = true;
        pointer.target.classList.add("is-dragging");
        pointer.target.setPointerCapture?.(pointer.id);
      }
      event.preventDefault();
      pointer.target.scrollLeft = pointer.startScrollLeft - dx;
    });
    body.addEventListener("pointerup", clearPointer);
    body.addEventListener("pointercancel", clearPointer);
    body.addEventListener("lostpointercapture", clearPointer);

    // Use the touch stream for pinch zoom. Unlike a fixed start-distance
    // calculation, accumulating each small distance change keeps the zoom
    // following the fingers even when the browser coalesces/cancels pointer
    // updates during a long gesture.
    body.addEventListener("touchstart", (event) => {
      if (!mobileViewport.matches || event.touches.length !== 2) return;
      clearPointer();
      previousPinchDistance = touchDistance(event.touches);
    }, { passive: true });
    body.addEventListener("touchmove", (event) => {
      if (!mobileViewport.matches || event.touches.length < 2 || previousPinchDistance <= 0) return;
      event.preventDefault();
      const distance = touchDistance(event.touches);
      if (!distance) return;
      const distanceRatio = distance / previousPinchDistance;
      previousPinchDistance = distance;
      setViewerScale(viewerScale * Math.pow(distanceRatio, 1.35));
    }, { passive: false });
    const endPinch = (event) => {
      if (event.touches.length < 2) previousPinchDistance = 0;
    };
    body.addEventListener("touchend", endPinch, { passive: true });
    body.addEventListener("touchcancel", endPinch, { passive: true });

    viewer.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });

    const observer = new MutationObserver(schedule);
    observer.observe(body, { childList: true, subtree: true, attributes: true });
    schedule();
  }

  let copyFeedbackTimer = null;

  async function copyCurrentPath() {
    const path = currentFile?.path;
    if (!path) return;
    try {
      await navigator.clipboard.writeText(path);
    } catch (error) {
      const helper = document.createElement("textarea");
      helper.value = path;
      helper.setAttribute("readonly", "");
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.appendChild(helper);
      helper.select();
      document.execCommand("copy");
      helper.remove();
    }
    const target = document.querySelector("[data-copy-path]");
    const state = document.querySelector("[data-copy-state]");
    if (!target) return;
    target.classList.add("copied");
    target.title = "相対パスをコピーしました";
    if (state) state.textContent = "コピーしました";
    clearTimeout(copyFeedbackTimer);
    copyFeedbackTimer = setTimeout(() => {
      target.classList.remove("copied");
      target.title = "クリックで相対パスをコピー";
      if (state) state.textContent = "";
    }, 1600);
  }

  const copyTarget = document.querySelector("[data-copy-path]");
  copyTarget?.addEventListener("click", copyCurrentPath);
  copyTarget?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    copyCurrentPath();
  });

  function parseCsv(text, delimiter) {
    return text.split(/\r?\n/).filter((line) => line.length > 0).map((line) => line.split(delimiter));
  }

  function csvTableHtml(text, delimiter) {
    const rows = parseCsv(text, delimiter);
    if (rows.length === 0) {
      return '<div class="source"><pre><code>' + escapeHtml(text) + "</code></pre></div>";
    }
    let out = '<table class="csv-table"><thead><tr>';
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
    body.resetViewerZoom?.();
    setFileTone(body, ext);
    currentFile = { path: relPath, ext };
    workspaceState.file = relPath;
    updateMobileEmptyViewer();
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
        '<div data-render><div class="img-view"><img src="' + objectUrl + '" alt="' + escapeHtml(name) + '" style="max-width:100%"></div></div>'
        + '<div data-code hidden><div class="source">'
        + sourceCodeHtml(code, ext) + "</div></div>";
      setModes(["render", "code"]);
      return;
    }

    if (MARKDOWN_EXTS.includes(ext)) {
      const res = await fetch(`/content/${projectId}?path=${encodeURIComponent(relPath)}`);
      const text = await res.text();
      body.innerHTML =
        '<div data-render><div class="md md-content">' + markdownHtml(text) + "</div></div>"
        + '<div data-code hidden><div class="source">'
        + sourceCodeHtml(text, ext) + "</div></div>";
      setModes(["render", "code"]);
      return;
    }

    if (CSV_EXTS.includes(ext)) {
      const res = await fetch(`/content/${projectId}?path=${encodeURIComponent(relPath)}`);
      const text = await res.text();
      const delimiter = ext === "tsv" ? "\t" : ",";
      body.innerHTML = '<div data-render>' + csvTableHtml(text, delimiter) + "</div>";
      setModes(["render"]);
      return;
    }

    if (TEXT_EXTS.includes(ext)) {
      const res = await fetch(`/content/${projectId}?path=${encodeURIComponent(relPath)}`);
      const text = await res.text();
      body.innerHTML = '<div data-render><div class="source">'
        + sourceCodeHtml(text, ext) + "</div></div>";
      setModes(["render"]);
      return;
    }

    if (IMAGE_EXTS.includes(ext)) {
      body.innerHTML = '<div data-render><div class="img-view"><img src="/file/' + projectId + "?path=" + encodeURIComponent(relPath)
        + '" alt="' + escapeHtml(name) + '" style="max-width:100%"></div></div>';
      setModes(["render"]);
      return;
    }

    if (ext === PDF_EXT) {
      body.innerHTML = '<div data-render><embed src="/file/' + projectId + "?path=" + encodeURIComponent(relPath)
        + '" type="application/pdf" style="width:100%;height:600px"></div>';
      setModes(["render"]);
      return;
    }

    if (VIDEO_EXTS.includes(ext)) {
      body.innerHTML = '<div data-render><div class="player-ph"><video src="/file/' + projectId + "?path=" + encodeURIComponent(relPath)
        + '" controls style="max-width:100%"></video></div></div>';
      setModes(["render"]);
      return;
    }

    if (AUDIO_EXTS.includes(ext)) {
      body.innerHTML = '<div data-render><div class="player-ph"><audio src="/file/' + projectId + "?path=" + encodeURIComponent(relPath)
        + '" controls></audio></div></div>';
      setModes(["render"]);
      return;
    }

    body.innerHTML = '<div data-render>'
      + '<div class="fallback"><div class="fb-icon">?</div><h4>このファイルはプレビューできません</h4>'
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
        if (projectId !== null && projectId !== undefined && tree) await restoreTree(tree);
      });
    });
    document.querySelector("[data-reset-tree-settings]")?.addEventListener("click", async () => {
      workspaceState.settings = { ...defaultTreeSettings };
      controls.forEach((input) => { input.checked = false; });
      saveWorkspaceState();
      const tree = document.getElementById("tree");
      if (projectId !== null && projectId !== undefined && tree) await restoreTree(tree);
    });
  }

  function setupSidebarResizer() {
    const resizer = document.querySelector("[data-sidebar-resizer]");
    if (!resizer) return;
    const root = document.documentElement;
    const sidebar = document.getElementById("sidebar");
    const mobileQuery = window.matchMedia("(max-width: 767px)");
    const saved = Number(localStorage.getItem("do-cope:sidebar-width"));
    const savedMobile = Number(localStorage.getItem("do-cope:mobile-sidebar-height"));
    if (saved >= 220 && saved <= 420) root.style.setProperty("--sidebar-width", saved + "px");
    if (savedMobile >= 160 && savedMobile <= Math.max(260, window.innerHeight - 220)) {
      root.style.setProperty("--sidebar-mobile-height", savedMobile + "px");
    }
    const setWidth = (width) => root.style.setProperty("--sidebar-width", Math.max(220, Math.min(420, width)) + "px");
    const mobileBounds = () => ({ min: 160, max: Math.max(260, window.innerHeight - 220) });
    const setMobileHeight = (height) => {
      const bounds = mobileBounds();
      root.style.setProperty("--sidebar-mobile-height", Math.max(bounds.min, Math.min(bounds.max, height)) + "px");
    };
    const start = (event) => {
      event.preventDefault();
      const isMobile = mobileQuery.matches;
      if (isMobile) {
        const startY = event.clientY;
        const startHeight = sidebar?.getBoundingClientRect().height || window.innerHeight * 0.35;
        const move = (moveEvent) => setMobileHeight(startHeight + moveEvent.clientY - startY);
        const end = () => {
          document.removeEventListener("pointermove", move);
          document.removeEventListener("pointerup", end);
          const height = parseInt(getComputedStyle(root).getPropertyValue("--sidebar-mobile-height"), 10);
          if (height) localStorage.setItem("do-cope:mobile-sidebar-height", String(height));
          document.body.classList.remove("resizing");
        };
        document.body.classList.add("resizing");
        document.addEventListener("pointermove", move);
        document.addEventListener("pointerup", end, { once: true });
        return;
      }
      const startX = event.clientX;
      const startWidth = sidebar?.getBoundingClientRect().width || 280;
      const move = (moveEvent) => setWidth(startWidth + moveEvent.clientX - startX);
      const end = () => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", end);
        const width = parseInt(getComputedStyle(root).getPropertyValue("--sidebar-width"), 10);
        if (width) localStorage.setItem("do-cope:sidebar-width", String(width));
        document.body.classList.remove("resizing");
      };
      document.body.classList.add("resizing");
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", end, { once: true });
    };
    resizer.addEventListener("pointerdown", start);
    resizer.addEventListener("keydown", (event) => {
      if (mobileQuery.matches) {
        if (!["ArrowUp", "ArrowDown"].includes(event.key)) return;
        event.preventDefault();
        const current = sidebar?.getBoundingClientRect().height || window.innerHeight * 0.35;
        setMobileHeight(current + (event.key === "ArrowDown" ? 16 : -16));
        localStorage.setItem("do-cope:mobile-sidebar-height", getComputedStyle(root).getPropertyValue("--sidebar-mobile-height").trim());
        return;
      }
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const current = sidebar?.getBoundingClientRect().width || 280;
      setWidth(current + (event.key === "ArrowRight" ? 16 : -16));
      localStorage.setItem("do-cope:sidebar-width", getComputedStyle(root).getPropertyValue("--sidebar-width").trim());
    });
  }

  function setupProjectStripScroll() {
    const strip = document.querySelector(".activity-projects");
    if (!strip) return;

    const canScrollHorizontally = () => strip.scrollWidth > strip.clientWidth + 1;

    // A vertical wheel over the horizontal strip should scroll the projects,
    // otherwise the hidden scrollbar makes the interaction undiscoverable.
    strip.addEventListener("wheel", (event) => {
      if (!canScrollHorizontally() || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      strip.scrollLeft += event.deltaY;
      event.preventDefault();
    }, { passive: false });
  }

  const treeEl = document.getElementById("tree");
  setupTreeSettings();
  setupSidebarResizer();
  setupProjectStripScroll();
  setupViewerScrollbar();
  if (projectId !== null && projectId !== undefined && treeEl) {
    restoreTree(treeEl).catch((error) => {
      showTreeMessage(treeEl, error.message || "フォルダを読み込めませんでした。", "error");
    });

    const source = new EventSource(`/events/${projectId}`);
    source.onmessage = () => reloadTree(currentPath);
  }
})();
