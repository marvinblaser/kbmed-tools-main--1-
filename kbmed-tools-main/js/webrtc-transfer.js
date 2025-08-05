// js/webrtc-transfer.js
// -------------------------------------------------
// P2P image transfer via WebRTC DataChannel
// -------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const rtcConfig = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  };
  let pc, dataChannel;

  // Helpers vers l’éditeur
  function setReceivedImage(url) {
    const { imageDisplay, reset } = window._imageEditor;
    imageDisplay.src = url;
    imageDisplay.onload = () => reset(true);
  }

  // === ÉMETTEUR (téléphone) ===
  function setupSender() {
    pc = new RTCPeerConnection(rtcConfig);
    dataChannel = pc.createDataChannel("fileChannel");
    dataChannel.binaryType = "arraybuffer";

    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === "complete") {
        offerTextarea.value = pc.localDescription.sdp;
      }
    };

    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .catch(console.error);

    fileInput.addEventListener("change", evt => {
      const file = evt.target.files[0];
      if (!file || dataChannel.readyState !== "open") return;
      const reader = new FileReader();
      reader.onload = e => dataChannel.send(e.target.result);
      reader.readAsArrayBuffer(file);
    });

    btnApplyAnswer.addEventListener("click", () => {
      const answer = answerSenderTextarea.value.trim();
      if (!answer) return;
      pc.setRemoteDescription({ type: "answer", sdp: answer }).catch(
        console.error
      );
    });
  }

  // === RÉCEPTEUR (PC) ===
  function setupReceiver() {
    pc = new RTCPeerConnection(rtcConfig);

    pc.ondatachannel = ev => {
      dataChannel = ev.channel;
      dataChannel.binaryType = "arraybuffer";
      const buffers = [];
      dataChannel.onmessage = evt => {
        buffers.push(evt.data);
        // on suppose un unique send, on reconstitue tout de suite
        const blob = new Blob(buffers);
        const url = URL.createObjectURL(blob);
        setReceivedImage(url);
      };
    };

    btnApplyOffer.addEventListener("click", () => {
      const offer = offerReceiverTextarea.value.trim();
      if (!offer) return;
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === "complete") {
          answerPreTextarea.value = pc.localDescription.sdp;
        }
      };
      pc.setRemoteDescription({ type: "offer", sdp: offer })
        .then(() => pc.createAnswer())
        .then(ans => pc.setLocalDescription(ans))
        .catch(console.error);
    });
  }

  // Liens DOM
  const btnStartSender = document.getElementById("start-sender");
  const btnStartReceiver = document.getElementById("start-receiver");
  const senderControls = document.getElementById("sender-controls");
  const receiverControls = document.getElementById("receiver-controls");
  const offerTextarea = document.getElementById("offer-sender");
  const answerSenderTextarea = document.getElementById("answer-sender");
  const fileInput = document.getElementById("webrtc-file-input");
  const offerReceiverTextarea = document.getElementById("offer-receiver");
  const btnApplyOffer = document.getElementById("btn-apply-offer");
  const answerPreTextarea = document.getElementById("answer-pre");
  const btnApplyAnswer = document.getElementById("btn-apply-answer");

  btnStartSender.onclick = () => {
    senderControls.style.display = "block";
    receiverControls.style.display = "none";
    setupSender();
  };
  btnStartReceiver.onclick = () => {
    senderControls.style.display = "none";
    receiverControls.style.display = "block";
    setupReceiver();
  };
});