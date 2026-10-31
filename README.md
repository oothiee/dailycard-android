# Дейликард — Android APK

Пошаговая инструкция для GitHub без git: [КАК-ЗАЛИТЬ-НА-GITHUB.md](КАК-ЗАЛИТЬ-НА-GITHUB.md).

Это Android-оболочка вокруг готового прототипа «Дейликард». Внутри APK лежат
текущие HTML/CSS/JS и ассеты приложения, поэтому внешний вид и поведение
сохраняются 1:1: бесконечные карточки, ввод ответа, 3 попытки, колоды, темы.

Приложение работает офлайн. Данные хранятся в `localStorage` WebView на
устройстве и переживают перезапуски. Origin специально сделан
`https://dailycard.local`, чтобы localStorage работал надёжно (у `file://`
он может теряться). Это не Flutter-переписывание, а нативная Android-обёртка
на WebView.

## Быстрая сборка через GitHub Actions

В проекте уже есть workflow. Нужен только репозиторий на GitHub.

### Вариант A — загрузить только `dailycard-android` (рекомендуется)

1. Создайте пустой репозиторий на GitHub.
2. Загрузите **содержимое** папки `dailycard-android` в корень репозитория.
   Важно, чтобы файл `.github/workflows/build-apk.yml` оказался в корне.
3. Откройте **Actions → Build Dailycard APK → Run workflow**.
4. Дождитесь зелёной сборки. Внизу страницы сборки будет артефакт
   **Dailycard-APK**. Скачайте его и распакуйте — внутри `Dailycard.apk`.

Через git это выглядит так:

```powershell
cd "C:\Users\senya\OneDrive\Рабочий стол\her\dailycard-android"
git init
git add .
git commit -m "Dailycard Android shell"
git branch -M main
git remote add origin https://github.com/ВАШ_ЛОГИН/ВАШ_РЕПОЗИТОРИЙ.git
git push -u origin main
```

Не используйте «загрузить файлы» в веб-интерфейсе GitHub, если он не показывает
скрытую папку `.github`: тогда workflow не попадёт в репозиторий. Надёжнее git
или GitHub Desktop.

### Вариант B — загрузить всю папку `her`

Если хотите держать репозиторий всего проекта, загрузите `her` целиком.
В корне уже лежит второй workflow: `.github/workflows/build-android.yml`.
Он сам заходит в подпапку `dailycard-android` и собирает тот же APK.
Файл `OutLearn.apk` из корня не нужен: он исключён корневым `.gitignore`
и к «Дейликард» не относится.

## Что получится

- `applicationId`: `ru.dailycard.app`
- Название: **Дейликард**
- `minSdk 23` (Android 6+), `targetSdk 34`
- Сборка по умолчанию: debug APK, подписанный debug-ключом. Он устанавливается
  на телефон, но для обновлений без удаления лучше настроить постоянную подпись
  (см. ниже).
- Все веб-файлы лежат в `app/src/main/assets/www`.

APK устанавливается вручную: скачайте файл на телефон, откройте и разрешите
установку из неизвестных источников.

## Постоянная подпись (рекомендуется для обновлений)

Debug-ключ на каждом запуске GitHub-раннера может быть разным. Если поставить
поверх старой версии APK с другой подписью, Android откажется обновлять
приложение. Чтобы обновления работали, один раз создайте свой keystore и
добавьте его в секреты репозитория.

1. Создайте ключ (JDK 17):

```powershell
keytool -genkeypair -v -keystore dailycard-release.jks `
  -alias dailycard -keyalg RSA -keysize 2048 -validity 10000
```

Пароль и alias запомните. Файл `dailycard-release.jks` никому не передавайте
и не коммитьте.

2. Получите base64:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("dailycard-release.jks")) |
  Set-Content keystore.b64 -NoNewline
```

3. В GitHub: **Settings → Secrets and variables → Actions → New repository
   secret**. Добавьте:

| Secret | Значение |
| --- | --- |
| `DAILYCARD_KEYSTORE_BASE64` | содержимое `keystore.b64` одной строкой |
| `DAILYCARD_KEYSTORE_PASSWORD` | пароль хранилища |
| `DAILYCARD_KEY_ALIAS` | `dailycard` |
| `DAILYCARD_KEY_PASSWORD` | пароль ключа |

4. Запустите workflow заново. Если секрет `DAILYCARD_KEYSTORE_BASE64` задан,
   workflow соберёт **release** APK, подписанный вашим ключом. Если нет —
   соберёт debug APK.

Если вы уже установили debug-версию, а потом перешли на release-подпись,
придётся один раз удалить приложение (данные при этом пропадут). Лучше настроить
секреты до первой установки, если планируете обновления.

## Локальная сборка

Нужны JDK 17 и Android SDK с `platforms;android-34` и
`build-tools;34.0.0`. Проще всего открыть папку `dailycard-android` в Android
Studio (она сама подставит SDK) или создать `local.properties`:

```properties
sdk.dir=C\:\\Users\\senya\\AppData\\Local\\Android\\Sdk
```

Затем:

```powershell
cd "C:\Users\senya\OneDrive\Рабочий стол\her\dailycard-android"
.\gradlew.bat assembleDebug
```

APK: `app\build\outputs\apk\debug\app-debug.apk`.

## Структура

```text
dailycard-android/
  app/
    src/main/
      AndroidManifest.xml
      java/ru/dailycard/app/MainActivity.java
      assets/www/                 # копия dailycard
      res/                        # иконки, тема, название
    build.gradle.kts
  .github/workflows/build-apk.yml
  gradle/wrapper/                 # Gradle 8.2.1
  build.gradle.kts
  settings.gradle.kts
```

## Технические детали

- `MainActivity` — единственный экран: `WebView` на весь экран.
- Запросы к `https://dailycard.local/...` перехватываются и отдаются из
  `assets/www`; наружу ничего не загружается.
- Включён DOM storage, поэтому данные сохраняются.
- `?app=1` отключает регистрацию service worker внутри APK; для PWA в браузере
  service worker остаётся.
- Системная кнопка «Назад» сначала закрывает модальное окно, затем возвращает
  по истории, а с главного экрана выходит из приложения.
- Цвет системных панелей синхронизируется с темой приложения через
  JS-интерфейс `DailycardAndroid.setTheme(...)`.

## Ограничения

- Это WebView-обёртка, а не отдельная нативная версия на Kotlin/Flutter.
  Дизайн и логика взяты из текущего прототипа без переписывания.
- Данные APK не связаны с данными PWA в браузере: это разные origin.
- Удаление приложения очищает его данные.

Локально APK не собирался: в этой среде нет Android SDK. Проект рассчитан на
сборку в GitHub Actions, где JDK 17 и Android SDK уже есть.
