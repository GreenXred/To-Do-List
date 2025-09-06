const apiUrl = 'https://jsonplaceholder.typicode.com/todos';
const storageKey = 'todo-list-storage'; // ключ для хранения списка задач
const themeKey = 'todoTheme'; // ключ для хранения темы
const reminderTimers = {}; // таймеры для напоминаний
const filterKey = 'todoFilter'; // ключ для хранения фильтра



// ====== Функция переключение темы ======

function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark');
    } else {
        document.body.classList.remove('dark');
    };
};

function toggleTheme() {
    const current = localStorage.getItem(themeKey) || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(themeKey, next);
    applyTheme(next);
};


const state = { // здесь храним текущий список задач и фильтр
    todos: [],
    filter: 'all'
};

// ====== Поиск элементов в DOM ======

let elements = {};

function getElements() {
    elements.list = document.querySelector('.todo-list');
    elements.totalSpan = document.querySelector('.total-tasks span');
    elements.form = document.querySelector('.new-task-input');
    elements.input = document.querySelector('.new-task-input-field');
    elements.deleteAllBtn = document.querySelector('.delete-all-buttons');
    elements.filterAllBtn = document.querySelector('.all-task-button');
    elements.filterCompletedBtn = document.querySelector('.completed-task-button');
    elements.filterPendingBtn = document.querySelector('.pending-task-button');
};

// ====== Функции чтения и сохранения из localStorage ======

function readFromStorage() {
    try {
        const row = localStorage.getItem(storageKey);
        if (!row) {
            return null;
        }
        const parsed = JSON.parse(row);
        if (Array.isArray(parsed)) {
            return parsed;
        }
        return null;
    } catch (error) {
        console.error('Ошибка чтения из localStorage:', error);
        return null;
    }
};

function saveToStorage(todos) {
    try {
        localStorage.setItem(storageKey, JSON.stringify(todos));
    } catch (error) {
        console.error('Ошибка сохранения в localStorage:', error);
    }
};

function scheduleReminder(todo) {
    // если уже был таймер — удаление
    if (reminderTimers[todo.id]) {
        clearTimeout(reminderTimers[todo.id]);
        delete reminderTimers[todo.id];
    }

    // Для выполненных — не планируем и обнуляем reminderAt
    if (todo.completed) {
        if (todo.reminderAt) {
            todo.reminderAt = null;
            saveToStorage(state.todos);
        }
        return;
    }

    if (!todo.reminderAt) return;

    const delay = todo.reminderAt - Date.now();
    if (delay <= 0) {
        alert("Пора выполнить задачу - " + todo.title);
        todo.reminderAt = null;
        saveToStorage(state.todos);
        return;
    }

    const timeoutId = setTimeout(() => {
        alert("Пора выполнить задачу - " + todo.title);
        todo.reminderAt = null;
        saveToStorage(state.todos);
        render();
        delete reminderTimers[todo.id];
    }, delay);

    reminderTimers[todo.id] = timeoutId;
};

function scheduleAllReminders() {
    Object.values(reminderTimers).forEach(clearTimeout);
    for (const key in reminderTimers) delete reminderTimers[key];
    state.todos.forEach(scheduleReminder);
};

// ====== Загрузка с API (один раз, если нет сохранённых данных) ======

async function fetchTodosFromAPI(limit = 20) {
    const response = await fetch(apiUrl);
    if (!response.ok) {
        throw new Error('Ошибка при загрузке данных с API');
    }
    const data = await response.json();
    const sliced = data.slice(0, limit);

    const normalized = sliced.map(item => ({
        id: String(item.id),
        title: item.title,
        completed: Boolean(item.completed),
        reminderAt: null
    }));
    return normalized;
};


// ====== Установка списка задач в state и отрисовка ======

function setTodos(todos) {
    state.todos = todos;
    saveToStorage(state.todos);
    render();
};

// ====== Рендер списка задач ======

