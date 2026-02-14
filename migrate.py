import os
import sys
import json
import hashlib
from bs4 import BeautifulSoup

# Отключаем проблемы с выводом в консоль
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')

def generate_card_id(section, title, pdf_name, index):
    """
    Генерирует осмысленный ID для карточки
    """
    # Очищаем название от спецсимволов и приводим к нижнему регистру
    clean_title = title.lower()
    # Заменяем пробелы и спецсимволы на дефисы
    for char in ' [](){}.,!?;:"\'«»—':
        clean_title = clean_title.replace(char, '-')
    # Удаляем множественные дефисы
    while '--' in clean_title:
        clean_title = clean_title.replace('--', '-')
    # Убираем дефисы в начале и конце
    clean_title = clean_title.strip('-')
    
    # Извлекаем номер из PDF если есть
    pdf_number = ""
    if pdf_name:
        # Ищем число в имени PDF (например, "avtomobil-288.pdf" -> "288")
        import re
        numbers = re.findall(r'\d+', pdf_name)
        if numbers:
            pdf_number = f"-{numbers[0]}"
    
    # Создаем базовый ID
    base_id = f"{section}-{clean_title}{pdf_number}"
    
    # Если получился слишком длинный, обрезаем
    if len(base_id) > 80:
        base_id = base_id[:80]
    
    # Добавляем хеш для уникальности (первые 4 символа)
    unique_string = f"{section}{title}{pdf_name}{index}"
    hash_suffix = hashlib.md5(unique_string.encode()).hexdigest()[:4]
    
    return f"{base_id}-{hash_suffix}"

def generate_section_id(section_name):
    """
    Генерирует читаемый ID для секции
    """
    # Очищаем название секции
    clean_name = section_name.lower()
    clean_name = clean_name.replace('.htm', '').replace('.html', '')
    clean_name = clean_name.replace(' ', '-').replace('_', '-')
    
    # Убираем спецсимволы
    import re
    clean_name = re.sub(r'[^a-zа-я0-9-]', '', clean_name)
    
    return clean_name

def read_utf16_file(filepath):
    """
    Читает файл в UTF-16LE кодировке
    """
    with open(filepath, 'rb') as f:
        raw_data = f.read()
    
    # Проверяем первые байты на BOM UTF-16
    if raw_data.startswith(b'\xff\xfe'):
        print("  Обнаружен BOM UTF-16LE")
        return raw_data.decode('utf-16le')
    elif raw_data.startswith(b'\xfe\xff'):
        print("  Обнаружен BOM UTF-16BE")
        return raw_data.decode('utf-16be')
    else:
        # Пробуем принудительно UTF-16LE (скорее всего)
        try:
            return raw_data.decode('utf-16le')
        except:
            # Если не получилось, пробуем с удалением нулевых байтов
            ascii_text = raw_data.replace(b'\x00', b'').decode('utf-8', errors='ignore')
            return ascii_text

def main():
    print(">>> START MIGRATION (UTF-16 FIX) <<<")
    
    # Загружаем маппинг PDF
    with open('drivePdfMap.json', 'r', encoding='utf-8-sig') as f:
        pdf_map = json.load(f)
        print(f"[OK] PDF Map loaded: {len(pdf_map)} files.")
    
    files = [f for f in os.listdir('teams') if f.endswith('.htm')]
    print(f"[SCAN] Found .htm files: {len(files)}")
    
    all_data = []
    
    for filename in files:
        filepath = os.path.join('teams', filename)
        section_id = generate_section_id(filename.replace('.htm', ''))
        
        print(f"\n--- {filename} (section: {section_id}) ---")
        
        try:
            # Читаем как UTF-16
            content = read_utf16_file(filepath)
            
            # Удаляем BOM если остался
            if content.startswith('\ufeff'):
                content = content[1:]
            
            # Сохраняем конвертированную версию
            converted_file = f"converted_{filename}"
            with open(converted_file, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"  Сохранена UTF-8 версия: {converted_file}")
            
            # Парсим
            soup = BeautifulSoup(content, 'html.parser')
            
            # Ищем карточки
            cards = soup.find_all('div', class_='model-card')
            print(f"  Найдено model-card: {len(cards)}")
            
            # Обрабатываем каждую карточку
            for idx, card in enumerate(cards, 1):
                # Title
                h3 = card.find('h3', class_='model-title')
                title = h3.get_text(strip=True) if h3 else "Untitled"
                
                # Image
                img = card.find('img', class_='model-image')
                image_url = img['src'] if img and img.has_attr('src') else ""
                
                # Video
                video_btn = card.find('a', class_='video-btn')
                video_url = video_btn['href'] if video_btn and video_btn.has_attr('href') else ""
                
                # PDF
                pdf_btn = card.find('a', class_='instruction-btn')
                pdf_data = {"id": "", "name": ""}
                pdf_name = ""
                
                if pdf_btn and pdf_btn.has_attr('href'):
                    href = pdf_btn['href']
                    pdf_name = href.split('/')[-1]
                    pdf_id = pdf_map.get(pdf_name)
                    
                    if pdf_id:
                        pdf_data = {"id": pdf_id, "name": pdf_name}
                    else:
                        pdf_data = {"id": None, "name": pdf_name + " (not found)"}
                
                # Генерируем осмысленный ID для карточки
                card_id = generate_card_id(section_id, title, pdf_name, idx)
                
                card_obj = {
                    "id": card_id,
                    "section": section_id,
                    "title": title,
                    "imageUrl": image_url,
                    "pdf": pdf_data,
                    "videoUrl": video_url,
                    "updatedAt": "2023-10-27T10:00:00.000Z"
                }
                all_data.append(card_obj)
                
                print(f"    {idx}. {title} -> {card_id}")
                
        except Exception as e:
            print(f"  ОШИБКА: {e}")
            continue
    
    # Сохраняем результат
    try:
        with open('migrated_data.json', 'w', encoding='utf-8') as f:
            json.dump(all_data, f, ensure_ascii=False, indent=2)
        print(f"\n[DONE] Total cards: {len(all_data)}")
        print(f"Результат сохранен в migrated_data.json")
        
        # Сохраняем также в более компактном формате (без лишних пробелов) для продакшена
        with open('migrated_data.min.json', 'w', encoding='utf-8') as f:
            json.dump(all_data, f, ensure_ascii=False, separators=(',', ':'))
        print(f"Компактная версия сохранена в migrated_data.min.json")
        
    except Exception as e:
        print(f"Ошибка сохранения: {e}")

if __name__ == "__main__":
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        print("[ERROR] BeautifulSoup4 is not installed.")
        sys.exit(1)
    
    main()