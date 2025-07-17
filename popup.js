const usernames = [
    "nuriben",
    "blush",
    "hype",
    "nesrin",
    "prensesperver",
    "holythoth",
    "triel",
    "noeldayi",
    "egearseven",
    "sinasi",
    "timochin",
    "gokhanoner",
    "roseheus",
    "krmngraphic",
    "benender"
  ];
  
  let lastSeenOnline = {};
  let notificationSettings = {};
  let hiddenStreamers = []; // GİZLENEN YAYINCILARI TUTACAK DİZİ
  const themeBtn = document.getElementById("toggle-theme");
  let showOffline = false;
  
  // Bildirim için varsayılan yayıncılar
  const DEFAULT_STREAMERS = usernames.map(u => u.toLowerCase());
  
  // Helper Functions
  function formatViewers(count) {
    return count ? count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "0";
  }
  
  function calculateDuration(startTime) {
    if (!startTime) return "Bilinmiyor";
  
    const start = new Date(startTime).getTime(); // UTC
    const now = new Date();
    const nowUTC = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  
    const diffMs = nowUTC - start;
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
  
    return hours > 0 ? `${hours} saat ${minutes} dakika` : `${minutes} dakika`;
  }
  
  
  
  
  function formatRelativeTime(timeString) {
    const date = new Date(timeString);
    date.setHours(date.getHours() + 3); // 👈 burada 3 saat geriye alıyoruz
  
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / 60000);
  
    if (diffMinutes < 60) return `${diffMinutes} dakika önce`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} saat önce`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} gün önce`;
  }
  
  
  // UI Functions
  function loadTheme() {
    const savedTheme = localStorage.getItem("theme");
    const isLight = savedTheme === "light";
    document.body.classList.toggle("light", isLight);
  
  }
  
  
  function loadSettings() {
    showOffline = localStorage.getItem('showOffline') === 'true';
    document.getElementById('toggle-offline').classList.toggle('active', showOffline);
    document.getElementById('streamers-list').classList.toggle('show-offline', showOffline);
  }
  
  function toggleOfflineStreamers() {
    showOffline = !showOffline;
    localStorage.setItem('showOffline', showOffline);
    loadSettings();
  }
  
  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 500);
    }, 2000);
  }
  
  // Streamer Functions
  async function fetchStreamer(username) {
    try {
      const res = await fetch(`https://kick.com/api/v2/channels/${username}`);
      const data = await res.json();
      
      if (!data.livestream) {
        return {
          username: data.user?.username || username,
          is_live: false,
          followers: data.followers_count || 0,
          banner: data.banner_image?.url || "icons/placeholder.jpg",
          logo: data.user?.profile_pic || "icons/placeholder.jpg"
        };
      }
  
      return {
        username: data.user?.username || username,
        is_live: true,
        title: data.livestream?.session_title || "Başlık yok",
        category: data.livestream?.categories?.[0]?.name || "Bilinmiyor",
        viewers: data.livestream?.viewer_count || 0,
        started_at: data.livestream?.start_time || null,
        banner: data.banner_image?.url || "icons/placeholder.jpg",
        logo: data.user?.profile_pic || "icons/placeholder.jpg"
      };
    } catch (error) {
      console.error("Yayıncı bilgisi alınamadı:", username, error);
      return {
        username,
        is_live: false,
        followers: 0,
        banner: "icons/placeholder.jpg",
        logo: "icons/placeholder.jpg"
      };
    }
  }
  
  function sortStreamers(streamers) {
    return streamers.sort((a, b) => {
      if (a.is_live && !b.is_live) return -1;
      if (!a.is_live && b.is_live) return 1;
      if (a.is_live && b.is_live) return b.viewers - a.viewers;
      return b.followers - a.followers;
    });
  }
  
  function renderStreamers(streamers) {
  const container = document.getElementById("streamers-list");
  container.innerHTML = "";

  // Adım 1: Güvenlik filtresi. Gizlenen yayıncıları listeden çıkar.
  const streamersToRender = streamers.filter(s => !hiddenStreamers.includes(s.username.toLowerCase()));

  // Adım 2: Listenin tamamen boş olup olmadığını kontrol et. (Tüm yayıncılar gizlenmişse)
  if (streamersToRender.length === 0) {
    const msg = document.createElement("p");
    msg.className = "empty-message";
    msg.textContent = "Tüm yayıncılar gizlenmiş. Ayarlardan geri yükleyebilirsiniz.";
    container.appendChild(msg);
    return; // Fonksiyonu burada bitir, başka bir şey yapma.
  }

  // Adım 3: Görünen listede online olan biri var mı diye kontrol et. BU ADIM ÖNEMLİ!
  const isAnyoneOnline = streamersToRender.some(s => s.is_live);

  if (!isAnyoneOnline) {
    // Eğer online kimse yoksa, mesajı göster.
    // Bu mesajdan sonra, çevrimdışı kartlar yine de render edilecek.
    // CSS, kullanıcının ayarına göre bu kartları gizleyecek veya gösterecek.
    const msg = document.createElement("p");
    msg.className = "empty-message";
    msg.textContent = "💤 Şu anda yayında kimse yok.";
    container.appendChild(msg);
  }

  // Adım 4: Listedeki tüm kartları (hem online hem offline) render et.
  streamersToRender.forEach(s => {
    const div = document.createElement("div");
    div.className = `streamer-card ${s.is_live ? 'online' : 'offline'}`;
    div.style.setProperty('--banner-url', `url('${s.banner}')`);

    // Kart içeriği...
    div.innerHTML = `
      <button class="hide-streamer-btn" data-user="${s.username.toLowerCase()}" title="Bu yayıncıyı gizle">✖</button>
      <button class="notification-btn ${notificationSettings[s.username.toLowerCase()] !== false ? 'on' : 'off'}" 
            data-user="${s.username.toLowerCase()}"
            title="${notificationSettings[s.username.toLowerCase()] !== false ? 'Bildirimleri kapat' : 'Bildirimleri aç'}">
        ${notificationSettings[s.username.toLowerCase()] !== false ? '🔔' : '🔕'}
      </button>
      <div class="streamer-header">
          <div class="logo-container">
              <img src="${s.logo}" alt="${s.username} logosu" class="logo" />
          </div>
          <div class="streamer-info">
              <div class="user-status">
                  <span class="status-indicator ${s.is_live ? '' : 'offline'}"></span>
                  <strong>${s.username}</strong>
              </div>
              ${s.is_live ? `       
                  <div class="stream-title">${s.title}</div>
                  ${s.category ? `<div class="stream-category">${s.category}</div>` : ""}
                  <div class="stream-meta">
                      ${s.viewers ? `<span class="stream-viewers">👀 ${formatViewers(s.viewers)}</span>` : ""}
                      ${s.started_at ? `<span class="stream-duration">⏱️ ${calculateDuration(s.started_at)}</span>` : ""}
                  </div>
              ` : `
                  <span>👥 ${formatViewers(s.followers)} takipçi</span>
                  ${lastSeenOnline[s.username.toLowerCase()] ? `<div class="last-seen">🕓 Son yayın: ${formatRelativeTime(lastSeenOnline[s.username.toLowerCase()])}</div>` : ""}
              `}
          </div>
      </div>
    `;

    // Event listener'lar...
    div.addEventListener("click", () => window.open(`https://kick.com/${s.username}`, "_blank"));
    div.querySelector('.notification-btn').addEventListener('click', (e) => toggleNotification(s.username, e));
    div.querySelector('.hide-streamer-btn').addEventListener('click', (e) => hideStreamer(s.username, e));
    
    container.appendChild(div);
  });
}
  
  // Notification Functions
  function initNotificationSettings() {
    chrome.storage.local.get(['notificationSettings', 'lastSeenOnline', 'hiddenStreamers'], (data) => {
      notificationSettings = data.notificationSettings || {};
      lastSeenOnline = data.lastSeenOnline || {};
      hiddenStreamers = data.hiddenStreamers || []; // Gizli listeyi yükle
      
      
      // Varsayılan ayarları oluştur
      DEFAULT_STREAMERS.forEach(streamer => {
        const key = streamer.toLowerCase();
        if (notificationSettings[key] === undefined) {
          notificationSettings[key] = true;
        }
      });
      
      chrome.storage.local.set({ notificationSettings });
      loadStreamers();
    });
  }
  
  function toggleNotification(username, event) {
    event.stopPropagation();
    const key = username.toLowerCase();
    notificationSettings[key] = !notificationSettings[key];
  
    const btn = event.target.closest('.notification-btn');
    if (btn) {
      btn.textContent = notificationSettings[key] ? '🔔' : '🔕';
      btn.title = notificationSettings[key] ? 'Bildirimleri kapat' : 'Bildirimleri aç';
      btn.classList.toggle('on', notificationSettings[key]);
      btn.classList.toggle('off', !notificationSettings[key]);
    }
  
    chrome.storage.local.set({ notificationSettings });
    showToast(notificationSettings[key] 
      ? `🔔 ${username} bildirimleri AÇIK` 
      : `🔕 ${username} bildirimleri KAPALI`);
  }



  // ------ YENİ FONKSİYONLAR ------

