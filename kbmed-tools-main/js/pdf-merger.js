// js/pdf-merger.js
document.addEventListener("DOMContentLoaded", () => {
  // Configuration de pdf.js
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;

  // Sélecteurs
  const pdfLoader = document.getElementById("pdf-loader");
  const uploadArea = document.querySelector(".upload-area");
  const pdfListContainer = document.getElementById("pdf-list-container");
  const mergeBtn = document.getElementById("merge-btn");

  let pdfFiles = new Map(); // Stocke les objets File par ID

  // NOUVEAU : Fonction pour mettre à jour les numéros d'ordre
  function updateOrderNumbers() {
    const cards = pdfListContainer.querySelectorAll(".pdf-card");
    cards.forEach((card, index) => {
      const numberElement = card.querySelector(".pdf-order-number");
      if (numberElement) {
        numberElement.textContent = index + 1;
      }
    });
  }

  // Initialisation de SortableJS pour le glisser-déposer
  new Sortable(pdfListContainer, {
    animation: 150,
    ghostClass: "sortable-ghost",
    // MODIFIÉ : Appel de la mise à jour des numéros à la fin du glisser-déposer
    onEnd: () => {
      updateOrderNumbers();
    },
  });

  // --- GESTION DES FICHIERS ---

  function handleFiles(files) {
    for (const file of files) {
      if (file.type === "application/pdf" && !isFileAlreadyAdded(file)) {
        const fileId = `pdf-${Date.now()}-${Math.random()}`;
        pdfFiles.set(fileId, file);
        createPdfCard(file, fileId);
      }
    }
    updateMergeButtonState();
  }

  function isFileAlreadyAdded(newFile) {
    for (const existingFile of pdfFiles.values()) {
      if (
        existingFile.name === newFile.name &&
        existingFile.size === newFile.size
      ) {
        return true;
      }
    }
    return false;
  }

  pdfLoader.addEventListener("change", (e) => {
    handleFiles(e.target.files);
  });

  // --- GESTION DU GLISSER-DÉPOSER ---

  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.classList.add("dragover");
  });
  uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("dragover");
  });
  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("dragover");
    handleFiles(e.dataTransfer.files);
  });

  // --- CRÉATION DE L'INTERFACE ---

  async function createPdfCard(file, fileId) {
    const card = document.createElement("div");
    card.className = "pdf-card";
    card.dataset.id = fileId;

    // MODIFIÉ : Ajout de l'élément pour le numéro d'ordre
    card.innerHTML = `
      <div class="pdf-order-number"></div>
      <div class="pdf-preview">
        <canvas></canvas>
      </div>
      <div class="pdf-info">
        <span class="filename" title="${file.name}">${file.name}</span>
        <span class="page-count">Chargement...</span>
      </div>
      <button class="delete-pdf-btn" title="Supprimer">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
        </svg>
      </button>
    `;

    pdfListContainer.appendChild(card);
    updateOrderNumbers(); // MODIFIÉ : Met à jour les numéros après l'ajout

    // Générer l'aperçu
    const canvas = card.querySelector("canvas");
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.5 });

      const context = canvas.getContext("2d");
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport: viewport }).promise;
      card.querySelector(".page-count").textContent = `${pdf.numPages} page(s)`;
    } catch (error) {
      console.error("Erreur de rendu PDF:", error);
      card.querySelector(".page-count").textContent = "Erreur de lecture";
    }

    // Gérer la suppression
    card.querySelector(".delete-pdf-btn").addEventListener("click", () => {
      pdfFiles.delete(fileId);
      card.remove();
      updateMergeButtonState();
      updateOrderNumbers(); // MODIFIÉ : Met à jour les numéros après la suppression
    });
  }

  function updateMergeButtonState() {
    mergeBtn.disabled = pdfFiles.size < 2;
  }

  // --- LOGIQUE DE FUSION ---

  mergeBtn.addEventListener("click", async () => {
    if (pdfFiles.size < 2) return;

    mergeBtn.disabled = true;
    mergeBtn.textContent = "Fusion en cours...";

    try {
      const { PDFDocument } = PDFLib;
      const mergedPdf = await PDFDocument.create();
      const orderedIds = [...pdfListContainer.children].map(
        (card) => card.dataset.id,
      );

      for (const fileId of orderedIds) {
        const file = pdfFiles.get(fileId);
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(
          pdf,
          pdf.getPageIndices(),
        );
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "fusion.pdf";
      link.click();
    } catch (error) {
      console.error("Erreur de fusion:", error);
      alert("Une erreur est survenue lors de la fusion des PDF.");
    } finally {
      mergeBtn.disabled = false;
      mergeBtn.textContent = "Fusionner et Télécharger";
    }
  });
});