/**
 * ワークスペースのツリー描画・ファイルプレビュー制御
 * 拡張子定義は preview-config.js（window.PreviewConfig）を参照します。
 * projectId は workspace.html 側の inline script で
 * window.WORKSPACE_PROJECT_ID として注入されます。
 */
(function () {
  const projectId = window.WORKSPACE_PROJECT_ID;
  let currentPath = "";

  function extOf(path) {
    const i = path.lastIndexOf(".");
    return i < 0 ? "" : path.slice(i + 1).toLowerCase();
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
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.textContent = (node.directory ? "▸ " : "") + node.name;
      btn.onclick = () => node.directory ? toggleDir(node, li) : showFile(node);
      li.appendChild(btn);
      container.appendChild(li);
    }
  }

  async function toggleDir(node, li) {
    let sub = li.querySelector("ul");
    if (sub) {
      sub.remove();
      return;
    }
    sub = document.createElement("ul");
    li.appendChild(sub);
    await renderTree(node.relativePath, sub);
  }

  async function showFile(node) {
    const ext = extOf(node.relativePath);
    const { TEXT_EXTS, IMAGE_EXTS, PDF_EXT, VIDEO_EXTS, AUDIO_EXTS } = window.PreviewConfig;
    document.getElementById("fileName").textContent = node.relativePath;
    const viewer = document.getElementById("viewer");
    viewer.innerHTML = "";
    if (TEXT_EXTS.includes(ext)) {
      const res = await fetch(`/content/${projectId}?path=${encodeURIComponent(node.relativePath)}`);
      const pre = document.createElement("pre");
      pre.textContent = await res.text();
      viewer.appendChild(pre);
    } else if (IMAGE_EXTS.includes(ext)) {
      const img = document.createElement("img");
      img.src = `/file/${projectId}?path=${encodeURIComponent(node.relativePath)}`;
      img.style.maxWidth = "100%";
      viewer.appendChild(img);
    } else if (ext === PDF_EXT) {
      const embed = document.createElement("embed");
      embed.src = `/file/${projectId}?path=${encodeURIComponent(node.relativePath)}`;
      embed.type = "application/pdf";
      embed.style.width = "100%";
      embed.style.height = "600px";
      viewer.appendChild(embed);
    } else if (VIDEO_EXTS.includes(ext)) {
      const video = document.createElement("video");
      video.src = `/file/${projectId}?path=${encodeURIComponent(node.relativePath)}`;
      video.controls = true;
      video.style.maxWidth = "100%";
      viewer.appendChild(video);
    } else if (AUDIO_EXTS.includes(ext)) {
      const audio = document.createElement("audio");
      audio.src = `/file/${projectId}?path=${encodeURIComponent(node.relativePath)}`;
      audio.controls = true;
      viewer.appendChild(audio);
    } else {
      const a = document.createElement("a");
      a.href = `/file/${projectId}?path=${encodeURIComponent(node.relativePath)}`;
      a.textContent = "ダウンロード";
      viewer.appendChild(document.createTextNode("プレビュー不可です。"));
      viewer.appendChild(document.createElement("br"));
      viewer.appendChild(a);
    }
  }

  async function reloadTree(path) {
    const container = document.getElementById("tree");
    if (!path) {
      await renderTree("", container);
      return;
    }
    await renderTree("", container);
  }

  renderTree("", document.getElementById("tree"));

  const source = new EventSource(`/events/${projectId}`);
  source.onmessage = () => reloadTree(currentPath);
})();
