// js/image-editor.js

// Simulation locale de la médiathèque
const db = {
  getFolders: () => JSON.parse(localStorage.getItem("media_folders") || "[]"),
  getFiles:   () => JSON.parse(localStorage.getItem("media_files")   || "[]")
};

document.addEventListener("DOMContentLoaded", () => {
  //
  // 1) TRANSFERT via PeerJS
  //
  const btnSender   = document.getElementById("start-sender");
  const btnReceiver = document.getElementById("start-receiver");
  const senderUI    = document.getElementById("sender-ui");
  const receiverUI  = document.getElementById("receiver-ui");
  const fileInput   = document.getElementById("peer-file-input");
  const imgDisplay  = document.getElementById("image-display");

  // sessionId unique
  let sessionId = new URLSearchParams(location.search).get("s");
  if (!sessionId) {
    sessionId = Math.random().toString(36).slice(2);
    history.replaceState(null, "", "?s=" + sessionId);
  }
  const senderId   = sessionId + "-sender";
  const receiverId = sessionId + "-receiver";
  let peer, conn;

  // Mode Réception (PC)
  btnReceiver.onclick = () => {
    btnSender.disabled = btnReceiver.disabled = true;
    receiverUI.style.display = "block";
    peer = new Peer(receiverId, {
      host: "0.peerjs.com", port: 443, secure: true, key: "peerjs", path: "/"
    });
    peer.on("connection", c => {
      conn = c;
      conn.on("data", data => {
        // reçoit ArrayBuffer → Blob
        const blob = new Blob([data]);
        const url  = URL.createObjectURL(blob);
        imgDisplay.src = url;
        imgDisplay.onload = () => window._imageEditor.reset(true);
      });
    });
  };

  // Mode Émission (téléphone)
  btnSender.onclick = () => {
    btnSender.disabled = btnReceiver.disabled = true;
    senderUI.style.display = "block";
    peer = new Peer(senderId, {
      host: "0.peerjs.com", port: 443, secure: true, key: "peerjs", path: "/"
    });
  };

  fileInput.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    conn = peer.connect(receiverId);
    conn.on("open", () => {
      const reader = new FileReader();
      reader.onload = () => conn.send(reader.result);
      reader.readAsArrayBuffer(file);
    });
  };

  //
  // 2) ÉDITEUR D'IMAGES
  //
  const editorTitle         = document.getElementById("editor-title");
  const imageContainer      = document.getElementById("image-container");
  const imageLoader         = document.getElementById("image-loader");
  const deleteBtn           = document.getElementById("delete-btn");
  const resetBtn            = document.getElementById("reset-btn");
  const downloadBtn         = document.getElementById("download-btn");
  const downloadWrapper     = document.getElementById("download-wrapper");
  const cropBtn             = document.getElementById("crop-tool-btn");
  const undoBtn             = document.getElementById("undo-btn");
  const textBtn             = document.getElementById("text-tool-btn");
  const textPanel           = document.getElementById("text-panel");
  const closeTextBtn        = document.getElementById("close-text-panel-btn");
  const textInput           = document.getElementById("text-panel-input");
  const textColor           = document.getElementById("text-panel-color");
  const addTextBtn          = document.getElementById("add-text-btn");
  const mainControls        = document.getElementById("main-controls");
  const cropActions         = document.getElementById("crop-actions");
  const confirmCropBtn      = document.getElementById("confirm-crop-btn");
  const cancelCropBtn       = document.getElementById("cancel-crop-btn");
  const openMediaBtn        = document.getElementById("open-media-library-btn");
  const mediaModal          = document.getElementById("media-modal");
  const closeMediaBtn       = document.getElementById("close-media-modal-btn");
  const modalMediaGrid      = document.getElementById("modal-media-grid");

  let selectedTextElement = null,
      isDragging          = false,
      offsetX, offsetY,
      cropper             = null,
      undoHistory         = [],
      currentModalFolderId= null;

  // --- HISTORIQUE (UNDO) ---
  function getCurrentState() {
    const texts = [];
    imageContainer.querySelectorAll(".text-overlay").forEach(el => {
      texts.push({
        content: el.innerText,
        left:    el.style.left,
        top:     el.style.top,
        bgColor: el.style.backgroundColor,
        color:   el.style.color
      });
    });
    return { imageSrc: imgDisplay.src, texts };
  }
  function saveState() {
    undoHistory.push(getCurrentState());
    undoBtn.disabled = undoHistory.length <= 1;
  }
  function restoreState(state) {
    imgDisplay.src = state.imageSrc;
    imageContainer.querySelectorAll(".text-overlay").forEach(el => el.remove());
    state.texts.forEach(t => createText(t));
  }
  undoBtn.onclick = () => {
    if (undoHistory.length > 1) {
      undoHistory.pop();
      restoreState(undoHistory[undoHistory.length - 1]);
      undoBtn.disabled = undoHistory.length <= 1;
    }
  };

  // --- MÉDIATHÈQUE ---
  function renderModalMedia() {
    modalMediaGrid.innerHTML = "";
    const folders = db.getFolders(),
          files   = db.getFiles();
    folders.filter(f => f.parentId === currentModalFolderId).forEach(folder => {
      const d = document.createElement("div");
      d.className = "media-item folder-item";
      d.dataset.folderId = folder.id;
      d.innerHTML = `<svg class="folder-icon"></svg><span>${folder.name}</span>`;
      modalMediaGrid.appendChild(d);
    });
    files.filter(f => f.folderId === currentModalFolderId).forEach(file => {
      const d = document.createElement("div");
      d.className = "media-item media-thumbnail";
      d.dataset.fileId = file.id;
      d.innerHTML = `<img src="${file.dataUrl}" alt="${file.name}">`;
      modalMediaGrid.appendChild(d);
    });
  }
  openMediaBtn.onclick = () => {
    currentModalFolderId = null;
    renderModalMedia();
    mediaModal.classList.remove("hidden");
  };
  closeMediaBtn.onclick = () => mediaModal.classList.add("hidden");
  modalMediaGrid.onclick = e => {
    const fld = e.target.closest(".folder-item");
    if (fld) {
      currentModalFolderId = +fld.dataset.folderId;
      renderModalMedia();
      return;
    }
    const thumb = e.target.closest(".media-thumbnail");
    if (thumb) {
      const id = +thumb.dataset.fileId;
      const f  = db.getFiles().find(x => x.id === id);
      if (f) {
        imgDisplay.src = f.dataUrl;
        imgDisplay.onload = () => reset(true);
        mediaModal.classList.add("hidden");
      }
    }
  };

  // --- TEXTE OVERLAYS ---
  function toggleTextPanel() { textPanel.classList.toggle("hidden"); }
  textBtn.onclick = toggleTextPanel;
  closeTextBtn.onclick = toggleTextPanel;
  function createText(data) {
    const d = document.createElement("div");
    d.className = "text-overlay";
    d.innerText = data.content;
    d.style.left = data.left;
    d.style.top  = data.top;
    d.style.backgroundColor = data.bgColor;
    d.style.color = data.color;
    d.onmousedown = ev => {
      ev.stopPropagation();
      selectedTextElement = d;
      isDragging = true;
      offsetX = ev.clientX - d.getBoundingClientRect().left;
      offsetY = ev.clientY - d.getBoundingClientRect().top;
      d.style.cursor = "grabbing";
    };
    d.onclick = ev => {
      ev.stopPropagation();
      if (selectedTextElement) selectedTextElement.classList.remove("selected");
      selectedTextElement = d;
      d.classList.add("selected");
      deleteBtn.disabled = false;
    };
    imageContainer.appendChild(d);
  }
  function selectText(el) {
    if (selectedTextElement) selectedTextElement.classList.remove("selected");
    selectedTextElement = el;
    if (el) el.classList.add("selected");
    deleteBtn.disabled = !el;
  }

  // Import local
  imageLoader.onchange = e => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = ev => {
      imgDisplay.src = ev.target.result;
      imgDisplay.onload = () => reset(true);
    };
    r.readAsDataURL(f);
  };
  addTextBtn.onclick = () => {
    const txt = textInput.value.trim();
    if (!txt) return;
    createText({ content: txt, left: "50px", top: "50px", bgColor: textColor.value, color:"black" });
    textInput.value = "";
    saveState();
    toggleTextPanel();
  };

  document.onmousemove = e => {
    if (isDragging && selectedTextElement) {
      const pr = imageContainer.getBoundingClientRect();
      selectedTextElement.style.left = `${e.clientX - pr.left - offsetX}px`;
      selectedTextElement.style.top  = `${e.clientY - pr.top  - offsetY}px`;
    }
  };
  document.onmouseup = () => {
    if (isDragging) {
      isDragging = false;
      if (selectedTextElement) selectedTextElement.style.cursor = "grab";
      saveState();
    }
  };
  deleteBtn.onclick = () => {
    if (selectedTextElement) {
      selectedTextElement.remove();
      selectText(null);
      saveState();
    }
  };

  // Reset
  function reset(isNew = false) {
    imageContainer.querySelectorAll(".text-overlay").forEach(el => el.remove());
    selectText(null);
    if (!isNew) imgDisplay.src = "";
    undoHistory = [];
    saveState();
  }
  resetBtn.onclick = () => reset(false);

  // Télécharger
  downloadBtn.onclick = () => {
    selectText(null);
    html2canvas(imageContainer).then(canvas => {
      const cR = imageContainer.getBoundingClientRect();
      const iR = imgDisplay.getBoundingClientRect();
      const x  = iR.left - cR.left, y = iR.top - cR.top;
      const w  = iR.width, h = iR.height;
      const c2 = document.createElement("canvas"); c2.width = w; c2.height = h;
      c2.getContext("2d").drawImage(canvas, x, y, w, h, 0, 0, w, h);
      const a = document.createElement("a");
      a.download = "image-modifiee.png";
      a.href     = c2.toDataURL("image/png");
      a.click();
    });
  };

  // Rogner
  function enterCropMode() {
    if (!imgDisplay.src || cropper) return;
    editorTitle.innerText = "Rogner l'image";
    mainControls.classList.add("hidden");
    downloadWrapper.classList.add("hidden");
    cropActions.classList.remove("hidden");
    imageContainer.querySelectorAll(".text-overlay").forEach(el=>el.style.display="none");
    cropper = new Cropper(imgDisplay, { viewMode:1, background:false });
  }
  function exitCropMode() {
    if (!cropper) return;
    editorTitle.innerText = "Éditeur d'images";
    cropper.destroy(); cropper=null;
    mainControls.classList.remove("hidden");
    downloadWrapper.classList.remove("hidden");
    cropActions.classList.add("hidden");
    imageContainer.querySelectorAll(".text-overlay").forEach(el=>el.style.display="block");
  }
  cropBtn.onclick = enterCropMode;
  cancelCropBtn.onclick = exitCropMode;
  confirmCropBtn.onclick = () => {
    if (!cropper) return;
    const data = cropper.getData();
    const cc   = cropper.getCroppedCanvas();
    imgDisplay.src = cc.toDataURL("image/png");
    imgDisplay.onload = () => {
      imageContainer.querySelectorAll(".text-overlay").forEach(td=>{
        td.style.left = `${parseFloat(td.style.left)-data.x}px`;
        td.style.top  = `${parseFloat(td.style.top)-data.y}px`;
      });
      exitCropMode(); saveState();
    };
  };

  // expose API
  window._imageEditor = { imageDisplay: imgDisplay, reset };

  // init undo
  saveState();
});