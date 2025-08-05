// js/mediatheque.js

// --- SIMULATION DE BASE DE DONNÉES AVEC LOCALSTORAGE ---
const db = {
  getFolders: () =>
    JSON.parse(localStorage.getItem("media_folders") || "[]"),
  saveFolders: (folders) =>
    localStorage.setItem("media_folders", JSON.stringify(folders)),
  getFiles: () => JSON.parse(localStorage.getItem("media_files") || "[]"),
  saveFiles: (files) =>
    localStorage.setItem("media_files", JSON.stringify(files)),
};

// --- FONCTIONS UTILITAIRES ---
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const addImageInput = document.getElementById("add-image-input");
  const createFolderBtn = document.getElementById("create-folder-btn");
  const mediaGrid = document.getElementById("media-grid");
  const breadcrumbs = document.getElementById("breadcrumbs");

  let currentFolderId = null; // null représente la racine

  // --- FONCTIONS DE RENDU ---

  async function render() {
    mediaGrid.innerHTML = "";
    renderBreadcrumbs();

    const allFolders = db.getFolders();
    const allFiles = db.getFiles();

    // Afficher les sous-dossiers
    const subFolders = allFolders.filter((f) => f.parentId === currentFolderId);
    subFolders.forEach(renderFolder);

    // Afficher les fichiers
    const filesInFolder = allFiles.filter((f) => f.folderId === currentFolderId);
    for (const file of filesInFolder) {
      await renderFile(file);
    }
  }

  function renderFolder(folder) {
    const folderEl = document.createElement("div");
    folderEl.className = "media-item folder-item";
    folderEl.dataset.folderId = folder.id;
    folderEl.innerHTML = `
      <div>
        <svg class="folder-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
        </svg>
      </div>
      <span class="folder-name">${folder.name}</span>
      <button class="options-btn">...</button>
      <div class="context-menu">
        <button class="rename-btn">Renommer</button>
        <button class="delete-btn">Supprimer</button>
      </div>
    `;
    mediaGrid.appendChild(folderEl);
  }

  async function renderFile(file) {
    const fileEl = document.createElement("div");
    fileEl.className = "media-item media-thumbnail";
    fileEl.dataset.fileId = file.id;
    const date = new Date(file.createdAt).toLocaleDateString("fr-FR");
    fileEl.innerHTML = `
      <img src="${file.dataUrl}" alt="${file.name}">
      <div class="media-info">
        <span>${date}</span>
      </div>
      <button class="options-btn">...</button>
      <div class="context-menu">
        <button class="delete-btn">Supprimer</button>
      </div>
    `;
    mediaGrid.appendChild(fileEl);
  }

  function renderBreadcrumbs() {
    let path = [{ id: null, name: "Médiathèque" }];
    let parentId = currentFolderId;
    const allFolders = db.getFolders();

    while (parentId) {
      const parent = allFolders.find((f) => f.id === parentId);
      if (parent) {
        path.unshift(parent);
        parentId = parent.parentId;
      } else {
        break;
      }
    }

    breadcrumbs.innerHTML = path
      .map((p, i) =>
        i === path.length - 1
          ? `<span>${p.name}</span>`
          : `<a href="#" data-folder-id="${p.id}">${p.name}</a>`,
      )
      .join(' <span class="separator">/</span> ');
  }

  // --- GESTION DES ÉVÉNEMENTS ---

  addImageInput.addEventListener("change", async (e) => {
    const allFiles = db.getFiles();
    for (const file of e.target.files) {
      const dataUrl = await fileToDataURL(file);
      allFiles.push({
        id: Date.now() + Math.random(),
        folderId: currentFolderId,
        name: file.name,
        dataUrl: dataUrl,
        createdAt: Date.now(),
      });
    }
    db.saveFiles(allFiles);
    render();
  });

  createFolderBtn.addEventListener("click", () => {
    const name = prompt("Nom du nouveau dossier :");
    if (name && name.trim()) {
      const allFolders = db.getFolders();
      allFolders.push({
        id: Date.now(),
        parentId: currentFolderId,
        name: name.trim(),
      });
      db.saveFolders(allFolders);
      render();
    }
  });

  mediaGrid.addEventListener("click", (e) => {
    const target = e.target;

    const folderItem = target.closest(".folder-item");
    if (folderItem && !target.closest(".options-btn")) {
      currentFolderId = Number(folderItem.dataset.folderId);
      render();
      return;
    }

    if (target.closest(".options-btn")) {
      document
        .querySelectorAll(".context-menu")
        .forEach((menu) => (menu.style.display = "none"));
      const menu = target.closest(".media-item").querySelector(".context-menu");
      menu.style.display = "block";
      return;
    }

    if (target.classList.contains("rename-btn")) {
      const folderId = Number(target.closest(".folder-item").dataset.folderId);
      const newName = prompt("Nouveau nom du dossier :");
      if (newName && newName.trim()) {
        let allFolders = db.getFolders();
        const folder = allFolders.find((f) => f.id === folderId);
        if (folder) folder.name = newName.trim();
        db.saveFolders(allFolders);
        render();
      }
    }

    if (target.classList.contains("delete-btn")) {
      const item = target.closest(".media-item");
      if (item.classList.contains("folder-item")) {
        const folderId = Number(item.dataset.folderId);
        if (confirm("Supprimer ce dossier et tout son contenu ?")) {
          let allFolders = db.getFolders();
          let allFiles = db.getFiles();
          const foldersToDelete = [folderId];
          db.saveFolders(
            allFolders.filter((f) => !foldersToDelete.includes(f.id)),
          );
          db.saveFiles(
            allFiles.filter((f) => !foldersToDelete.includes(f.folderId)),
          );
          render();
        }
      } else {
        const fileId = Number(item.dataset.fileId);
        let allFiles = db.getFiles();
        db.saveFiles(allFiles.filter((f) => f.id !== fileId));
        render();
      }
    }
  });

  breadcrumbs.addEventListener("click", (e) => {
    e.preventDefault();
    if (e.target.tagName === "A") {
      const folderId = e.target.dataset.folderId;
      currentFolderId = folderId === "null" ? null : Number(folderId);
      render();
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".options-btn")) {
      document
        .querySelectorAll(".context-menu")
        .forEach((menu) => (menu.style.display = "none"));
    }
  });

  // Initialisation
  render();
});