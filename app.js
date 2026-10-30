"use strict";

const STORAGE_KEY = "meu-escolar-data-v1";
const DEFAULT_USER_DATA = {
  name: "THAILA PIMENTA MATOS",
  birthdate: "27/02/2010",
  series: "1ª SÉRIE - A",
  institution: "Minha Instituição",
  photo: ""
};
const MAX_PHOTO_BYTES = 1_500_000;
const MAX_PHOTO_DIMENSION = 900;

let userData = { ...DEFAULT_USER_DATA };

const homeScreen = document.querySelector("#home-screen");
const cardScreen = document.querySelector("#card-screen");
const settingsScreen = document.querySelector("#settings-screen");
const homeAvatar = document.querySelector("#home-avatar");
const cardAvatar = document.querySelector("#card-avatar");
const settingsAvatar = document.querySelector("#settings-avatar");
const settingsForm = document.querySelector("#settings-form");
const photoInput = document.querySelector("#photo-input");
const appMessage = document.querySelector("#app-message");

function loadUserData() {
  try {
    const storedValue = localStorage.getItem(STORAGE_KEY);
    if (!storedValue) {
      return { ...DEFAULT_USER_DATA };
    }

    const storedData = JSON.parse(storedValue);
    if (!storedData || typeof storedData !== "object" || Array.isArray(storedData)) {
      throw new Error("Os dados salvos estão em um formato inválido.");
    }

    const data = {};
    for (const key of ["name", "birthdate", "series", "institution"]) {
      data[key] = typeof storedData[key] === "string"
        ? storedData[key].slice(0, key === "name" ? 80 : key === "institution" ? 60 : 40)
        : DEFAULT_USER_DATA[key];
    }
    data.photo = typeof storedData.photo === "string" && storedData.photo.startsWith("data:image/")
      ? storedData.photo
      : "";
    return data;
  } catch (error) {
    console.error("Não foi possível carregar os dados locais.", error);
    showMessage("Não foi possível ler os dados salvos. Os exemplos foram carregados.");
    return { ...DEFAULT_USER_DATA };
  }
}

function saveUserData(data = userData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    userData = data;
    return true;
  } catch (error) {
    console.error("Não foi possível salvar os dados locais.", error);
    showMessage("Não foi possível salvar. O armazenamento do dispositivo pode estar cheio.");
    return false;
  }
}

function setAvatar(element, photo) {
  element.replaceChildren();
  if (photo) {
    const image = document.createElement("img");
    image.src = photo;
    image.alt = "";
    element.append(image);
    element.setAttribute("aria-label", "Foto adicionada");
    return;
  }

  const placeholder = document.createElement("span");
  placeholder.className = "avatar-placeholder";
  placeholder.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path></svg>';
  element.append(placeholder);
  element.setAttribute("aria-label", "Foto não adicionada");
}

function renderCard() {
  document.querySelector("#card-name").textContent = userData.name || "Nome não informado";
  document.querySelector("#card-birthdate").textContent = userData.birthdate || "Não informado";
  document.querySelector("#card-series").textContent = userData.series || "Não informada";
  document.querySelector("#card-institution").textContent = userData.institution || "Minha Instituição";
  document.querySelector("#home-title").textContent = userData.name || "Nome não informado";
  document.querySelector("#home-series").textContent = userData.series || "Série não informada";
  setAvatar(homeAvatar, userData.photo);
  setAvatar(cardAvatar, userData.photo);
  setAvatar(settingsAvatar, userData.photo);
  document.querySelector("#settings-photo-button").textContent = userData.photo ? "Alterar foto" : "Adicionar foto";
  document.querySelector("#remove-photo").hidden = !userData.photo;
}

function showMessage(message) {
  appMessage.textContent = message;
}

function clearMessage() {
  appMessage.textContent = "";
}

function populateSettingsForm() {
  document.querySelector("#input-name").value = userData.name;
  document.querySelector("#input-birthdate").value = userData.birthdate;
  document.querySelector("#input-series").value = userData.series;
  document.querySelector("#input-institution").value = userData.institution;
}

function navigateToCard() {
  clearMessage();
  homeScreen.hidden = true;
  settingsScreen.hidden = true;
  cardScreen.hidden = false;
  window.scrollTo(0, 0);
}

