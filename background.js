// Kick Yayıncı Takip Sistemi - Background Script
let lastNotifiedStartTimes = {};
let lastSeenOnline = {};
let notificationSettings = {};
let checkTimer = null;
const CHECK_INTERVAL = 90 * 1000; // 90 saniye

// Varsayılan yayıncı listesi (küçük harfle)
const DEFAULT_STREAMERS = [
  'hype', 'egearseven', 'blush', 'nuriben', 'nesrin',
  'prensesperver', 'holythoth', 'triel', 'noeldayi',
  'sinasi', 'timochin', 'gokhanoner', 'roseheus',
  'krmngraphic', 'benender'
].map(name => name.toLowerCase());

// Başlangıçta ayarları yükle
function loadSettings() {
  chrome.storage.local.get(
    ['lastNotifiedStartTimes', 'lastSeenOnline', 'notificationSettings'],
    (data) => {
      lastNotifiedStartTimes = data.lastNotifiedStartTimes || {};
      lastSeenOnline = data.lastSeenOnline || {};
      notificationSettings = data.notificationSettings || {};

      // Eksik yayıncıları tamamla
      DEFAULT_STREAMERS.forEach(username => {
        if (notificationSettings[username] === undefined) {
          notificationSettings[username] = true;
        }
      });

      chrome.storage.local.set({ notificationSettings });
      startPeriodicChecks();
      checkAllStreamers(true); // İlk kontrol
    }
  );
}

// Bildirim gönder
function showNotification(streamer, isMuted) {
  const notificationId = `${streamer.username.toLowerCase()}-${Date.now()}`;
  chrome.notifications.create(notificationId, {
    type: 'basic',
    iconUrl: streamer.logo || 'icons/icon48.png',
    title: `${streamer.username} yayında!`,
    message: streamer.title || 'Yeni yayın başladı',
    priority: isMuted ? 0 : 2,
    silent: isMuted,
    requireInteraction: false,
    buttons: [
      { title: "Yayını İzle" },
      { title: "Kapat" }
    ]
  });

  setTimeout(() => {
    chrome.notifications.clear(notificationId);
  }, 10000);

  console.log(`[🔔] Yeni yayın bildirimi gönderildi: ${streamer.username} (Ses: ${isMuted ? "Kapalı" : "Açık"})`);
}

chrome.notifications.onButtonClicked.addListener((notifId, buttonIndex) => {
  const username = notifId.split('-')[0];

  if (buttonIndex === 0) {
    // 🔴 Yayını İzle
    chrome.tabs.create({ url: `https://kick.com/${username}` });
  } else if (buttonIndex === 1) {
    // ❌ Kapat
    chrome.notifications.clear(notifId);
  }
});