// Seçilen yayıncıyı gizler
function hideStreamer(username, event) {
  event.stopPropagation(); // Kartın tıklanmasını engelle
  const key = username.toLowerCase();

  if (!hiddenStreamers.includes(key)) {
    hiddenStreamers.push(key);
    chrome.storage.local.set({ hiddenStreamers }, () => {
      showToast(`😢 ${username} gizlendi.`);
      loadStreamers(); // Ana listeyi yenile
    });
  }
}

// Gizlenen yayıncıyı geri yükler
function restoreStreamer(username) {
  const key = username.toLowerCase();
  hiddenStreamers = hiddenStreamers.filter(u => u !== key);
  
  chrome.storage.local.set({ hiddenStreamers }, () => {
    showToast(`🎉 ${username} geri yüklendi.`);
    renderHiddenStreamers(); // Gizlenenler listesini yenile
    loadStreamers(); // Ana listeyi de yenile
  });
}

// Gizlenen yayıncıların listesini çizer
function renderHiddenStreamers() {
  const container = document.getElementById("hidden-streamers-list");
  container.innerHTML = "";

  if (hiddenStreamers.length === 0) {
    container.innerHTML = "<p class='empty-message'>Gizlenen yayıncı yok.</p>";
    return;
  }

  hiddenStreamers.sort().forEach(username => {
    const item = document.createElement("div");
    item.className = "hidden-streamer-item";
    item.innerHTML = `
      <span>${username}</span>
      <button class="restore-streamer-btn" data-user="${username}" title="Geri yükle">➕</button>
    `;
    item.querySelector('.restore-streamer-btn').addEventListener('click', () => restoreStreamer(username));
    container.appendChild(item);
  });
}

