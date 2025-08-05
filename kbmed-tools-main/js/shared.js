// js/shared.js

function setupLayout() {
  const headerContainer = document.getElementById("header-container");
  const mainElement = document.querySelector("main");
  if (!headerContainer || !mainElement) return;

  const menuItems = [
    { type: "link", href: "index.html", text: "Accueil" },
    {
      type: "category",
      text: "Validation",
      items: [
        { href: "image-editor.html", text: "Éditeur d'images" },
        { href: "pdf-merger.html", text: "Fusionneur de PDF" },
        { href: "checklist.html", text: "Checklist Validation" },
      ],
    },
    {
      type: "category",
      text: "Service",
      items: [
        { href: "mediatheque.html", text: "Médiathèque" },
        { href: "gallery.html", text: "Galerie Appareils" },
        { href: "checklist-service.html", text: "Checklist Service" },
      ],
    },
  ];

  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  const navHTML = menuItems
    .map((item) => {
      if (item.type === "link") {
        return `<a href="${item.href}" class="${
          currentPage === item.href ? "active" : ""
        }">${item.text}</a>`;
      }

      if (item.type === "category") {
        const subItemsHTML = item.items
          .map(
            (subItem) => `
              <li>
                <a href="${subItem.href}" class="${
              currentPage === subItem.href ? "active" : ""
            }">${subItem.text}</a>
              </li>
            `,
          )
          .join("");

        const isOpen = item.items.some((subItem) => currentPage === subItem.href);

        return `
          <details class="nav-category" ${isOpen ? "open" : ""}>
            <summary>${item.text}</summary>
            <ul>${subItemsHTML}</ul>
          </details>
        `;
      }
      return "";
    })
    .join("");

  headerContainer.innerHTML = `
    <header>
      <h1>Outils</h1>
      <nav>${navHTML}</nav>
    </header>
  `;

  const appContainer = document.createElement("div");
  appContainer.className = "app-container";
  const burgerButton = document.createElement("button");
  burgerButton.className = "burger-menu";
  burgerButton.innerHTML = "<span></span><span></span><span></span>";
  document.body.insertBefore(appContainer, headerContainer);
  document.body.insertBefore(burgerButton, document.body.firstChild);
  appContainer.appendChild(headerContainer);
  appContainer.appendChild(mainElement);
  const header = headerContainer.querySelector("header");
  burgerButton.addEventListener("click", () => {
    header.classList.toggle("nav-open");
  });
}

document.addEventListener("DOMContentLoaded", setupLayout);