function navigateToHome() {
  cardScreen.hidden = true;
  settingsScreen.hidden = true;
  homeScreen.hidden = false;
  clearMessage();
  window.scrollTo(0, 0);
}

function navigateToSettings() {
  clearMessage();
  populateSettingsForm();
  homeScreen.hidden = true;
  cardScreen.hidden = true;
  settingsScreen.hidden = false;
  window.scrollTo(0, 0);
}

function openPhotoPicker() {
  clearMessage();
  photoInput.click();
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem selecionada."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("O arquivo selecionado não contém uma imagem válida."));
      image.onload = () => {
        const scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Não foi possível preparar a imagem neste navegador."));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function handlePhotoUpload(event) {
  const [file] = event.target.files;
  if (!file) return;

  clearMessage();
  if (!["image/jpeg", "image/png"].includes(file.type)) {
    showMessage("Escolha uma imagem JPG ou PNG.");
    photoInput.value = "";
    return;
  }
  if (file.size > MAX_PHOTO_BYTES * 8) {
    showMessage("Essa imagem é muito grande. Escolha um arquivo menor que 12 MB.");
    photoInput.value = "";
    return;
  }

  try {
    const photo = await compressImage(file);
    const updatedData = { ...userData, photo };
    if (saveUserData(updatedData)) {
      renderCard();
      showMessage("Foto salva neste dispositivo.");
    }
  } catch (error) {
    console.error("Não foi possível preparar a foto.", error);
    showMessage(error.message || "Não foi possível adicionar essa foto.");
  } finally {
    photoInput.value = "";
  }
}

function handleEditSubmit(event) {
  event.preventDefault();
  const formData = new FormData(settingsForm);
  const updatedData = {
    ...userData,
    name: String(formData.get("name") || "").trim(),
    birthdate: String(formData.get("birthdate") || "").trim(),
    series: String(formData.get("series") || "").trim(),
    institution: String(formData.get("institution") || "").trim()
  };

  if (!updatedData.name || !updatedData.birthdate || !updatedData.series) {
    showMessage("Preencha nome, data de nascimento e série.");
    return;
  }
  if (saveUserData(updatedData)) {
    renderCard();
    clearMessage();
    showMessage("Alterações salvas neste dispositivo.");
  }
}

function handlePhotoRemoval() {
  const updatedData = { ...userData, photo: "" };
  if (saveUserData(updatedData)) {
    renderCard();
    showMessage("Foto removida.");
  }
}

function showSplash() {
  const splash = document.querySelector("#splash-screen");
  const image = document.querySelector("#splash-image");
  let splashStarted = false;

  function dismissSplash() {
    splash.remove();
  }

  image.addEventListener("error", dismissSplash, { once: true });
  image.addEventListener("load", () => {
    if (splashStarted) return;
    splashStarted = true;
    splash.classList.add("splash-visible");
    window.setTimeout(() => {
      splash.classList.add("splash-exit");
      window.setTimeout(dismissSplash, 350);
    }, 1300);
  }, { once: true });
  if (image.complete) {
    if (image.naturalWidth > 0) {
      image.dispatchEvent(new Event("load"));
    } else {
      dismissSplash();
    }
  }
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js", { updateViaCache: "none" })
      .then((registration) => {
        const checkForUpdates = () => {
          registration.update().catch((error) => {
            console.error("Não foi possível verificar atualizações do aplicativo.", error);
          });
        };

        checkForUpdates();
        window.setInterval(checkForUpdates, 60_000);
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") checkForUpdates();
        });
      })
      .catch((error) => {
        console.error("Não foi possível registrar o service worker.", error);
      });
  });
}

userData = loadUserData();
renderCard();

document.querySelector("#open-card").addEventListener("click", navigateToCard);
document.querySelector("#back-home").addEventListener("click", navigateToHome);
document.querySelector("#open-settings").addEventListener("click", navigateToSettings);
document.querySelector("#settings-back").addEventListener("click", navigateToHome);
document.querySelector("#settings-photo-button").addEventListener("click", openPhotoPicker);
document.querySelector("#remove-photo").addEventListener("click", handlePhotoRemoval);
settingsForm.addEventListener("submit", handleEditSubmit);
photoInput.addEventListener("change", handlePhotoUpload);
showSplash();
registerServiceWorker();
