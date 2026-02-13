const SCRIPT_URL =
  "https://script.googleusercontent.com/macros/echo?user_content_key=AehSKLgfUKbCxVhrXXxsT_IL1e44ur-yhlqrMslVRKq7Plm_2kTZCuNzbCAK6swVjo6wST-Rp8H1q_6iIr_iMTdBYDmoMM0QIV97ExRbrYJJA3ALyj3ySeDeKoZkgdpzLtSEdJjuIuWhta_lxzMelmLdumkIF4G4SS-MuG-k-v6sdRZChdwlq0okg9jdnJ47Ubw9kSCGqgR-Gzit1OzQR95ZX2prxPTCrZ6md0dM0bwueUvf2j5hc9Ct5hvA7HVOMUxv0yQBCDg-E5QRYTk9fY2OWEywT34jDw&lib=MbdC-l4jD6k0pdxUCM6Bsp1NLROFN8Rze"; // ← замените
let fileMap = JSON.parse(localStorage.getItem("drivePdfMap") || "{}");

// === ФУНКЦИЯ: ЗАГРУЗИТЬ СПИСОК ФАЙЛОВ И СОХРАНИТЬ В localStorage ===
async function fetchAndSaveFileMap() {
  try {
    const res = await fetch(SCRIPT_URL);
    if (!res.ok) throw new Error("Network error");
    const data = await res.json();
    localStorage.setItem("drivePdfMap", JSON.stringify(data));
    fileMap = data; // обновляем глобальную переменную
    console.log("Список PDF-файлов успешно загружен и сохранён в localStorage");
  } catch (err) {
    console.error("Не удалось загрузить список файлов:", err);
  }
}

// === ФУНКЦИЯ: ОБРАБОТКА КЛИКА ПО PDF-ССЫЛКЕ ===
function handlePdfClick(e) {
  const link = e.target.closest('a[href$=".pdf"]');
  if (!link) return;

  e.preventDefault();
  const filename = link.href.split("/").pop();

  if (fileMap[filename]) {
    // Открываем в просмотрщике Google Drive
    window.open(
      `https://drive.google.com/file/d/${fileMap[filename]}/view`,
      "_blank",
    );
  } else {
    // Файл не найден → принудительно обновляем список один раз
    fetchAndSaveFileMap().then(() => {
      if (fileMap[filename]) {
        window.open(
          `https://drive.google.com/file/d/${fileMap[filename]}/view`,
          "_blank",
        );
      } else {
        alert(`Файл "${filename}" не найден ни в кэше, ни на Google Диске.`);
      }
    });
  }
}

// === ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ ===
document.addEventListener("DOMContentLoaded", () => {
  // Назначаем обработчик кликов
  document.addEventListener("click", handlePdfClick);

  // Если localStorage пуст — сразу загружаем список файлов
  if (Object.keys(fileMap).length === 0) {
    console.log(
      "localStorage пуст. Запускаем фоновую загрузку списка файлов...",
    );
    fetchAndSaveFileMap();
  }
});
