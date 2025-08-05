// js/db-helper.js

const DB_NAME = "OutilsMediaDB";
const DB_VERSION = 1;
const STORE_NAME = "images";
let db;

/**
 * Initialise la base de données IndexedDB.
 * @returns {Promise<IDBDatabase>}
 */
function initDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("Erreur IndexedDB:", event.target.error);
      reject("Erreur de base de données.");
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };
  });
}

/**
 * Ajoute une image (objet File) à la base de données.
 * @param {File} file - Le fichier image à stocker.
 * @returns {Promise<void>}
 */
export async function addImage(file) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add({ file: file, name: file.name });

    request.onsuccess = () => resolve();
    request.onerror = (event) => reject(event.target.error);
  });
}

/**
 * Récupère toutes les images de la base de données.
 * @returns {Promise<Array<{id: number, file: File, name: string}>>}
 */
export async function getImages() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

/**
 * Supprime une image de la base de données par son ID.
 * @param {number} id - L'ID de l'image à supprimer.
 * @returns {Promise<void>}
 */
export async function deleteImage(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = (event) => reject(event.target.error);
  });
}