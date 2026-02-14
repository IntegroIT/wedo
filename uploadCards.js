// --- КОНФИГУРАЦИЯ ---
// Вставьте сюда ссылку на ваш Web App
const GAS_APP_URL =
  "https://script.google.com/macros/s/AKfycbyQBWZZRrIGT6HIy78uvYqNqqo2CDISHIqOPMPTEG1mCvH4gxEn9QJXqlYaHVAV0zBu/exec";

(async function initModelsGrid() {
  console.log("🚀 Инициализация сетки моделей...");

  // 1. Получаем ID секции из URL
  const pathName = window.location.pathname;
  // Пример: /wedо/teams/avtomobili-mototsikly-2.htm -> avtomobili-mototsikly-2
  const sectionId =
    pathName.substring(pathName.lastIndexOf("/") + 1).replace(".htm", "") ||
    "general";

  console.log(`Текущая секция (ID): ${sectionId}`);

  // 2. Загрузка данных
  let allCards = [];

  // Сначала пробуем из LocalStorage (быстро)
  const localData = localStorage.getItem("site_cards");
  if (localData) {
    try {
      allCards = JSON.parse(localData);
      console.log("📦 Данные загружены из LocalStorage");
      renderGrid(allCards); // Рисуем то, что есть
    } catch (e) {
      console.warn("LocalStorage поврежден, загружаем с сервера...");
    }
  }

  // Затем обновляем с сервера
  try {
    console.log("⏳ Обновление данных с сервера...");
    const res = await fetch(GAS_APP_URL + "?action=getCards&t=" + Date.now());
    const data = await res.json();

    if (Array.isArray(data)) {
      allCards = data;
      localStorage.setItem("site_cards", JSON.stringify(allCards)); // Кэшируем
      console.log("✅ Данные обновлены с сервера");
      renderGrid(allCards); // Перерисовываем с актуальными данными
    }
  } catch (e) {
    console.error("Ошибка загрузки с сервера, работаем с кэшем:", e);
  }

  // 3. Функция отрисовки
  function renderGrid(cards) {
    // Ищем контейнер .models-grid
    const container = document.querySelector(".models-grid");
    if (!container) {
      console.warn("Контейнер .models-grid не найден на странице.");
      return;
    }

    // Фильтруем карточки по ID секции
    const sectionCards = cards.filter((c) => c.section === sectionId);

    if (sectionCards.length === 0) {
      // Если карточек нет, можно оставить пустым или вывести сообщение
      // container.innerHTML = '<p>В этом разделе пока нет моделей.</p>';
      return;
    }

    // Генерируем HTML
    const html = sectionCards
      .map((card) => {
        // Ссылка на PDF для ПРОСМОТРА (не скачивания)
        // Используем ID, чтобы открыть предпросмотр Google Drive
        const pdfLink =
          card.pdf && card.pdf.id
            ? `https://drive.google.com/file/d/${card.pdf.id}/preview`
            : "#";

        const videoLink = card.videoUrl || "#";

        // Обработка картинки: если путь относительный, оставляем как есть
        // Если путь абсолютный (Google), оставляем как есть
        const imgUrl = card.imageUrl || ""; // Можно добавить заглушку, если пусто

        return `
                <div class="model-card">
                    <img src="${imgUrl}" alt="${card.title}" class="model-image">
                    <h3 class="model-title">${card.title}</h3>
                    <div class="model-details">
                        ${
                          videoLink !== "#"
                            ? `<a href="${videoLink}" target="_blank" class="video-btn">
                                <i class="fas fa-play"></i> Видео
                            </a>`
                            : ""
                        }
                    </div>
                    <a href="${pdfLink}" target="_blank" class="instruction-btn">
                        <i class="fas fa-file-pdf"></i> Открыть инструкцию
                    </a>
                </div>
                `;
      })
      .join("");

    container.innerHTML = html;
    console.log(`🎨 Отрисовано карточек: ${sectionCards.length}`);
  }
})();
