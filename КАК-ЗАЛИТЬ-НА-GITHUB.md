# Как залить «Дейликард» на GitHub и собрать APK

Эта инструкция для случая, когда git не установлен: всё можно сделать через
браузер. Главная ошибка почти всегда одна — workflow лежит не в той папке.

## Самое важное

GitHub ищет workflow **только** по такому пути, от корня репозитория:

```text
.github/workflows/имя-файла.yml
```

То есть в корне репозитория должна быть папка `.github` (с точкой), внутри неё
`workflows`, а внутри — файл `build-apk.yml` или `build-android.yml`.

GitHub **не увидит** workflow, если файл лежит так:

```text
dailycard-android/.github/workflows/build-apk.yml   ← вложенная папка, не корень
github/workflows/build-apk.yml                     ← нет точки
.github/workflow/build-apk.yml                     ← нет буквы s
.github/workflows/build-apk.yml.txt                ← лишнее .txt
```

---

# Вариант 1. В репозитории только Android-проект (рекомендую)

В репозитории должны лежать **содержимое** папки `dailycard-android`, а не сама
папка `dailycard-android`.

Правильная структура репозитория:

```text
ВАШ-РЕПОЗИТОРИЙ/
├── .github/
│   └── workflows/
│       └── build-apk.yml
├── app/
│   ├── build.gradle.kts
│   └── src/main/...
├── gradle/
│   └── wrapper/
│       ├── gradle-wrapper.jar
│       └── gradle-wrapper.properties
├── build.gradle.kts
├── settings.gradle.kts
├── gradle.properties
├── gradlew
├── gradlew.bat
├── README.md
├── .gitignore
└── .gitattributes
```

Неправильно:

```text
ВАШ-РЕПОЗИТОРИЙ/
└── dailycard-android/
    ├── app/
    └── .github/workflows/build-apk.yml
```

## Шаг 1. Создайте репозиторий

1. Откройте https://github.com и войдите в аккаунт.
2. Нажмите «+» справа сверху → **New repository**.
3. Имя: например `dailycard`.
4. Выберите Public или Private — для сборки это не важно.
5. **Не ставьте галочки** «Add a README file», «Add .gitignore», «Choose a license».
6. Нажмите **Create repository**.

## Шаг 2. Загрузите файлы проекта

1. На странице пустого репозитория нажмите ссылку
   **uploading an existing file** (или **Add file → Upload files**).
2. Откройте в Проводнике папку:

   ```text
   C:\Users\senya\OneDrive\Рабочий стол\her\dailycard-android
   ```

3. Выделите **всё содержимое папки** (`Ctrl+A`): `app`, `gradle`,
   `build.gradle.kts`, `settings.gradle.kts`, `gradle.properties`, `gradlew`,
   `gradlew.bat`, `README.md`, `.gitignore`, `.gitattributes`.
4. Перетащите выделенное в окно GitHub.
5. Дождитесь загрузки, напишите сообщение коммита, например
   `Dailycard Android project`, и нажмите **Commit changes**.
6. Проверьте корень репозитория: там должны быть `app`, `gradle`,
   `build.gradle.kts` и т.д. Если вместо этого появилась одна папка
   `dailycard-android` — вы загрузили папку целиком. Это надо исправить:
   удалите её и повторите, выделяя содержимое папки, а не саму папку.

Скрытую `.github` при загрузке через браузер GitHub может не принять. Это не
страшно: workflow создадим вручную на следующем шаге.

## Шаг 3. Создайте workflow вручную

1. В репозитории откройте вкладку **Actions**.
2. Если GitHub предлагает готовые шаблоны, найдите ссылку
   **set up a workflow yourself** и нажмите её.
   Если такой ссылки нет, нажмите **New workflow**, затем
   **set up a workflow yourself**.
3. Откроется редактор. В поле имени файла сверху вместо `main.yml` напишите:

   ```text
   build-apk.yml
   ```

   Полный путь должен получиться таким:

   ```text
   .github/workflows/build-apk.yml
   ```

