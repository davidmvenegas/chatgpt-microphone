document.getElementById('closeSnippets').addEventListener('click', () => {
    window.close();
});


// state variables
let isEditing = false;
let isAddingNew = false;
let deletedRowsQueue = [];
const changedCells = new Set();


// select elements
const tableContainer = document.getElementById('snippetsTable');
const addNewButton = document.getElementById('addNewSnippet');
const editButton = document.getElementById('editSnippets');
const saveButton = document.getElementById('saveSnippets');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const deleteIcons = document.getElementsByClassName('delete-icon');
const darkModeSwitch = document.getElementById('darkModeSwitch');


// create new row
function createNewRow(fromExistingData) {
    const newRow = document.createElement('div');
    newRow.classList.add('snippet-row');
    newRow.innerHTML = `
        <div class="cell"><div class="SS_shortcut auto-grow" contenteditable="true" data-paste></div></div>
        <div class="cell"><div class="SS_snippet auto-grow" contenteditable="true" data-paste></div></div>
        <img src="../assets/delete.svg" class="delete-icon" />
    `;
    tableContainer.appendChild(newRow);
    // select elements
    const shortcutCell = newRow.querySelector('.SS_shortcut');
    const snippetCell = newRow.querySelector('.SS_snippet');
    const deleteIcon = newRow.querySelector('.delete-icon');
    // add paste/change/delete event listeners
    shortcutCell.addEventListener('paste', cleanPastedText);
    shortcutCell.addEventListener('input', handleTextChange);
    snippetCell.addEventListener('paste', cleanPastedText);
    snippetCell.addEventListener('input', handleTextChange);
    deleteIcon.addEventListener('click', handleDeleteClick);
    if (!fromExistingData) {
        // enter create mode
        shortcutCell.parentNode.classList.add('changed-cell');
        snippetCell.parentNode.classList.add('changed-cell');
        addNewButton.style.display = 'none';
        editButton.innerText = 'Cancel';
        saveButton.innerText = 'Create';
        editButton.disabled = false;
        shortcutCell.focus();
        isAddingNew = true;
        setCellsReadOnly(true);
    }
}


// clean pasted text
function cleanPastedText(e) {
    e.preventDefault();
    const plainText = e.clipboardData.getData('text/plain');
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const textNode = document.createTextNode(plainText);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
}


// set cells read-only
function setCellsReadOnly(readOnly) {
    const snippetRows = document.getElementsByClassName('snippet-row');
    const numRows = isAddingNew ? snippetRows.length - 1 : snippetRows.length;
    for (let i = 0; i < numRows; i++) {
        const shortcutCell = snippetRows[i].querySelector('.SS_shortcut');
        const snippetCell = snippetRows[i].querySelector('.SS_snippet');
        shortcutCell.contentEditable = readOnly ? "false" : "true";
        snippetCell.contentEditable = readOnly ? "false" : "true";
        if (readOnly) {
            shortcutCell.innerText = shortcutCell.getAttribute('data-original-text');
            snippetCell.innerText = snippetCell.getAttribute('data-original-text');
            shortcutCell.parentNode.classList.remove('changed-cell');
            snippetCell.parentNode.classList.remove('changed-cell');
        }
    }
}


// handle edit click
function handleEditClick() {
    if (isAddingNew) {
        // cancel new row
        cancelNewRow();
        setCellsReadOnly(false);
    } else if (isEditing) {
        // end editing
        endEditing(false);
        setCellsReadOnly(false);
    } else {
        // start editing
        startEditing();
        setCellsReadOnly(true);
    }
}


// cancel new row
function cancelNewRow() {
    tableContainer.lastChild.remove();
    addNewButton.style.display = 'inherit';
    editButton.innerText = 'Edit';
    saveButton.innerText = 'Save';
    saveButton.disabled = true;
    editButton.disabled = tableContainer.children.length <= 1;
    isAddingNew = false;
}


// save new row
function saveNewRow() {
    const newShortcut = tableContainer.lastChild.querySelector('.SS_shortcut');
    const newSnippet = tableContainer.lastChild.querySelector('.SS_snippet');
    // save to storage
    chrome.storage.sync.get('snippetsData', data => {
        const snippetsData = data.snippetsData || [];
        snippetsData.push({
            shortcut: newShortcut.innerText,
            snippet: newSnippet.innerText,
        });
        chrome.storage.sync.set({ snippetsData: snippetsData }, () => {
            saveButton.disabled = true;
        });
    });
    // exit create mode
    newShortcut.setAttribute('data-original-text', newShortcut.innerText);
    newSnippet.setAttribute('data-original-text', newSnippet.innerText);
    newShortcut.parentNode.classList.remove('changed-cell');
    newSnippet.parentNode.classList.remove('changed-cell');
    addNewButton.style.display = 'inherit';
    editButton.innerText = 'Edit';
    saveButton.innerText = 'Save';
    saveButton.disabled = true;
    editButton.disabled = tableContainer.children.length <= 1;
    isAddingNew = false;
}


