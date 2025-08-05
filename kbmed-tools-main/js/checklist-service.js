// js/checklist-service.js
document.addEventListener("DOMContentLoaded", () => {
  // --- DONNÉES : Tâches spécifiques à la catégorie "Service" ---
  const PREDEFINED_TASKS = [
    // MODIFIÉ : Les ID sont préfixés pour éviter les conflits de localStorage
    { id: "service-task-01", text: "Confirmer la demande du client" },
    { id: "service-task-02", text: "Préparer le matériel nécessaire" },
    { id: "service-task-03", text: "Planifier l'intervention" },
    { id: "service-task-04", text: "Effectuer le service demandé" },
    { id: "service-task-05", text: "Rédiger le rapport d'intervention" },
    { id: "service-task-06", text: "Envoyer la facture au client" },
  ];

  // Sélecteurs
  const taskListContainer = document.getElementById("task-list-container");
  const resetBtn = document.getElementById("reset-checklist-btn");

  // --- FONCTIONS ---

  /**
   * Génère et affiche toutes les tâches dans le DOM.
   */
  function renderTasks() {
    // Vide le conteneur avant de tout recréer
    taskListContainer.innerHTML = "";

    PREDEFINED_TASKS.forEach((task) => {
      // Crée l'élément principal de la tâche
      const taskItem = document.createElement("div");
      taskItem.className = "task-item";

      // Récupère l'état sauvegardé (si 'true', la tâche est cochée)
      const isCompleted = localStorage.getItem(task.id) === "true";

      if (isCompleted) {
        taskItem.classList.add("completed");
      }

      // Crée la structure HTML de la tâche
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

      // Ajoute l'écouteur d'événement pour le changement d'état
      const checkbox = taskItem.querySelector("input[type='checkbox']");
      checkbox.addEventListener("change", () => {
        const taskId = checkbox.dataset.taskId;
        const isChecked = checkbox.checked;

        // Met à jour le style visuel
        taskItem.classList.toggle("completed", isChecked);

        // Sauvegarde le nouvel état dans le localStorage
        localStorage.setItem(taskId, isChecked);
      });

      // Ajoute la tâche complète au conteneur
      taskListContainer.appendChild(taskItem);
    });
  }

  /**
   * Gère le clic sur le bouton de réinitialisation.
   */
  resetBtn.addEventListener("click", () => {
    // Parcourt toutes les tâches prédéfinies
    PREDEFINED_TASKS.forEach((task) => {
      // Supprime l'état sauvegardé pour chaque tâche
      localStorage.setItem(task.id, "false");
    });

    // Regénère l'affichage pour refléter les changements
    renderTasks();
  });

  // --- INITIALISATION ---
  // Affiche les tâches au chargement de la page
  renderTasks();
});