4. Удалите всё, что есть в редакторе (`Ctrl+A`, затем `Delete`).
5. Откройте в Блокноте локальный файл:

   ```text
   C:\Users\senya\OneDrive\Рабочий стол\her\dailycard-android\.github\workflows\build-apk.yml
   ```

   Выделите всё (`Ctrl+A`), скопируйте (`Ctrl+C`).
6. Вставьте содержимое в редактор GitHub (`Ctrl+V`).
7. Нажмите **Commit changes...**.
8. В окне коммита выберите **Commit directly to the `main` branch** и нажмите
   **Commit changes**.

Теперь вкладка **Actions** должна показывать слева workflow
**Build Dailycard APK**.

## Шаг 4. Запустите сборку

1. Откройте **Actions**.
2. Слева выберите **Build Dailycard APK**.
3. Справа нажмите **Run workflow** → ветка `main` → **Run workflow**.
4. Обновите страницу через несколько секунд. Появится запуск: жёлтая точка —
   идёт сборка, зелёная галочка — готово.
5. Откройте завершённый запуск, прокрутите вниз до блока **Artifacts**.
6. Скачайте **Dailycard-APK**. Это ZIP-архив.
7. Распакуйте его — внутри лежит `Dailycard.apk`.

Первый запуск может идти 5–10 минут: GitHub скачивает Gradle и Android SDK.

---

# Вариант 2. В репозитории весь проект `her`

Этот вариант нужен, только если вы хотите хранить на GitHub ещё и веб-версию
из папки `dailycard`.

Правильная структура:

```text
ВАШ-РЕПОЗИТОРИЙ/
├── .github/
│   └── workflows/
│       └── build-android.yml
├── dailycard/
│   └── ...
├── dailycard-android/
│   ├── app/
│   ├── gradle/
│   ├── build.gradle.kts
│   └── ...
└── README.md
```

Здесь используется **другой** workflow — `build-android.yml`. Он специально
заходит в подпапку `dailycard-android`.

Порядок:

1. Создайте пустой репозиторий, как в варианте 1.
2. Загрузите **содержимое** папки `her` в корень репозитория. Папка
   `dailycard-android` должна остаться папкой внутри репозитория.
3. Если `.github` не загрузилась, создайте файл через
   **Add file → Create new file**.
4. В поле имени файла введите:

   ```text
   .github/workflows/build-android.yml
   ```

5. Вставьте содержимое локального файла:

   ```text
   C:\Users\senya\OneDrive\Рабочий стол\her\.github\workflows\build-android.yml
   ```

6. Commit в ветку `main`.
7. Actions → **Build Dailycard APK** → **Run workflow**.

Не смешивайте варианты:

- Если в корне репозитория лежат `app`, `gradle`, `gradlew` — нужен
  `build-apk.yml`.
- Если в корне лежит папка `dailycard-android` — нужен `build-android.yml`.

Если перепутать, workflow запустится, но упадёт на шаге Build APK, потому что
не найдёт нужную папку.

---

# Если workflow всё равно не появляется

Проверьте по порядку:

1. **Файл лежит в корне репозитория?**
   Откройте репозиторий. Путь должен быть именно
   `.github/workflows/build-apk.yml`, а не
   `dailycard-android/.github/workflows/build-apk.yml`.

2. **Папка называется `.github`, а не `github`?**
   Точка обязательна.

3. **Файл называется `.yml`, а не `.yml.txt`?**
   Включите в Проводнике «Расширения имён файлов» и проверьте.

4. **Коммит попал в ветку `main`?**
   Для кнопки **Run workflow** файл должен быть в ветке по умолчанию.
   Посмотрите слева вверху репозитория, какая ветка выбрана. Если workflow
   загружен в другую ветку, переключитесь на `main` или влейте изменения в неё.

5. **Actions включены?**
   Откройте **Settings → Actions → General**. Должно быть разрешено
   **Allow all actions and reusable workflows**. Для нового личного
   репозитория это включено по умолчанию.

6. **Вы в том же репозитории?**
   Проверьте имя репозитория в адресной строке.