// start editing
function startEditing() {
    editButton.innerText = 'Cancel';
    saveButton.innerText = 'Confirm';
    addNewButton.style.display = 'none';
    for (let i = 0; i < deleteIcons.length; i++) {
        deleteIcons[i].style.display = 'inherit';
    }
    isEditing = true;
}


// end editing
function endEditing(saveChanges) {
    if (saveChanges) {
        // if saving changes, delete rows in queue
        deletedRowsQueue.forEach(row => row.element.remove());
    } else {
        // else, return rows in queue to normal
        deletedRowsQueue.forEach(row => {
            row.element.children[0].classList.remove('deleted-cell');
            row.element.children[1].classList.remove('deleted-cell');
        });
        deletedRowsQueue = [];
    }
    // exit edit mode
    editButton.innerText = 'Edit';
    saveButton.innerText = 'Save';
    addNewButton.style.display = 'inherit';
    for (let i = 0; i < deleteIcons.length; i++) {
        deleteIcons[i].style.display = 'none';
    }
    saveButton.disabled = true;
    isEditing = false;
}


// handle text change
function handleTextChange(e) {
    const cell = e.target;
    const cellIndex = Array.from(cell.parentNode.parentNode.children).indexOf(cell.parentNode);
    const originalText = cell.getAttribute('data-original-text');
    const currentText = cell.innerText;
    // change cell background color if changed
    if (originalText !== currentText) {
        cell.parentNode.classList.add('changed-cell');
        changedCells.add(cellIndex);
    } else {
        cell.parentNode.classList.remove('changed-cell');
        changedCells.delete(cellIndex);
    }
    if (isAddingNew) {
        // if adding new row, enable save button if both cells have text
        const newRow = tableContainer.lastChild;
        const newShortcut = newRow.querySelector('.SS_shortcut');
        const newSnippet = newRow.querySelector('.SS_snippet');
        saveButton.disabled = !(newShortcut.innerText.trim() && newSnippet.innerText.trim());
    } else {
        // else, enable save button if there are changes
        saveButton.disabled = changedCells.size === 0;
    }
}


// handle delete click
function handleDeleteClick(e) {
    const rowToDelete = e.target.parentNode;
    const shortcutValue = rowToDelete.querySelector('.SS_shortcut').innerText;
    const isDeleted = deletedRowsQueue.some(row => row.shortcut === shortcutValue);
    const shortcutCell = rowToDelete.children[0];
    const snippetCell = rowToDelete.children[1];
    // toggle deleted cell class and add/remove from queue
    if (isDeleted) {
        shortcutCell.classList.remove('deleted-cell');
        snippetCell.classList.remove('deleted-cell');
        deletedRowsQueue = deletedRowsQueue.filter(row => row.shortcut !== shortcutValue);
    } else {
        shortcutCell.classList.add('deleted-cell');
        snippetCell.classList.add('deleted-cell');
        deletedRowsQueue.push({ element: rowToDelete, shortcut: shortcutValue });
    }
    saveButton.disabled = deletedRowsQueue.length === 0;
}


// validate data
function validateData() {
    const shortcuts = Array.from(document.getElementsByClassName('SS_shortcut'));
    const snippets = Array.from(document.getElementsByClassName('SS_snippet'));
    // check for empty cells
    for (let i = 0; i < shortcuts.length; i++) {
        if (shortcuts[i].innerText.trim() === '' || snippets[i].innerText.trim() === '') {
            showMessage(errorMessage, 'Snippets cannot be empty');
            return false;
        }
    }
    // check for duplicate shortcuts
    const uniqueShortcuts = new Set(shortcuts.map(cell => cell.innerText.trim()));
    if (uniqueShortcuts.size !== shortcuts.length) {
        showMessage(errorMessage, 'Snippets cannot share the same shortcut');
        return false;
    }
    return true;
}


