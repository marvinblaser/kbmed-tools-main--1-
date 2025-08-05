// js/gallery.js
document.addEventListener("DOMContentLoaded", () => {
  // --- STRUCTURE DE DONNÉES CENTRALE (AVEC DE VRAIES IMAGES) ---
  const MEDICAL_DATA = [
    {
      id: "orl",
      name: "ORL",
      // Utilisation de picsum.photos pour des images réelles
      image: "https://picsum.photos/seed/orl/220/160",
      apparatusTypes: [
        {
          id: "otoscope",
          name: "Otoscope",
          image: "https://picsum.photos/seed/otoscope/220/160",
          models: [
            {
              id: "otoscope-x100",
              name: "Modèle X-100",
              image: "https://picsum.photos/seed/x100/220/160",
              checklist: [
                { id: "x100-task1", text: "Vérifier la source lumineuse." },
                { id: "x100-task2", text: "Nettoyer la lentille grossissante." },
                { id: "x100-task3", text: "Contrôler l'état des spéculums." },
              ],
            },
            {
              id: "otoscope-y200",
              name: "Modèle Y-200",
              image: "https://picsum.photos/seed/y200/220/160",
              checklist: [
                { id: "y200-task1", text: "Tester la batterie rechargeable." },
                { id: "y200-task2", text: "Vérifier la connexion de la tête." },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "gyneco",
      name: "Gynécologie",
      image: "https://picsum.photos/seed/gyneco/220/160",
      apparatusTypes: [
        {
          id: "colposcope",
          name: "Colposcope",
          image: "https://picsum.photos/seed/colposcope/220/160",
          models: [
            {
              id: "colpo-z3",
              name: "Modèle Z-3",
              image: "https://picsum.photos/seed/z3/220/160",
              checklist: [
                { id: "z3-task1", text: "Ajuster la mise au point." },
                { id: "z3-task2", text: "Nettoyer les optiques." },
                { id: "z3-task3", text: "Vérifier le filtre vert." },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "sterilisation",
      name: "Stérilisation",
      image: "https://picsum.photos/seed/sterilisation/220/160",
      apparatusTypes: [
        {
          id: "autoclave",
          name: "Autoclave",
          image: "https://picsum.photos/seed/autoclave/220/160",
          models: [
            {
              id: "auto-s500",
              name: "Modèle S-500",
              image: "https://picsum.photos/seed/s500/220/160",
              checklist: [
                { id: "s500-task1", text: "Contrôler le joint de la porte." },
                { id: "s500-task2", text: "Lancer un cycle de test à vide." },
                { id: "s500-task3", text: "Vérifier la pression maximale." },
              ],
            },
          ],
        },
      ],
    },
  ];

  const ITEMS_PER_PAGE = 8;

  // Sélecteurs
  const galleryTitle = document.getElementById("gallery-title");
  const breadcrumbs = document.getElementById("breadcrumbs");
  const galleryContainer = document.getElementById("gallery-container");
  const paginationContainer = document.getElementById("pagination-container");
  const backBtn = document.getElementById("back-btn");
  const resetChecklistBtn = document.getElementById("reset-checklist-btn");

  let currentView = {
    domainId: null,
    apparatusId: null,
    modelId: null,
    page: 1,
  };

  // --- FONCTIONS DE RENDU ---

  function renderView() {
    galleryContainer.innerHTML = "";
    paginationContainer.innerHTML = "";
    backBtn.classList.add("hidden");
    resetChecklistBtn.classList.add("hidden");

    if (currentView.modelId) {
      const domain = MEDICAL_DATA.find((d) => d.id === currentView.domainId);
      const apparatus = domain.apparatusTypes.find(
        (a) => a.id === currentView.apparatusId,
      );
      const model = apparatus.models.find((m) => m.id === currentView.modelId);
      renderChecklist(model);
      resetChecklistBtn.classList.remove("hidden");
    } else if (currentView.apparatusId) {
      const domain = MEDICAL_DATA.find((d) => d.id === currentView.domainId);
      const apparatus = domain.apparatusTypes.find(
        (a) => a.id === currentView.apparatusId,
      );
      renderGallery(apparatus.models, "model");
    } else if (currentView.domainId) {
      const domain = MEDICAL_DATA.find((d) => d.id === currentView.domainId);
      renderGallery(domain.apparatusTypes, "apparatus");
    } else {
      renderGallery(MEDICAL_DATA, "domain");
    }
    renderBreadcrumbs();
    updateBackButtonState();
  }

  function renderGallery(items, type) {
    galleryContainer.style.display = "grid";
    const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
    const start = (currentView.page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const itemsToShow = items.slice(start, end);

    itemsToShow.forEach((item) => {
      const card = document.createElement("div");
      card.className = "gallery-card";
      card.dataset[`${type}Id`] = item.id;
      card.innerHTML = `
        <div class="card-image">
          <img src="${item.image}" alt="${item.name}">
        </div>
        <div class="card-title">${item.name}</div>
      `;
      galleryContainer.appendChild(card);
    });

    if (totalPages > 1) {
      renderPagination(totalPages);
    }
  }

  function renderPagination(totalPages) {
    let paginationHTML = `
      <button class="page-btn" data-page="${
        currentView.page - 1
      }" ${currentView.page === 1 ? "disabled" : ""}>‹</button>
    `;
    for (let i = 1; i <= totalPages; i++) {
      paginationHTML += `
        <button class="page-btn ${
          i === currentView.page ? "active" : ""
        }" data-page="${i}">${i}</button>
      `;
    }
    paginationHTML += `
      <button class="page-btn" data-page="${
        currentView.page + 1
      }" ${currentView.page === totalPages ? "disabled" : ""}>›</button>
    `;
    paginationContainer.innerHTML = paginationHTML;
  }

  function renderChecklist(model) {
    galleryContainer.style.display = "block";
    const checklistHtml = model.checklist
      .map((task) => {
        const isCompleted = localStorage.getItem(task.id) === "true";
        return `
        <div class="task-item ${isCompleted ? "completed" : ""}">
          <label class="task-checkbox">
            <input type="checkbox" data-task-id="${task.id}" ${
          isCompleted ? "checked" : ""
        }>
            <span class="custom-checkbox">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </span>
            <span class="task-label">${task.text}</span>
          </label>
        </div>
      `;
      })
      .join("");
    galleryContainer.innerHTML = `<div id="checklist-view">${checklistHtml}</div>`;
  }

  function renderBreadcrumbs() {
    const pathParts = [];
    pathParts.push(`<a href="#" data-level="root">Domaines</a>`);

    if (currentView.domainId) {
      const domain = MEDICAL_DATA.find((d) => d.id === currentView.domainId);
      pathParts.push(
        `<a href="#" data-level="domain">${domain.name}</a>`,
      );
      if (currentView.apparatusId) {
        const apparatus = domain.apparatusTypes.find(
          (a) => a.id === currentView.apparatusId,
        );
        pathParts.push(
          `<a href="#" data-level="apparatus">${apparatus.name}</a>`,
        );
        if (currentView.modelId) {
          const model = apparatus.models.find(
            (m) => m.id === currentView.modelId,
          );
          pathParts.push(`<span>${model.name}</span>`);
          galleryTitle.textContent = `Checklist : ${model.name}`;
        } else {
          galleryTitle.textContent = "Modèles d'appareils";
        }
      } else {
        galleryTitle.textContent = "Types d'appareils";
      }
    } else {
      galleryTitle.textContent = "Domaines Médicaux";
    }

    breadcrumbs.innerHTML = pathParts.join(
      ' <span class="separator">›</span> ',
    );
  }

  function updateBackButtonState() {
    if (currentView.domainId) {
      backBtn.classList.remove("hidden");
    } else {
      backBtn.classList.add("hidden");
    }
  }

  // --- GESTION DES ÉVÉNEMENTS ---

  galleryContainer.addEventListener("click", (e) => {
    const card = e.target.closest(".gallery-card");
    if (card) {
      currentView.page = 1;
      const { domainId, apparatusId, modelId } = card.dataset;
      if (modelId) {
        currentView.modelId = modelId;
      } else if (apparatusId) {
        currentView.apparatusId = apparatusId;
      } else if (domainId) {
        currentView.domainId = domainId;
      }
      renderView();
    }

    const checkbox = e.target.closest("input[type='checkbox']");
    if (checkbox) {
      const taskItem = checkbox.closest(".task-item");
      taskItem.classList.toggle("completed", checkbox.checked);
      localStorage.setItem(checkbox.dataset.taskId, checkbox.checked);
    }
  });

  breadcrumbs.addEventListener("click", (e) => {
    e.preventDefault();
    const link = e.target.closest("a");
    if (link) {
      const { level } = link.dataset;
      currentView.page = 1;
      if (level === "root") {
        currentView.domainId = null;
        currentView.apparatusId = null;
        currentView.modelId = null;
      }
      if (level === "domain") {
        currentView.apparatusId = null;
        currentView.modelId = null;
      }
      if (level === "apparatus") {
        currentView.modelId = null;
      }
      renderView();
    }
  });

  backBtn.addEventListener("click", () => {
    currentView.page = 1;
    if (currentView.modelId) {
      currentView.modelId = null;
    } else if (currentView.apparatusId) {
      currentView.apparatusId = null;
    } else if (currentView.domainId) {
      currentView.domainId = null;
    }
    renderView();
  });

  paginationContainer.addEventListener("click", (e) => {
    const pageBtn = e.target.closest(".page-btn");
    if (pageBtn && !pageBtn.disabled) {
      currentView.page = parseInt(pageBtn.dataset.page);
      renderView();
    }
  });

  resetChecklistBtn.addEventListener("click", () => {
    if (!currentView.modelId) return;

    const domain = MEDICAL_DATA.find((d) => d.id === currentView.domainId);
    const apparatus = domain.apparatusTypes.find(
      (a) => a.id === currentView.apparatusId,
    );
    const model = apparatus.models.find((m) => m.id === currentView.modelId);

    if (model && model.checklist) {
      model.checklist.forEach((task) => {
        localStorage.setItem(task.id, "false");
      });
      renderView();
    }
  });

  // --- INITIALISATION ---
  renderView();
});