// Ana liste ve gizlenenler listesi arasında geçiş yapar
function toggleManageView() {
  const mainView = document.getElementById("streamers-list");
  const manageView = document.getElementById("hidden-streamers-view");
  const isCurrentlyManaging = manageView.style.display === 'flex';

  if (isCurrentlyManaging) {
    manageView.style.display = 'none';
    mainView.style.display = 'block';
  } else {
    renderHiddenStreamers(); // Yönetim görünümüne geçmeden önce listeyi doldur
    manageView.style.display = 'flex';
    mainView.style.display = 'none';
  }
}
  

  // Main Functions
  async function loadStreamers() {
    document.getElementById("streamers-list").innerHTML = "<p style='text-align:center;'>⏳ Yükleniyor...</p>";

    // GİZLENMİŞ OLANLARI FİLTRELE
    const visibleUsernames = usernames.filter(u => !hiddenStreamers.includes(u.toLowerCase()));

    // Eğer gösterilecek hiç yayıncı kalmadıysa, mesaj göster ve bitir.
    if (visibleUsernames.length === 0) {
      listContainer.innerHTML = '<p class="empty-message">Tüm yayıncılar gizlenmiş. Ayarlardan geri yükleyebilirsiniz.</p>';
      return;
    }
    
    try {
      const results = await Promise.all(usernames.map(fetchStreamer));
      const sorted = sortStreamers(results);
      renderStreamers(sorted);
      
      const onlineCount = results.filter(s => s.is_live).length;
      document.getElementById("last-updated").textContent = `Son güncelleme: ${new Date().toLocaleTimeString("tr-TR")}`;
    } catch (error) {
      console.error("Yayıncılar yüklenirken hata:", error);
      document.getElementById("streamers-list").innerHTML = '<p class="error-message">⚠️ Yüklenirken hata oluştu</p>';
    }
  }
  
  // Event Listeners
  document.addEventListener("DOMContentLoaded", () => {
    loadTheme();
    loadSettings();
    initNotificationSettings();
  
    document.getElementById("refresh-button").addEventListener("click", loadStreamers);
    document.getElementById("toggle-offline").addEventListener("click", toggleOfflineStreamers);

    // YENİ EVENT LISTENERS
    document.getElementById("manage-hidden-button").addEventListener("click", toggleManageView);
    document.getElementById("back-to-main-list").addEventListener("click", toggleManageView);
    
    themeBtn.addEventListener("click", () => {
      const isLight = document.body.classList.toggle("light");
      localStorage.setItem("theme", isLight ? "light" : "dark");
    });
  
    // Settings Toggle
    const toggleSettingsBtn = document.getElementById("toggle-settings");
    if (toggleSettingsBtn) {
      toggleSettingsBtn.addEventListener("click", () => {
        const settingsDiv = document.getElementById("extension-settings");
        settingsDiv.style.display = settingsDiv.style.display === "none" ? "block" : "none";
      });
    }
  
    // Load saved settings
    chrome.storage.local.get(['userSettings'], (data) => {
      const settings = data.userSettings || {
        autoSidebar: true,
        force1080p: true,
        preventHost: true,
        muteNotifications: false
      };
      
      const muteCb = document.getElementById("setting-mute");
       if (muteCb) muteCb.checked = settings.muteNotifications;
      const sidebarCb = document.getElementById("setting-sidebar");
      const qualityCb = document.getElementById("setting-quality");
      const hostCb = document.getElementById("setting-host");
      
      if (sidebarCb) sidebarCb.checked = settings.autoSidebar;
      if (qualityCb) qualityCb.checked = settings.force1080p;
      if (hostCb) hostCb.checked = settings.preventHost;
  
      [muteCb, sidebarCb, qualityCb, hostCb].forEach(cb => {
        if (cb) {
          cb.addEventListener("change", () => {
            chrome.storage.local.set({ 
              userSettings: {
                autoSidebar: sidebarCb.checked,
                force1080p: qualityCb.checked,
                preventHost: hostCb.checked,
                muteNotifications: muteCb.checked
              }
            });
          });
        }
      });
    });
    chrome.runtime.sendMessage({ action: "forceCheck" });
  });
  
  // Auto-refresh
  setInterval(() => {
    if (!document.hidden) {
      loadStreamers();
    }
  }, 90 * 1000);