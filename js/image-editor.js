// js/image-editor.js

// Simulation simple pour médiathèque
const db = {
  getFolders: () => JSON.parse(localStorage.getItem("media_folders") || "[]"),
  getFiles:   () => JSON.parse(localStorage.getItem("media_files")   || "[]")
};

document.addEventListener("DOMContentLoaded", () => {
  // ==== 1) TRANSFERT via PeerJS ====
  const btnInitSender   = document.getElementById("btn-init-sender");
  const btnInitReceiver = document.getElementById("btn-init-receiver");
  const senderUI        = document.getElementById("sender-ui");
  const receiverUI      = document.getElementById("receiver-ui");
  const fileInputPeer   = document.getElementById("peer-file-input");
  const imageDisplay    = document.getElementById("image-display");

  // utilise un sessionId dans l'URL (comme avant)
  let sessionId = new URLSearchParams(location.search).get("s");
  if (!sessionId) {
    sessionId = Math.random().toString(36).slice(2);
    history.replaceState(null, "", "?s=" + sessionId);
  }
  // IDs peer
  const senderId   = sessionId + "-sender";
  const receiverId = sessionId + "-receiver";
  let peer, conn;

  // initialiser en mode RECEIVER (PC)
  btnInitReceiver.onclick = () => {
    btnInitSender.disabled   = true;
    btnInitReceiver.disabled = true;
    receiverUI.style.display = "block";

    peer = new Peer(receiverId, {
      host: 'peerjs.com', port: 443, secure: true
    });
    peer.on('error', err => alert("Peer.js error: " + err));
    peer.on('connection', c => {
      conn = c;
      conn.on('data', data => {
        // data = ArrayBuffer
        const blob = new Blob([data]);
        const url  = URL.createObjectURL(blob);
        imageDisplay.src = url;
        imageDisplay.onload = () => window._imageEditor.reset(true);
      });
    });
  };

  // initialiser en mode SENDER (téléphone)
  btnInitSender.onclick = () => {
    btnInitSender.disabled   = true;
    btnInitReceiver.disabled = true;
    senderUI.style.display    = "block";

    peer = new Peer(senderId, {
      host: 'peerjs.com', port: 443, secure: true
    });
    peer.on('error', err => alert("Peer.js error: " + err));
    // on connectera plus tard à receiver
  };

  // quand on choisit un fichier sur le téléphone
  fileInputPeer.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    // ouvrir la connexion
    conn = peer.connect(receiverId);
    conn.on('open', () => {
      const reader = new FileReader();
      reader.onload = () => {
        conn.send(reader.result); // ArrayBuffer
      };
      reader.readAsArrayBuffer(file);
    });
  };

  // ==== 2) ÉDITEUR D'IMAGES ====
  const editorTitle   = document.getElementById("editor-title");
  const imageLoader   = document.getElementById("image-loader");
  const deleteBtn     = document.getElementById("delete-btn");
  const resetBtn      = document.getElementById("reset-btn");
  const downloadBtn   = document.getElementById("download-btn");
  const downloadWrap  = document.getElementById("download-wrapper");
  const cropBtn       = document.getElementById("crop-tool-btn");
  const undoBtn       = document.getElementById("undo-btn");
  const textBtn       = document.getElementById("text-tool-btn");
  const textPanel     = document.getElementById("text-panel");
  const closeTextBtn  = document.getElementById("close-text-panel-btn");
  const textInput     = document.getElementById("text-panel-input");
  const textColor     = document.getElementById("text-panel-color");
  const addTextBtn    = document.getElementById("add-text-btn");
  const cropActions   = document.getElementById("crop-actions");
  const confirmCrop   = document.getElementById("confirm-crop-btn");
  const cancelCrop    = document.getElementById("cancel-crop-btn");
  const imgContainer  = document.getElementById("image-container");
  const modalGrid     = document.getElementById("modal-media-grid");
  const openMediaBtn  = document.getElementById("open-media-library-btn");
  const modalOverlay  = document.getElementById("media-modal");
  const closeModalBtn = document.getElementById("close-media-modal-btn");

  let isDragging = false, offsetX, offsetY, cropper, undoHistory = [], selectedText;

  function getState() {
    const texts = [];
    imgContainer.querySelectorAll(".text-overlay").forEach(el => {
      texts.push({
        content: el.innerText,
        left:    el.style.left,
        top:     el.style.top,
        bgColor: el.style.backgroundColor,
        color:   el.style.color
      });
    });
    return { img: imageDisplay.src, texts };
  }
  function save() {
    undoHistory.push(getState());
    undoBtn.disabled = undoHistory.length<=1;
  }
  function restore(st) {
    imageDisplay.src = st.img;
    imgContainer.querySelectorAll(".text-overlay").forEach(e=>e.remove());
    st.texts.forEach(t=>createText(t));
  }
  undoBtn.onclick = () => {
    if(undoHistory.length>1){
      undoHistory.pop();
      restore(undoHistory[undoHistory.length-1]);
      undoBtn.disabled = undoHistory.length<=1;
    }
  };

  function createText(data){
    const div = document.createElement("div");
    div.className="text-overlay";
    div.innerText=data.content;
    div.style.left=data.left; div.style.top=data.top;
    div.style.backgroundColor=data.bgColor; div.style.color=data.color;
    div.onmousedown=e=>{
      selectedText=div; isDragging=true;
      offsetX=e.clientX-div.getBoundingClientRect().left;
      offsetY=e.clientY-div.getBoundingClientRect().top;
      div.style.cursor="grabbing";
      e.stopPropagation();
    };
    div.onclick=e=>{selectText(div);e.stopPropagation()};
    imgContainer.append(div);
  }
  function selectText(el){
    if(selectedText)selectedText.classList.remove("selected");
    selectedText=el;
    if(el)el.classList.add("selected");
    deleteBtn.disabled = !el;
  }

  imageLoader.onchange=e=>{
    const f=e.target.files[0];
    if(!f)return;
    const r=new FileReader();
    r.onload=ev=>{imageDisplay.src=ev.target.result;imageDisplay.onload=()=>reset(true)};
    r.readAsDataURL(f);
  };

  addTextBtn.onclick=()=>{
    const txt=textInput.value.trim(); if(!txt)return;
    createText({content:txt,left:"50px",top:"50px",bgColor:textColor.value,color:"black"});
    textInput.value=""; textPanel.classList.add("hidden"); save();
  };
  closeTextBtn.onclick=()=>textPanel.classList.add("hidden");
  textBtn.onclick=()=>textPanel.classList.toggle("hidden");

  document.onmousemove=e=>{
    if(isDragging&&selectedText){
      const pr=imgContainer.getBoundingClientRect();
      selectedText.style.left=`${e.clientX-pr.left-offsetX}px`;
      selectedText.style.top=`${e.clientY-pr.top-offsetY}px`;
    }
  };
  document.onmouseup=()=>{
    if(isDragging){isDragging=false; if(selectedText)selectedText.style.cursor="grab"; save()}
  };
  deleteBtn.onclick=()=>{
    if(selectedText){selectedText.remove(); selectText(null); save()}
  };

  resetBtn.onclick=()=>reset(false);
  function reset(isNew){
    imgContainer.querySelectorAll(".text-overlay").forEach(e=>e.remove());
    selectText(null);
    if(!isNew)imageDisplay.src="";
    undoHistory=[]; save();
  }

  downloadBtn.onclick=()=>{
    selectText(null);
    html2canvas(imgContainer).then(c=>{
      const cr=imgContainer.getBoundingClientRect();
      const ir=imageDisplay.getBoundingClientRect();
      const x=ir.left-cr.left,y=ir.top-cr.top,w=ir.width,h=ir.height;
      const c2=document.createElement("canvas"); c2.width=w; c2.height=h;
      c2.getContext("2d").drawImage(c,x,y,w,h,0,0,w,h);
      const a=document.createElement("a");
      a.download="image.png"; a.href=c2.toDataURL("image/png"); a.click();
    });
  };

  function enterCrop(){
    if(!imageDisplay.src||cropper)return;
    editorTitle.innerText="Rogner"; mainControls.classList.add("hidden");
    downloadWrapper.classList.add("hidden"); cropActions.classList.remove("hidden");
    imgContainer.querySelectorAll(".text-overlay").forEach(e=>e.style.display="none");
    cropper=new Cropper(imageDisplay,{viewMode:1,background:false});
  }
  function exitCrop(){
    if(!cropper)return;
    editorTitle.innerText="Éditeur"; cropper.destroy(); cropper=null;
    mainControls.classList.remove("hidden"); downloadWrapper.classList.remove("hidden");
    cropActions.classList.add("hidden");
    imgContainer.querySelectorAll(".text-overlay").forEach(e=>e.style.display="block");
  }
  cropToolBtn.onclick=enterCrop;
  cancelCropBtn.onclick=exitCrop;
  confirmCropBtn.onclick=()=>{
    if(!cropper)return;
    const d=cropper.getData(), cc=cropper.getCroppedCanvas();
    imageDisplay.src=cc.toDataURL("image/png");
    imageDisplay.onload=()=>{
      imgContainer.querySelectorAll(".text-overlay").forEach(td=>{
        td.style.left=`${parseFloat(td.style.left)-d.x}px`;
        td.style.top =`${parseFloat(td.style.top)-d.y}px`;
      });
      exitCrop(); save();
    };
  };

  // expose API
  window._imageEditor={imageDisplay,reset};

  // init
  saveState();
});