// Tüm yayıncıları kontrol et
async function checkAllStreamers(initialLoad = false) {
  const data = await chrome.storage.local.get([
    'lastNotifiedStartTimes',
    'lastSeenOnline',
    'notificationSettings',
    'userSettings'
  ]);

  lastNotifiedStartTimes = data.lastNotifiedStartTimes || {};
  lastSeenOnline = data.lastSeenOnline || {};
  notificationSettings = data.notificationSettings || {};
  const userSettings = data.userSettings || {};
  const isMuted = userSettings.muteNotifications === true;

  console.log("[♻️] localStorage'dan veriler yeniden yüklendi.");
  console.log(`[🔍] Yayın kontrolü başlatıldı (${initialLoad ? 'İlk' : 'Periyodik'})`);

  try {
    const responses = await Promise.all(
      DEFAULT_STREAMERS.map(username =>
        fetch(`https://kick.com/api/v2/channels/${username}`)
          .then(res => res.ok ? res.json() : null)
          .catch(() => null)
      )
    );

    const onlineStreamers = responses.filter(data => data?.livestream);
    const onlineCount = onlineStreamers.length;

    const now = new Date().toISOString();
    const updates = {
      lastSeenOnline: { ...lastSeenOnline },
      lastNotifiedStartTimes: { ...lastNotifiedStartTimes }
    };

    onlineStreamers.forEach(data => {
      const username = (data.user?.username || data.slug).toLowerCase();
      const startTime = data.livestream.start_time;
    
      if (!lastSeenOnline[username] || lastSeenOnline[username] !== startTime) {
        updates.lastSeenOnline[username] = startTime;
        console.log(`[🕓] ${username} yayını ${startTime} olarak kaydedildi.`);
      }

    
      const isNotifOn = notificationSettings[username] !== false;
      const alreadyNotified = updates.lastNotifiedStartTimes[username] === startTime;
    
      if (!initialLoad && isNotifOn && !alreadyNotified) {
        // Bildirim gönder, ardından local bellekte updates objesini güncelle
        showNotification({
          username: data.user?.username || data.slug,
          started_at: startTime,
          title: data.livestream.session_title,
          logo: data.user?.profile_pic || 'icons/icon48.png'
        }, isMuted);
    
        updates.lastNotifiedStartTimes[username] = startTime; // 🧠 BURASI KRİTİK
      }
    });

    Object.assign(lastSeenOnline, updates.lastSeenOnline);
    Object.assign(lastNotifiedStartTimes, updates.lastNotifiedStartTimes);

    await chrome.storage.local.set({
      lastSeenOnline,
      lastNotifiedStartTimes,
      lastUpdated: now,
      lastBadgeCount: onlineCount
    });
    console.log("[💾] lastSeenOnline güncellendi:", lastSeenOnline);


    updateBadge(onlineCount);
  } catch (err) {
    console.error('[❌] Kontrol hatası:', err);
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setTitle({ title: "Hata oluştu!" });
  }
}


// Badge güncelle
function updateBadge(count) {
  // Sayıyı kontrol et ve geçerli değilse gösterme
  const badgeText = Number.isInteger(count) && count > 0 ? count.toString() : '';
  
  chrome.action.setBadgeText({ text: badgeText });
  chrome.action.setBadgeBackgroundColor({
    color: count > 0 ? '#00b894' : '#888'
  });
  
  chrome.action.setTitle({ title: "Katman Yayıncıları Takibi" });
}

// Periyodik kontrolleri başlat
function startPeriodicChecks() {
  if (checkTimer) clearInterval(checkTimer);
  
  checkTimer = setInterval(() => {
    console.log("[⏰] Periyodik kontrol başlatılıyor...");
    checkAllStreamers();
  }, CHECK_INTERVAL);
}

// Bildirim tıklama işleyici
chrome.notifications.onClicked.addListener(notificationId => {
  const username = notificationId.split('-')[0];
  chrome.tabs.create({ 
    url: `https://kick.com/${username}`,
    active: true
  });
});

// Mesaj işleyici
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "forceCheck":
      checkAllStreamers();
      sendResponse({ status: "checking" });
      break;
      
    case "updateSettings":
      notificationSettings = request.settings;
      chrome.storage.local.set({ notificationSettings });
      sendResponse({ status: "updated" });
      break;
      
    case "getOnlineCount":
      chrome.storage.local.get(['lastBadgeCount'], (data) => {
        sendResponse({ count: data.lastBadgeCount || 0 });
      });
      return true; // Async response
  }
  return true;
});

// Başlangıç
chrome.runtime.onStartup.addListener(loadSettings);
chrome.runtime.onInstalled.addListener(loadSettings);

// Temizlik
chrome.runtime.onSuspend.addListener(() => {
  if (checkTimer) clearInterval(checkTimer);
});

chrome.alarms.create('periodicCheck', {
  periodInMinutes: 1
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'periodicCheck') {
    console.log('[⏰] Alarm tetiklendi → Yayıncılar kontrol ediliyor...');
    checkAllStreamers();
  }
});