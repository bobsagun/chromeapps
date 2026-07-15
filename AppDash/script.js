const grid = document.getElementById('app-grid');
const grabBtn = document.getElementById('grab-btn');
const editModal = document.getElementById('edit-modal');
const urlInput = document.getElementById('icon-url-input');
const fileInput = document.getElementById('icon-file-input');
const saveIconBtn = document.getElementById('save-icon-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');

let editingIndex = null;
let longPressTimer;
const LONG_PRESS_DURATION = 600; // milliseconds

const editIconSvg = `
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>`;

let sortableInstance = new Sortable(grid, {
  animation: 150,
  ghostClass: 'sortable-ghost',
  onEnd: () => saveNewOrder(),
  delay: 200, // Slight delay to distinguish drag from tap
});

function loadApps() {
  grid.innerHTML = '';
  chrome.storage.local.get(['apps'], (data) => {
    const apps = data.apps || [];
    apps.forEach((app, index) => {
      const container = document.createElement('div');
      container.className = 'app-container';
      container.setAttribute('data-url', app.url);
      
      const iconUrl = app.customIcon || `https://www.google.com/s2/favicons?sz=128&domain=${app.url}`;
      
      container.innerHTML = `
        <button class="action-btn edit-btn" title="Edit">${editIconSvg}</button>
        <button class="action-btn delete-btn" title="Remove">&times;</button>
        <img src="${iconUrl}" class="app-icon" onerror="this.src='icon.png'">
      `;

      // --- Interaction Logic ---
      let isLongPress = false;

      const startPress = () => {
        isLongPress = false;
        longPressTimer = setTimeout(() => {
          isLongPress = true;
          // Deactivate any other open icons
          document.querySelectorAll('.app-container').forEach(el => el.classList.remove('show-actions'));
          // Activate this icon
          container.classList.add('show-actions');
        }, LONG_PRESS_DURATION);
      };

      const cancelPress = () => {
        clearTimeout(longPressTimer);
      };

      container.onmousedown = startPress;
      container.ontouchstart = startPress;
      
      container.onmouseup = (e) => {
        cancelPress();
        // Only open link if it WAS NOT a long press and NOT clicking a button
        if (!isLongPress && !e.target.closest('.action-btn')) {
          window.open(app.url, '_blank');
        }
      };

      container.ontouchend = cancelPress;
      container.onmouseleave = cancelPress;

      // Delete Logic
      container.querySelector('.delete-btn').onclick = (e) => {
        e.stopPropagation();
        apps.splice(index, 1);
        chrome.storage.local.set({ apps }, loadApps);
      };

      // Edit Logic
      container.querySelector('.edit-btn').onclick = (e) => {
        e.stopPropagation();
        editingIndex = index;
        urlInput.value = (app.customIcon && !app.customIcon.startsWith('data:')) ? app.customIcon : '';
        fileInput.value = '';
        editModal.style.display = 'flex';
        container.classList.remove('show-actions');
      };
      
      grid.appendChild(container);
    });
  });
}

// Close action buttons if clicking anywhere else
document.addEventListener('mousedown', (e) => {
  if (!e.target.closest('.app-container')) {
    document.querySelectorAll('.app-container').forEach(el => el.classList.remove('show-actions'));
  }
});

cancelEditBtn.onclick = () => {
  editModal.style.display = 'none';
  editingIndex = null;
};

saveIconBtn.onclick = () => {
  const file = fileInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => updateAppIcon(e.target.result);
    reader.readAsDataURL(file);
  } else {
    updateAppIcon(urlInput.value.trim());
  }
};

function updateAppIcon(iconData) {
  chrome.storage.local.get(['apps'], (data) => {
    const apps = data.apps || [];
    if (editingIndex !== null) {
      apps[editingIndex].customIcon = iconData || null;
      chrome.storage.local.set({ apps }, () => {
        editModal.style.display = 'none';
        loadApps();
      });
    }
  });
}

function saveNewOrder() {
  const items = document.querySelectorAll('.app-container');
  chrome.storage.local.get(['apps'], (data) => {
    const oldApps = data.apps || [];
    const newOrder = Array.from(items).map(item => {
      const url = item.getAttribute('data-url');
      return oldApps.find(a => a.url === url) || { url: url };
    });
    chrome.storage.local.set({ apps: newOrder });
  });
}

grabBtn.onclick = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.url && !tab.url.startsWith('chrome://')) {
    chrome.storage.local.get(['apps'], (data) => {
      const apps = data.apps || [];
      if (!apps.some(a => a.url === tab.url)) {
        apps.push({ url: tab.url });
        chrome.storage.local.set({ apps }, loadApps);
      }
    });
  }
};

loadApps();