7. **Есть ли ошибка в workflow?**
   Откройте файл на GitHub. GitHub подсвечивает ошибки YAML. Не меняйте
   отступы и не добавляйте символы табуляции.

8. **Обновите страницу.**
   Иногда список workflow обновляется не сразу.

---

# Если сборка упала

Откройте Actions → запуск → шаг с красным крестом. Текст ошибки можно
скопировать и показать мне.

Самые частые причины:

- **`Set up Android SDK`** — устарел `android-actions/setup-android@v3`.
  GitHub перешёл на Node.js 24, и v3 больше не запускается. В файле
  workflow должно быть `android-actions/setup-android@v4`.
- **`Project directory ... app does not exist`** или
  **`Could not find ... gradle/wrapper/gradle-wrapper.jar`** — папки `app`
  и `gradle` загружены неправильно или отсутствуют. В корне репозитория
  должны быть именно папки `app/` и `gradle/wrapper/`, а не отдельные файлы
  `gradle-wrapper.jar` и `gradle-wrapper.properties` в корне.
- **`No such file or directory: gradlew`** — файлы проекта загружены не в
  корень, а в подпапку. Нужен вариант 1 или 2, но с правильной структурой.
- **`SDK location not found`** — ошибка самого workflow маловероятна, если
  используется готовый файл; проверьте, что вы не удалили шаг
  `Set up Android SDK`.
- **`app-release.apk: No such file`** — включились секреты подписи, но
  keystore или пароль неверные. Уберите секреты или проверьте их.
- **`Artifact not found`** — сборка не дошла до шага Upload; смотрите первую
  ошибку выше.

Если в корне репозитория лежат одновременно `app/`, `gradle/` и отдельные
`gradle-wrapper.jar`, `gradle-wrapper.properties`, `proguard-rules.pro` —
это признак того, что файлы из вложенных папок загрузили «плоско». Лишние
файлы из корня нужно удалить, а папки `app` и `gradle` загрузить целиком.

---

# Подпись APK

По умолчанию собирается **debug APK**. Он устанавливается на телефон, но
подпись создаётся на временной машине GitHub. При следующей сборке подпись
может оказаться другой, и Android откажется устанавливать новую версию поверх
старой. Тогда придётся удалить приложение — вместе с данными.

Если хотите обновлять приложение без удаления, один раз настройте постоянную
подпись **до первой установки**:

1. Создайте keystore. Если установлен Java:

   ```powershell
   keytool -genkeypair -v -keystore dailycard-release.jks `
     -alias dailycard -keyalg RSA -keysize 2048 -validity 10000
   ```

   Запомните пароль хранилища, alias `dailycard` и пароль ключа.

2. Получите base64:

   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("dailycard-release.jks")) |
     Set-Content keystore.b64 -NoNewline
   ```

3. В GitHub откройте **Settings → Secrets and variables → Actions →
   New repository secret** и добавьте:

   | Имя | Значение |
   | --- | --- |
   | `DAILYCARD_KEYSTORE_BASE64` | всё содержимое `keystore.b64` одной строкой |
   | `DAILYCARD_KEYSTORE_PASSWORD` | пароль хранилища |
   | `DAILYCARD_KEY_ALIAS` | `dailycard` |
   | `DAILYCARD_KEY_PASSWORD` | пароль ключа |

4. Запустите workflow заново. Если все четыре секрета заданы, соберётся
   release APK с постоянной подписью.

Не коммитьте `.jks` в репозиторий. Он уже исключён через `.gitignore`.

---

# Установка APK на телефон

1. Скачайте артефакт `Dailycard-APK` на компьютер.
2. Распакуйте ZIP.
3. Перекиньте `Dailycard.apk` на телефон (USB, Telegram «Избранное», облако).
4. Откройте файл на телефоне.
5. Разрешите установку из неизвестных источников для приложения, которым
   открываете APK.
6. Нажмите «Установить».
7. Если Play Protect предупреждает, что приложение неизвестного разработчика,
   выберите «Установить всё равно».

Данные приложения хранятся на телефоне и сохраняются между запусками.
Удаление приложения очищает его данные.