// save data
function saveData() {
    if (!validateData()) return;
    let messageText = 'Saved successfully';
    if (isEditing) {
        endEditing(true);
        messageText = 'Removed successfully';
    }
    if (isAddingNew) {
        saveNewRow();
        messageText = 'Created successfully';
    }
    const shortcuts = document.getElementsByClassName('SS_shortcut');
    const snippets = document.getElementsByClassName('SS_snippet');
    const snippetsData = [];
    for (let i = 0; i < shortcuts.length; i++) {
        const shortcutValue = shortcuts[i].innerText;
        // only save rows NOT marked for deletion
        if (!deletedRowsQueue.some(row => row.shortcut === shortcutValue)) {
            snippetsData.push({
                shortcut: shortcutValue,
                snippet: snippets[i].innerText
            });
        }
    }
    chrome.storage.sync.set({ snippetsData: snippetsData }, () => {
        saveButton.disabled = true;
        editButton.disabled = snippetsData.length === 0;
    });
    for (let i = 0; i < shortcuts.length; i++) {
        const shortcutValue = shortcuts[i].innerText;
        // update data-original-text and remove changed-cell class
        if (!deletedRowsQueue.some(row => row.shortcut === shortcutValue)) {
            shortcuts[i].setAttribute('data-original-text', shortcutValue);
            snippets[i].setAttribute('data-original-text', snippets[i].innerText);
            shortcuts[i].parentNode.classList.remove('changed-cell');
            snippets[i].parentNode.classList.remove('changed-cell');
        }
    }
    deletedRowsQueue = [];
    showMessage(successMessage, messageText);
    setCellsReadOnly(false);
}


// show message
function showMessage(messageElement, messageText) {
    const messageDescription = messageElement.children[1];
    messageDescription.innerText = messageText;
    messageElement.style.display = 'flex';
    setTimeout(() => {
        messageElement.style.display = 'none';
    }, 2500);
}


// load data
function loadData() {
    chrome.storage.sync.get('snippetsData', ({ snippetsData }) => {
        // if no data, disable edit button
        if (!snippetsData || snippetsData.length === 0) {
            editButton.disabled = true;
        } else {
            // else, enable edit button and add data to table
            editButton.disabled = false;
            snippetsData.forEach(item => {
                createNewRow(true);
                const shortcuts = document.getElementsByClassName('SS_shortcut');
                const snippets = document.getElementsByClassName('SS_snippet');
                shortcuts[shortcuts.length - 1].setAttribute('data-original-text', item.shortcut);
                snippets[snippets.length - 1].setAttribute('data-original-text', item.snippet);
                shortcuts[shortcuts.length - 1].innerText = item.shortcut;
                snippets[snippets.length - 1].innerText = item.snippet;
            });
        }
    });
    chrome.storage.sync.get('darkMode', (data) => {
        darkModeSwitch.checked = data.darkMode || false;
        toggleDarkMode(data.darkMode);
    });
    setTimeout(() => {
        document.body.classList.add('smooth-transition');
        document.querySelector('.slider').classList.add('smooth-transition');
    }, 100);
}


// toggle dark mode
function toggleDarkMode(checked) {
    if (checked) {
        chrome.storage.sync.set({ darkMode: true });
        for (const [key, value] of Object.entries(darkModeProperties)) {
            document.documentElement.style.setProperty(key, value);
        }
    } else {
        chrome.storage.sync.set({ darkMode: false });
        for (const [key, value] of Object.entries(lightModeProperties)) {
            document.documentElement.style.setProperty(key, value);
        }
    }
}


// event listeners
saveButton.addEventListener('click', () => saveData());
editButton.addEventListener('click', () => handleEditClick());
addNewButton.addEventListener('click', () => createNewRow(false));
darkModeSwitch.addEventListener('change', () => toggleDarkMode(darkModeSwitch.checked));


loadData();


const darkModeProperties = {
    '--title': '#939aa7',
    '--background': '#0d1117',
    '--text-primary': '#e6edf3',
    '--text-secondary': '#c1c9d4',
    '--text-tertiary': '#67707d',
    '--disabled-primary': '#21262d',
    '--disabled-secondary': '#484f58',
    '--new-button': '#646a76',
    '--border': '#30363d',
    '--header': '#161b22'
};
const lightModeProperties = {
    '--title': '#6B7280',
    '--background': '#ffffff',
    '--text-primary': '#1F2328',
    '--text-secondary': '#60676f',
    '--text-tertiary': '#6e7781',
    '--disabled-primary': '#f6f8fa',
    '--disabled-secondary': '#9ca5af',
    '--new-button': '#8991a1',
    '--border': '#d0d7de',
    '--header': '#f6f8fa'
};