const apiUrl = 'https://jsonplaceholder.typicode.com/todos';
const storageKey = 'todo_list_storage';

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

// ====== Загрузка с API (один раз, если нет сохранённых данных) ======

async function fetchTodosFromAPI(limit = 20) {
    const response = await fetch(apiUrl);
    if (!response.ok) {
        throw new Error('Ошибка при загрузке данных с API');
    }
    const data = await response.json();
    const sliced = data.slice(0, limit);

    const normalized = sliced.map(item => ({
        id: item.id,
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

    const todosToShow = state.todos;
    todosToShow.forEach(todo => {
        const li = document.createElement('li');
        li.className = 'todo-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'todo-item-checkbox';
        checkbox.id = 'todo-' + String(todo.id);
        checkbox.checked = todo.completed;

        const label = document.createElement('label');
        label.className = 'todo-item-label';
        label.htmlFor = checkbox.id;
        label.textContent = todo.title;

        li.appendChild(checkbox);
        li.appendChild(label);

        li.className = 'todo-item';
        if (todo.completed) {
            li.classList.add('completed');
        };

        elements.list.appendChild(li);
    });
    elements.totalSpan.textContent = String(state.todos.length);
};

// ====== Переключение статуса задачи ======

function toggleTodo(id, completed) {
    state.todos = state.todos.map(todo => {
        if (todo.id === id) {
            return {
                id: todo.id,
                title: todo.title,
                completed: completed,
                reminderAt: todo.reminderAt
            };
        }
    });
    saveToStorage(state.todos);
    render();
};

function handleListChange(event) {
    const target = event.target;
    if (!target || !target.classList.contains('todo-item-checkbox')) return;

    const idStr = String(target.id).replace('todo-', '');
    const id = Number(idStr);

    toggleTodo(id, target.checked);
}

// ====== Добавление задач ======

function generateId() {
    return Date.now();

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

async function init() {
    getElements();

    if (elements.list) {
        elements.list.addEventListener('change', handleListChange);
    }

    if (elements.form) {
        elements.form.addEventListener('submit', handleFormSubmit);
    }

    // 1)  читаем локальные данные
    const stored = readFromStorage();

    if (stored && stored.length > 0) {
        setTodos(stored);
        return;
    }

    // 2) Иначе грузим с сервера и сохраняем
    try {
        const fromApi = await fetchTodosFromAPI(20);
        setTodos(fromApi);
    } catch (e) {
        console.error(e);
        // На крайний случай — пустой список
        setTodos([]);
    }
};

document.addEventListener('DOMContentLoaded', init);