function render() {
    elements.list.innerHTML = '';

    // фильтр из state.filter
    let todosToShow = state.todos;
    if (state.filter === 'completed') {
        todosToShow = state.todos.filter(t => t.completed);
    } else if (state.filter === 'pending') {
        todosToShow = state.todos.filter(t => !t.completed);
    }

    todosToShow.forEach(todo => {
        const li = document.createElement('li');
        li.className = 'todo-item';
        if (todo.completed) li.classList.add('completed');

        // чекбокс
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'todo-item-checkbox';
        checkbox.id = 'todo-' + String(todo.id);
        checkbox.checked = todo.completed;

        // текст
        const label = document.createElement('label');
        label.className = 'todo-item-label';
        label.htmlFor = checkbox.id;
        label.textContent = todo.title;

        // таймер и метка напоминания
        let timerIcon = null;
        let reminderEl = null;

        if (!todo.completed) {
            if (todo.reminderAt) {
                // напоминание уже стоит — показываем «🔔 ЧЧ:ММ»
                const d = new Date(todo.reminderAt);
                const h = String(d.getHours()).padStart(2, '0');
                const m = String(d.getMinutes()).padStart(2, '0');

                reminderEl = document.createElement('span');
                reminderEl.className = 'reminder-label';
                reminderEl.textContent = '🔔 ' + h + ':' + m;
                reminderEl.dataset.id = String(todo.id);
            } else {
                // напоминания нет — показываем иконку для установки
                timerIcon = document.createElement('img');
                timerIcon.className = 'timer-icon';
                timerIcon.src = './icons/icon-stopwatch.svg';
                timerIcon.alt = 'Timer';
            }
        };

        // кнопка удаления
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'todo-item-delete-button';
        delBtn.setAttribute('data-id', String(todo.id));
        delBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"
             xmlns="http://www.w3.org/2000/svg">
          <path d="M15 5L5 15M5 5L15 15"
                stroke="#757575" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      `;

        li.appendChild(checkbox);
        li.appendChild(label);
        if (timerIcon) li.appendChild(timerIcon);
        if (reminderEl) li.appendChild(reminderEl);
        li.appendChild(delBtn);

        elements.list.appendChild(li);
    });

    elements.totalSpan.textContent = String(state.todos.length);
    scheduleAllReminders();
};

// ====== Удаление задач ======

function removeTodo(id) {
    state.todos = state.todos.filter(todo => todo.id !== id);

    if (reminderTimers[id]) {
        clearTimeout(reminderTimers[id]);
        delete reminderTimers[id];
    };

    saveToStorage(state.todos);
    render();
};

function removeAllTodos() {
    state.todos = [];
    saveToStorage(state.todos);
    render();
};

function handleListClick(event) {
    const target = event.target;

    //  Удаление 
    const delBtn = target.closest('.todo-item-delete-button');
    if (delBtn && elements.list.contains(delBtn)) {
        const id = delBtn.getAttribute('data-id');
        removeTodo(id);
        return;
    }

    // поставить напоминание
    const timer = target.closest('.timer-icon');
    if (timer && elements.list.contains(timer)) {
        const li = timer.closest('.todo-item');
        const checkbox = li.querySelector('.todo-item-checkbox');
        const id = checkbox.id.replace('todo-', '');
        const todo = state.todos.find(t => t.id === id);
        if (!todo) return;

        // запрет для выполненных задач
        if (todo.completed) {
            alert('Нельзя ставить напоминание для выполненной задачи.');
            return;
        }

        const minStr = prompt('Через сколько минут напомнить?');
        if (minStr === null) return;

        const minutes = Number(minStr);
        if (!Number.isFinite(minutes) || minutes <= 0) {
            alert('Введите положительное число минут.');
            return;
        }

        todo.reminderAt = Date.now() + minutes * 60000; // сохраняем время
        saveToStorage(state.todos);
        render();
        return;
    };

    // убрать напоминание
    const reminderLabel = target.closest('.reminder-label');
    if (reminderLabel && elements.list.contains(reminderLabel)) {
        const id = reminderLabel.dataset.id;
        const todo = state.todos.find(t => t.id === id);
        if (todo && todo.reminderAt) {
            if (confirm("Убрать напоминание?")) {
                todo.reminderAt = null;
                if (reminderTimers[id]) {
                    clearTimeout(reminderTimers[id]);
                    delete reminderTimers[id];
                }
                saveToStorage(state.todos);
                render();
            }
        }
        return;
    };
};

// ====== Переключение статуса задачи ======

function toggleTodo(id, completed) {
    state.todos = state.todos.map(todo => {
        if (todo.id === id) {
            return {
                id: todo.id,
                title: todo.title,
                completed,
                reminderAt: completed ? null : todo.reminderAt // сбрасывать напоминание при выполнении задачи
            };
        }
        return todo;
    });

    if (completed && reminderTimers[id]) {
        clearTimeout(reminderTimers[id]);
        delete reminderTimers[id];
    };

    saveToStorage(state.todos);
    render();
};


function handleListChange(event) {
    const target = event.target;
    if (!target || !target.classList.contains('todo-item-checkbox')) return;

    const idStr = String(target.id).replace('todo-', '');
    const id = idStr;

    toggleTodo(id, target.checked);
};

// ====== Добавление задач ======

function generateId() {
    return crypto.randomUUID();

};

function addTodo(title) {
    const trimmed = title.trim();
    if (trimmed === '') {
        return;
    }

    const newTodo = {
        id: generateId(),
        title: trimmed,
        completed: false,
        reminderAt: null
    };

    // кладём задачу в начало массива, чтобы новая была сверху
    state.todos = [newTodo].concat(state.todos);

    saveToStorage(state.todos),
        render();

    if (elements.input) {
        elements.input.value = '';
    };
};

// Обработчик формы "Add"
function handleFormSubmit(event) {
    event.preventDefault(); // не даём странице перезагружаться
    if (!elements.input) return;

    addTodo(elements.input.value);
};

// ====== Инициализация ======

function setFilter(next) {
    state.filter = next;
    localStorage.setItem(filterKey, next); // сохраняем выбор
    highlightActiveFilter();
    render();
};

function highlightActiveFilter() {
    const { filterAllBtn, filterCompletedBtn, filterPendingBtn } = elements;
    [filterAllBtn, filterCompletedBtn, filterPendingBtn].forEach(btn => {
        if (btn) btn.classList.remove('is-active');
    });

    if (state.filter === 'all' && elements.filterAllBtn) {
        elements.filterAllBtn.classList.add('is-active');
    }

    if (state.filter === 'completed' && elements.filterCompletedBtn) {
        elements.filterCompletedBtn.classList.add('is-active');
    }

    if (state.filter === 'pending' && elements.filterPendingBtn) {
        elements.filterPendingBtn.classList.add('is-active');
    }
};


async function init() {
    getElements();

    // сохраненный фильтр
    const savedFilter = localStorage.getItem(filterKey);
    if (savedFilter === 'all' || savedFilter === 'completed' || savedFilter === 'pending') {
        state.filter = savedFilter;
    } else {
        state.filter = 'all'; // дефолт
        localStorage.setItem(filterKey, 'all');
    }

    // сохранённея тема
    const saved = localStorage.getItem(themeKey) || 'light';
    applyTheme(saved);

    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.addEventListener('click', toggleTheme);
    }

    if (elements.filterAllBtn) {
        elements.filterAllBtn.addEventListener('click', () => setFilter('all'));
    }
    if (elements.filterCompletedBtn) {
        elements.filterCompletedBtn.addEventListener('click', () => setFilter('completed'));
    }
    if (elements.filterPendingBtn) {
        elements.filterPendingBtn.addEventListener('click', () => setFilter('pending'));
    }

    if (elements.list) {
        elements.list.addEventListener('click', handleListClick);
    }

    if (elements.deleteAllBtn) {
        elements.deleteAllBtn.addEventListener('click', removeAllTodos);
    }

    if (elements.list) {
        elements.list.addEventListener('change', handleListChange);
    }

    if (elements.form) {
        elements.form.addEventListener('submit', handleFormSubmit);
    }

    // читаем локальные данные

    const stored = readFromStorage();

    if (stored && stored.length > 0) {
      const migrated = stored.map(t => ({
        ...t,
        id: String(t.id) 
      }));
      setTodos(migrated);
    } else {
      const fromApi = await fetchTodosFromAPI(20);
      setTodos(fromApi);
    };
    
    highlightActiveFilter();
};

document.addEventListener('DOMContentLoaded', init);
