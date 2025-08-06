// js/image-editor.js

// Simu de base de données pour la médiathèque
const db = {
  getFolders: () =>
    JSON.parse(localStorage.getItem("media_folders") || "[]"),
  getFiles: () => JSON.parse(localStorage.getItem("media_files") || "[]")
};

document.addEventListener("DOMContentLoaded", () => {
  // ===== P2P via WebTorrent + Firebase =====
  const torrentClient = new WebTorrent();
  // sessionId défini dans image-editor.html inline script
  const sessionRef = firebase.database().ref("sessions/" + sessionId);

  // Émetteur (téléphone)
  const fileInputTorrent = document.getElementById("torrent-file-input");
  const magnetUriTextarea = document.getElementById("magnet-uri");
  fileInputTorrent.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    torrentClient.seed(file, (torrent) => {
      const uri = torrent.magnetURI;
      magnetUriTextarea.value = uri;
      // pousse dans Firebase pour le PC
      sessionRef.set({ magnet: uri });
    });
  });

  // Récepteur (PC)
  const magnetUriInput = document.getElementById("magnet-uri-input");
  sessionRef.on("value", (snap) => {
    const data = snap.val();
    if (data && data.magnet) {
      magnetUriInput.value = data.magnet;
      startDownload(data.magnet);
    }
  });

  function startDownload(uri) {
    torrentClient.add(uri, (torrent) => {
      torrent.files[0].getBlobURL((err, url) => {
        if (err) return console.error(err);
        window._imageEditor.imageDisplay.src = url;
        window._imageEditor.imageDisplay.onload = () => {
          window._imageEditor.reset(true);
        };
      });
    });
  }

  // ===== ÉDITEUR D'IMAGES =====
  const editorTitle = document.getElementById("editor-title");
  const imageContainer = document.getElementById("image-container");
  const imageDisplay = document.getElementById("image-display");
  const imageLoader = document.getElementById("image-loader");
  const deleteBtn = document.getElementById("delete-btn");
  const resetBtn = document.getElementById("reset-btn");
  const downloadBtn = document.getElementById("download-btn");
  const downloadWrapper = document.getElementById("download-wrapper");
  const cropToolBtn = document.getElementById("crop-tool-btn");
  const undoBtn = document.getElementById("undo-btn");
  const textToolBtn = document.getElementById("text-tool-btn");
  const textPanel = document.getElementById("text-panel");
  const closeTextPanelBtn = document.getElementById("close-text-panel-btn");
  const textPanelInput = document.getElementById("text-panel-input");
  const textPanelColor = document.getElementById("text-panel-color");
  const addTextBtn = document.getElementById("add-text-btn");
  const mainControls = document.getElementById("main-controls");
  const cropActions = document.getElementById("crop-actions");
  const confirmCropBtn = document.getElementById("confirm-crop-btn");
  const cancelCropBtn = document.getElementById("cancel-crop-btn");
  const openMediaLibraryBtn = document.getElementById(
    "open-media-library-btn"
  );
  const mediaModal = document.getElementById("media-modal");
  const closeModalBtn = document.getElementById("close-media-modal-btn");
  const modalMediaGrid = document.getElementById("modal-media-grid");

  let selectedTextElement = null;
  let isDragging = false;
  let offsetX, offsetY;
  let cropper = null;
  let history = [];
  let currentModalFolderId = null;

  // Historique (undo)
  function getCurrentState() {
    const texts = [];
    imageContainer.querySelectorAll(".text-overlay").forEach((el) => {
      texts.push({
        content: el.innerText,
        left: el.style.left,
        top: el.style.top,
        bgColor: el.style.backgroundColor,
        color: el.style.color
      });
    });
    return { imageSrc: imageDisplay.src, texts };
  }
  function saveState() {
    history.push(getCurrentState());
    undoBtn.disabled = history.length <= 1;
  }
  function restoreState(state) {
    imageDisplay.src = state.imageSrc;
    imageContainer
      .querySelectorAll(".text-overlay")
      .forEach((el) => el.remove());
    state.texts.forEach((t) => createTextElement(t));
  }
  undoBtn.addEventListener("click", () => {
    if (history.length > 1) {
      history.pop();
      restoreState(history[history.length - 1]);
      undoBtn.disabled = history.length <= 1;
    }
  });

  // Médiathèque
  function renderModalMedia() {
    modalMediaGrid.innerHTML = "";
    const allFolders = db.getFolders();
    const allFiles = db.getFiles();
    allFolders
      .filter((f) => f.parentId === currentModalFolderId)
      .forEach((folder) => {
        const div = document.createElement("div");
        div.className = "media-item folder-item";
        div.dataset.folderId = folder.id;
        div.innerHTML = `
          <div><svg class="folder-icon" xmlns="http://www.w3.org/2000/svg"
            fill="none" viewBox="0 0 24 24" stroke-width="1.5"
            stroke="currentColor"><path stroke-linecap="round"
            stroke-linejoin="round"
            d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5
               9.75h15A2.25 2.25 0 0 1 21.75
               12v.75m-8.69-6.44-2.12-2.12a1.5
               1.5 0 0 0-1.061-.44H4.5A2.25
               2.25 0 0 0 2.25 6v12a2.25
               2.25 0 0 0 2.25 2.25h15A2.25
               2.25 0 0 0 21.75 18V9a2.25
               2.25 0 0 0-2.25-2.25h-5.379a1.5
               1.5 0 0 1-1.06-.44Z"/></svg></div>
          <span class="folder-name">${folder.name}</span>`;
        modalMediaGrid.appendChild(div);
      });
    allFiles
      .filter((f) => f.folderId === currentModalFolderId)
      .forEach((file) => {
        const div = document.createElement("div");
        div.className = "media-item media-thumbnail";
        div.dataset.fileId = file.id;
        div.innerHTML = `<img src="${file.dataUrl}" alt="${file.name}">`;
        modalMediaGrid.appendChild(div);
      });
  }
  openMediaLibraryBtn.addEventListener("click", () => {
    currentModalFolderId = null;
    renderModalMedia();
    mediaModal.classList.remove("hidden");
  });
  closeModalBtn.addEventListener("click", () => {
    mediaModal.classList.add("hidden");
  });
  modalMediaGrid.addEventListener("click", (e) => {
    const folder = e.target.closest(".folder-item");
    if (folder) {
      currentModalFolderId = +folder.dataset.folderId;
      renderModalMedia();
      return;
    }
    const thumb = e.target.closest(".media-thumbnail");
    if (thumb) {
      const fid = +thumb.dataset.fileId;
      const file = db.getFiles().find((f) => f.id === fid);
      if (file) {
        imageDisplay.src = file.dataUrl;
        imageDisplay.onload = () => reset(true);
        mediaModal.classList.add("hidden");
      }
    }
  });

  // Texte
  function toggleTextPanel() {
    textPanel.classList.toggle("hidden");
  }
  textToolBtn.addEventListener("click", toggleTextPanel);
  closeTextPanelBtn.addEventListener("click", toggleTextPanel);
  function createTextElement(data) {
    const div = document.createElement("div");
    div.className = "text-overlay";
    div.innerText = data.content;
    div.style.left = data.left;
    div.style.top = data.top;
    div.style.backgroundColor = data.bgColor;
    div.style.color = data.color;
    div.addEventListener("click", (ev) => {
      ev.stopPropagation();
      selectText(div);
    });
    div.addEventListener("mousedown", (ev) => {
      ev.stopPropagation();
      selectText(div);
      isDragging = true;
      offsetX = ev.clientX - div.getBoundingClientRect().left;
      offsetY = ev.clientY - div.getBoundingClientRect().top;
      div.style.cursor = "grabbing";
    });
    imageContainer.appendChild(div);
    return div;
  }
  function selectText(el) {
    if (selectedTextElement) {
      selectedTextElement.classList.remove("selected");
    }
    selectedTextElement = el;
    if (el) el.classList.add("selected");
    deleteBtn.disabled = !el;
  }

  // Chargement local
  imageLoader.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      imageDisplay.src = ev.target.result;
      imageDisplay.onload = () => reset(true);
    };
    reader.readAsDataURL(file);
  });

  addTextBtn.addEventListener("click", () => {
    const val = textPanelInput.value.trim();
    if (!val) return;
    createTextElement({
      content: val,
      left: "50px",
      top: "50px",
      bgColor: textPanelColor.value,
      color: "black"
    });
    textPanelInput.value = "";
    toggleTextPanel();
    saveState();
  });
  document.addEventListener("mousemove", (e) => {
    if (isDragging && selectedTextElement) {
      const pr = imageContainer.getBoundingClientRect();
      selectedTextElement.style.left = `${e.clientX - pr.left - offsetX}px`;
      selectedTextElement.style.top = `${e.clientY - pr.top - offsetY}px`;
    }
  });
  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      if (selectedTextElement) selectedTextElement.style.cursor = "grab";
      saveState();
    }
  });
  deleteBtn.addEventListener("click", () => {
    if (selectedTextElement) {
      selectedTextElement.remove();
      selectText(null);
      saveState();
    }
  });

  // Reset
  function reset(isNew = false) {
    imageContainer
      .querySelectorAll(".text-overlay")
      .forEach((el) => el.remove());
    selectText(null);
    if (!isNew) imageDisplay.src = "";
    history = [];
    saveState();
  }
  resetBtn.addEventListener("click", () => reset(false));

  // Télécharger
  downloadBtn.addEventListener("click", () => {
    selectText(null);
    html2canvas(imageContainer).then((canvas) => {
      const cR = imageContainer.getBoundingClientRect();
      const iR = imageDisplay.getBoundingClientRect();
      const x = iR.left - cR.left;
      const y = iR.top - cR.top;
      const w = iR.width;
      const h = iR.height;
      const c2 = document.createElement("canvas");
      c2.width = w;
      c2.height = h;
      c2.getContext("2d").drawImage(canvas, x, y, w, h, 0, 0, w, h);
      const link = document.createElement("a");
      link.download = "image-modifiee.png";
      link.href = c2.toDataURL("image/png");
      link.click();
    });
  });

  // Rogner
  function enterCropMode() {
    if (!imageDisplay.src || cropper) return;
    editorTitle.innerText = "Rogner l'image";
    mainControls.classList.add("hidden");
    downloadWrapper.classList.add("hidden");
    cropActions.classList.remove("hidden");
    imageContainer
      .querySelectorAll(".text-overlay")
      .forEach((el) => (el.style.display = "none"));
    cropper = new Cropper(imageDisplay, { viewMode: 1, background: false });
  }
  function exitCropMode() {
    if (!cropper) return;
    editorTitle.innerText = "Éditeur d'images";
    cropper.destroy();
    cropper = null;
    mainControls.classList.remove("hidden");
    downloadWrapper.classList.remove("hidden");
    cropActions.classList.add("hidden");
    imageContainer
      .querySelectorAll(".text-overlay")
      .forEach((el) => (el.style.display = "block"));
  }
  cropToolBtn.addEventListener("click", enterCropMode);
  cancelCropBtn.addEventListener("click", exitCropMode);
  confirmCropBtn.addEventListener("click", () => {
    if (!cropper) return;
    const data = cropper.getData();
    const cc = cropper.getCroppedCanvas();
    imageDisplay.src = cc.toDataURL("image/png");
    imageDisplay.onload = () => {
      imageContainer
        .querySelectorAll(".text-overlay")
        .forEach((textDiv) => {
          const lx = parseFloat(textDiv.style.left) - data.x;
          const ty = parseFloat(textDiv.style.top) - data.y;
          textDiv.style.left = `${lx}px`;
          textDiv.style.top = `${ty}px`;
        });
      exitCropMode();
      saveState();
    };
  });

  // Initialisation
  saveState();

  // Expose pour le P2P
  window._imageEditor = {
    imageDisplay,
    reset
  };
});