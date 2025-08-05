// js/checklist.js
document.addEventListener("DOMContentLoaded", () => {
  // --- DONNÉES : Structure contenant les deux checklists ---
  const CHECKLISTS_DATA = {
    validation: {
      name: "Validation",
      tasks: [
        {
          id: "validation-task-01",
          text: "Vérifier que l'autoclave est en dessous de 40°",
        },
        { 
          id: "validation-task-02", 
          text: "Démarrer une nouvelle session pour le test de vide (TrackSense > Démarrer les loggers)" 
        },
        { 
          id: "validation-task-03", 
          text: "Placer la sonde de vide dans le lecteur puis démarrer la lecture" 
        },
        {
          id: "validation-task-04",
          text: "Placer la sonde pour le test de vide sur une plaque",
        },
        {
          id: "validation-task-05",
          text: "Prendre en photo l'autoclave",
        },
        {
          id: "validation-task-06",
          text: "Placer la plaque avec la sonde dans l'autoclave et lancer le test de vide",
        },
        {
          id: "validation-task-07",
          text: "Prendre en photo la charge",
        },
        {
          id: "validation-task-08",
          text: "Lancer le test de vide",
        },
        {
          id: "validation-task-09",
          text: "Une fois le cycle terminé prendre en photo le ticket",
        },
        {
          id: "validation-task-10",
          text: "Enlever la sonde et la placer sur l'appareil de lecture puis lire (TrackSense > Lire les loggers)",
        },
        {
          id: "validation-task-11",
          text: "Démarrer une nouvelle session pour le Helix test (TrackSense > Démarrer les loggers)",
        },
        {
          id: "validation-task-12",
          text: "Placer les 3 sondes dans le lecteur et démarrer",
        },
        {
          id: "validation-task-13",
          text: "Placer les sondes sur les plaques et un indicateur Helix test (Type 6 18min)",
        },
        {
          id: "validation-task-14",
          text: "Prendre en photo la charge",
        },
        {
          id: "validation-task-15",
          text: "Lancer le Helix test",
        },
        {
          id: "validation-task-16",
          text: "Pendant le cycle Helix commencer le rapport du test de vide",
        },
        {
          id: "validation-task-17",
          text: "Ouvrir à nouveau la session du test de vide",
        },
        {
          id: "validation-task-18",
          text: "Ajouter les charges et les images annotées (P1, NA) (Ajout de sessions > Charges)",
        },
        {
          id: "validation-task-19",
          text: "Charger le modèle puis Afficher le rapport (table des matières, graphique, charges) (Ajout de session > Rapport > Rapport fuite d'air > Vakumtest) (Clique droit sur le rapport > Afficher)",
        },
        {
          id: "validation-task-20",
          text: "Enregistrer le rapport du test de vide (GRAD < 00,13 bar/min) (Imprimer > Enregistrer)",
        },
        {
          id: "validation-task-21",
          text: "Commencer l'introduction du rapport général (Informations client)",
        },
        {
          id: "validation-task-22",
          text: "Une fois le Helix test fini prendre en photo le ticket et l'indicateur",
        },
        {
          id: "validation-task-23",
          text: "Enlever les sondes et les placer sur l'appareil de lecture puis lire (TrackSense > Lire les loggers)",
        },
        {
          id: "validation-task-24",
          text: "Démarrer une nouvelle session pour le cycle Prion (TrackSense > Démarrer les loggers)",
        },
        {
          id: "validation-task-25",
          text: "Placer les 3 sondes dans le lecteur et démarrer",
        },
        {
          id: "validation-task-26",
          text: "Placer les sondes sur les plaques et un indicateur Prion",
        },
        {
          id: "validation-task-27",
          text: "Prendre en photo la charge",
        },
        {
          id: "validation-task-28",
          text: "Lancer le cycle Prion",
        },
        {
          id: "validation-task-29",
          text: "Pendant le cycle Prion commencer le rapport du Helix test",
        },
        {
          id: "validation-task-30",
          text: "Ajouter des marqueurs situés pendant le cycle (Ajout de session > Marquer temps)",
        },
        {
          id: "validation-task-31",
          text: "Ajouter les images annotées (P1, T1, T2, T3)",
        },
        {
          id: "validation-task-32",
          text: "Afficher le rapport (table des matières, graphique, charges) (Ajout de session > Rapport > Rapport de limite)",
        },
        {
          id: "validation-task-33",
          text: "Enregistrer le rapport du Helix test",
        },
        {
          id: "validation-task-34",
          text: "Une fois le cycle Prion fini prendre en photo le ticket et l'indicateur",
        },
        {
          id: "validation-task-35",
          text: "Enlever les sondes et les placer sur l'appareil de lecture puis lire (TrackSense > Lire les loggers)",
        },
        {
          id: "validation-task-36",
          text: "Etablir le rapport du cycle Prion",
        },
        {
          id: "validation-task-37",
          text: "Ajouter les images annotées",
        }
      ],
    },
    first_validation: {
      name: "1ère Validation",
      tasks: [
        {
          id: "first-validation-task-01",
          text: "Valider le cahier des charges",
        },
        { id: "first-validation-task-02", text: "Confirmer les maquettes UI/UX" },
        {
          id: "first-validation-task-03",
          text: "Définir l'architecture technique",
        },
        { id: "first-validation-task-04", text: "Planifier les sprints" },
      ],
    },
  };

  // Sélecteurs
  const taskListContainer = document.getElementById("task-list-container");
  const resetBtn = document.getElementById("reset-checklist-btn");
  const tabButtons = document.querySelectorAll(".tab-btn");

  // Variable pour savoir quelle checklist est active
  let activeChecklistKey = "validation";

  // --- FONCTIONS ---

  /**
   * Génère et affiche les tâches pour une checklist donnée.
   * @param {string} checklistKey - La clé de la checklist à afficher (ex: "validation").
   */
  function renderTasks(checklistKey) {
    taskListContainer.innerHTML = "";
    const checklist = CHECKLISTS_DATA[checklistKey];
    if (!checklist) return;

    checklist.tasks.forEach((task) => {
      const taskItem = document.createElement("div");
      taskItem.className = "task-item";
      const isCompleted = localStorage.getItem(task.id) === "true";
      if (isCompleted) {
        taskItem.classList.add("completed");
      }

      taskItem.innerHTML = `
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
      `;

      const checkbox = taskItem.querySelector("input[type='checkbox']");
      checkbox.addEventListener("change", () => {
        taskItem.classList.toggle("completed", checkbox.checked);
        localStorage.setItem(task.id, checkbox.checked);
      });

      taskListContainer.appendChild(taskItem);
    });
  }

  // --- GESTION DES ÉVÉNEMENTS ---

  // Gère le clic sur les onglets
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      // Met à jour le style des boutons
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      // Met à jour la checklist active et la réaffiche
      activeChecklistKey = button.dataset.checklist;
      renderTasks(activeChecklistKey);
    });
  });

  // Gère le clic sur le bouton de réinitialisation
  resetBtn.addEventListener("click", () => {
    const checklist = CHECKLISTS_DATA[activeChecklistKey];
    if (!checklist) return;

    checklist.tasks.forEach((task) => {
      localStorage.setItem(task.id, "false");
    });

    // Regénère l'affichage pour refléter les changements
    renderTasks(activeChecklistKey);
  });

  // --- INITIALISATION ---
  // Affiche la première checklist au chargement de la page
  renderTasks(activeChecklistKey);
});