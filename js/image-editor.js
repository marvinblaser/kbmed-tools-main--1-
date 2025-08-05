// js/image-editor.js

// --- SIMULATION DE BASE DE DONNÉES (copiée pour l'accès) ---
const db = {
  getFolders: () =>
    JSON.parse(localStorage.getItem("media_folders") || "[]"),
  getFiles: () => JSON.parse(localStorage.getItem("media_files") || "[]")
};

document.addEventListener("DOMContentLoaded", () => {
  // Sélecteurs
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

  // Variables d'état
  let selectedTextElement = null;
  let isDragging = false;
  let offsetX, offsetY;
  let cropper = null;
  let history = [];
  let currentModalFolderId = null;

  // --- GESTION DE L'HISTORIQUE (UNDO) ---
  function getCurrentState() {
    const texts = [];
    imageContainer.querySelectorAll(".text-overlay").forEach(el => {
      texts.push({
        content: el.innerText,
        left: el.style.left,
        top: el.style.top,
        bgColor: el.style.backgroundColor,
        color: el.style.color
      });
    });
    return { imageSrc: imageDisplay.src, texts: texts };
  }

  function saveState() {
    history.push(getCurrentState());
    updateHistoryButtons();
  }

  function restoreState(state) {
    imageDisplay.src = state.imageSrc;
    imageContainer
      .querySelectorAll(".text-overlay")
      .forEach(el => el.remove());
    state.texts.forEach(textData => createTextElement(textData));
    selectText(null);
  }

  function updateHistoryButtons() {
    undoBtn.disabled = history.length <= 1;
  }

  undoBtn.addEventListener("click", () => {
    if (history.length > 1) {
      const previousState = history[history.length - 2];
      history.pop();
      restoreState(previousState);
      updateHistoryButtons();
    }
  });

  // --- GESTION DU MODAL DE LA MÉDIATHÈQUE ---
  async function renderModalMedia() {
    modalMediaGrid.innerHTML = "";
    const allFolders = db.getFolders();
    const allFiles = db.getFiles();

    const subFolders = allFolders.filter(
      f => f.parentId === currentModalFolderId
    );
    subFolders.forEach(folder => {
      const folderEl = document.createElement("div");
      folderEl.className = "media-item folder-item";
      folderEl.dataset.folderId = folder.id;
      folderEl.innerHTML = `
        <div>
          <svg class="folder-icon" xmlns="http://www.w3.org/2000/svg"
            fill="none" viewBox="0 0 24 24" stroke-width="1.5"
            stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25
                 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5
                 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25
                 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0
                 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5
                 1.5 0 0 1-1.06-.44Z" />
          </svg>
        </div>
        <span class="folder-name">${folder.name}</span>
      `;
      modalMediaGrid.appendChild(folderEl);
    });

    const filesInFolder = allFiles.filter(
      f => f.folderId === currentModalFolderId
    );
    for (const file of filesInFolder) {
      const fileEl = document.createElement("div");
      fileEl.className = "media-item media-thumbnail";
      fileEl.dataset.fileId = file.id;
      fileEl.innerHTML = `<img src="${file.dataUrl}" alt="${file.name}">`;
      modalMediaGrid.appendChild(fileEl);
    }
  }

  function openMediaModal() {
    currentModalFolderId = null;
    renderModalMedia();
    mediaModal.classList.remove("hidden");
  }

  function closeMediaModal() {
    mediaModal.classList.add("hidden");
  }

  openMediaLibraryBtn.addEventListener("click", openMediaModal);
  closeModalBtn.addEventListener("click", closeMediaModal);

  modalMediaGrid.addEventListener("click", e => {
    const folder = e.target.closest(".folder-item");
    if (folder) {
      currentModalFolderId = Number(folder.dataset.folderId);
      renderModalMedia();
      return;
    }

    const thumb = e.target.closest(".media-thumbnail");
    if (thumb) {
      const fileId = Number(thumb.dataset.fileId);
      const allFiles = db.getFiles();
      const selectedFile = allFiles.find(f => f.id === fileId);
      if (selectedFile) {
        imageDisplay.src = selectedFile.dataUrl;
        imageDisplay.onload = () => {
          reset(true);
        };
        closeMediaModal();
      }
    }
  });

  // --- GESTION DU PANNEAU DE TEXTE ---
  function toggleTextPanel() {
    textPanel.classList.toggle("hidden");
  }
  textToolBtn.addEventListener("click", toggleTextPanel);
  closeTextPanelBtn.addEventListener("click", toggleTextPanel);

  // --- GESTION DES ÉLÉMENTS ---
  function createTextElement(data) {
    const textDiv = document.createElement("div");
    textDiv.className = "text-overlay";
    textDiv.innerText = data.content;
    textDiv.style.backgroundColor = data.bgColor;
    textDiv.style.color = data.color;
    textDiv.style.left = data.left;
    textDiv.style.top = data.top;
    textDiv.addEventListener("click", e => {
      e.stopPropagation();
      selectText(textDiv);
    });
    textDiv.addEventListener("mousedown", e => {
      e.stopPropagation();
      selectText(textDiv);
      isDragging = true;
      offsetX = e.clientX - textDiv.getBoundingClientRect().left;
      offsetY = e.clientY - textDiv.getBoundingClientRect().top;
      textDiv.style.cursor = "grabbing";
    });
    imageContainer.appendChild(textDiv);
    return textDiv;
  }

  function selectText(element) {
    if (selectedTextElement) {
      selectedTextElement.classList.remove("selected");
    }
    selectedTextElement = element;
    if (selectedTextElement) {
      selectedTextElement.classList.add("selected");
    }
    deleteBtn.disabled = selectedTextElement === null;
  }

  imageLoader.addEventListener("change", e => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = event => {
        imageDisplay.src = event.target.result;
        imageDisplay.onload = () => reset(true);
      };
      reader.readAsDataURL(file);
    }
  });

  addTextBtn.addEventListener("click", () => {
    const textValue = textPanelInput.value.trim();
    if (textValue === "") return;
    createTextElement({
      content: textValue,
      left: "50px",
      top: "50px",
      bgColor: textPanelColor.value,
      color: "black"
    });
    textPanelInput.value = "";
    toggleTextPanel();
    saveState();
  });

  document.addEventListener("mousemove", e => {
    if (isDragging && selectedTextElement) {
      const parentRect = imageContainer.getBoundingClientRect();
      const newX = e.clientX - parentRect.left - offsetX;
      const newY = e.clientY - parentRect.top - offsetY;
      selectedTextElement.style.left = `${newX}px`;
      selectedTextElement.style.top = `${newY}px`;
    }
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      if (selectedTextElement) {
        selectedTextElement.style.cursor = "grab";
      }
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

  function reset(isNewImage = false) {
    imageContainer
      .querySelectorAll(".text-overlay")
      .forEach(el => el.remove());
    selectText(null);
    if (!isNewImage) imageDisplay.src = "";
    history = [];
    saveState();
  }
  resetBtn.addEventListener("click", () => reset(false));

  downloadBtn.addEventListener("click", () => {
    selectText(null);
    html2canvas(imageContainer).then(canvas => {
      const containerRect = imageContainer.getBoundingClientRect();
      const imageRect = imageDisplay.getBoundingClientRect();
      const cropX = imageRect.left - containerRect.left;
      const cropY = imageRect.top - containerRect.top;
      const cropWidth = imageRect.width;
      const cropHeight = imageRect.height;
      const croppedCanvas = document.createElement("canvas");
      croppedCanvas.width = cropWidth;
      croppedCanvas.height = cropHeight;
      const croppedCtx = croppedCanvas.getContext("2d");
      croppedCtx.drawImage(
        canvas,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight
      );
      const link = document.createElement("a");
      link.download = "image-modifiee.png";
      link.href = croppedCanvas.toDataURL("image/png");
      link.click();
    });
  });

  // --- LOGIQUE DE ROGNAGE ---
  function enterCropMode() {
    if (!imageDisplay.src || cropper) return;
    editorTitle.innerText = "Rogner l'image";
    mainControls.classList.add("hidden");
    downloadWrapper.classList.add("hidden");
    cropActions.classList.remove("hidden");
    imageContainer
      .querySelectorAll(".text-overlay")
      .forEach(el => (el.style.display = "none"));
    cropper = new Cropper(imageDisplay, {
      viewMode: 1,
      background: false
    });
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
      .forEach(el => (el.style.display = "block"));
  }

  cropToolBtn.addEventListener("click", enterCropMode);
  cancelCropBtn.addEventListener("click", exitCropMode);

  confirmCropBtn.addEventListener("click", () => {
    if (!cropper) return;
    const cropData = cropper.getData();
    const croppedCanvas = cropper.getCroppedCanvas();
    imageDisplay.src = croppedCanvas.toDataURL("image/png");
    imageDisplay.onload = () => {
      imageContainer.querySelectorAll(".text-overlay").forEach(textDiv => {
        const currentLeft = parseFloat(textDiv.style.left);
        const currentTop = parseFloat(textDiv.style.top);
        textDiv.style.left = `${currentLeft - cropData.x}px`;
        textDiv.style.top = `${currentTop - cropData.y}px`;
      });
      exitCropMode();
      saveState();
    };
  });

  // Initialisation
  saveState();

  // Expose l’éditeur pour webrtc-transfer.js
  window._imageEditor = {
    imageDisplay,
    reset
  };
});