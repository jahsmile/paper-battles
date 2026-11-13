# Сервер галереи

Маленькая функция, которая принимает героя от игры и кладёт его файлом в ветку `gallery` этого репозитория. Игра читает героев прямо из GitHub.

## Как включить

1. **Ключ GitHub.** GitHub → Settings → Developer settings → Fine-grained tokens → Generate new token. Доступ только к репозиторию `paper-battles`, право `Contents: Read and write`. Скопируйте ключ.
2. **Функция.** В Cloudflare: Workers & Pages → Create → Worker. Вставьте содержимое `worker.js` и нажмите Deploy.
3. **Настройки функции.** Settings → Variables and Secrets:
   - `GH_TOKEN` — ключ из шага 1, тип Secret;
   - `GH_REPO` — `jahsmile/paper-battles`.
4. **Адрес.** Скопируйте адрес функции вида `https://….workers.dev` и впишите его в `gallery.json` в корне репозитория: `{"api":"https://….workers.dev"}`.

После этого в «Меню» появится «Галерея», а в настройках своего героя — кнопка «В галерею».

## Что проверяет сервер

- картинка — webp, png или jpeg не больше 240 КБ, роль из списка игры;
- не больше 10 героев в сутки с одного адреса и 300 в сутки всего (`PER_IP_DAY`, `PER_DAY`);
- чужие реплики и звуки в галерею не попадают.

## Как убрать героя

В ветке `gallery` удалите его строку из `index.json` и файл `heroes/<id>.json`.
