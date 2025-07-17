// content.js – Sidebar + Kalite + Host Engelleme (ayarlarla kontrol + çaktırmadan uyarı)

chrome.storage.local.get(['userSettings'], (data) => {
    const settings = data.userSettings || {
      autoSidebar: true,
      force1080p: true,
      preventHost: true
    };
  
    window.addEventListener("load", () => {
      if (settings.autoSidebar) {
        setTimeout(() => {
          const toggleBtn = document.querySelector('button[aria-controls="sidebar-wrapper"]');
          if (toggleBtn && toggleBtn.getAttribute("aria-expanded") === "true") {
            toggleBtn.click();
            console.log("✅ Sidebar küçültüldü");
          }
        }, 2000);
      }
  
      if (settings.force1080p) {
        setTimeout(() => {
          watchForQualityMenu();
          showSubtleReminder();
        }, 4000);
      }
  
      if (settings.preventHost) {
        setTimeout(() => {
          checkForHostOverride();
        }, 5000);
      }
    });
  });
  
  function watchForQualityMenu() {
    const settingsBtn = document.querySelector('button[aria-haspopup="menu"]');
    if (settingsBtn) {
      settingsBtn.click();
      console.log("⚙️ Ayar çarkına tıklandı");
  
      setTimeout(() => {
        const observer = new MutationObserver((mutations, obs) => {
          let qualityOption = document.querySelector('div[data-radix-collection-item="1080p60"]');
  
          if (!qualityOption) {
            const allOptions = document.querySelectorAll('[role="menuitemradio"]');
            for (const item of allOptions) {
              if (item.textContent.includes("1080")) {
                qualityOption = item;
                break;
              }
            }
          }
  
          if (qualityOption) {
            qualityOption.click();
            console.log("✅ Yayın kalitesi 1080p60 olarak ayarlandı (metinle veya data ile)");
            obs.disconnect();
          }
        });
  
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
  
        console.log("🔍 MutationObserver başlatıldı (gecikmeli)");
      }, 1000);
    } else {
      console.log("❌ Ayar çarkı butonu bulunamadı");
    }
  }
  
  function showSubtleReminder() {
    const note = document.createElement("div");
    note.textContent = "💡 Kaliteyi 1080p yapmak için kalite ayarlarına bir kez tıklamanız önerilir.";
    note.style.position = "fixed";
    note.style.bottom = "10px";
    note.style.left = "50%";
    note.style.transform = "translateX(-50%)";
    note.style.backgroundColor = "#222";
    note.style.color = "#fff";
    note.style.padding = "8px 14px";
    note.style.borderRadius = "10px";
    note.style.fontSize = "12px";
    note.style.zIndex = "9999";
    note.style.opacity = "0.95";
    note.style.transition = "opacity 0.5s ease";
  
    document.body.appendChild(note);
  
    setTimeout(() => {
      note.style.opacity = "0";
      setTimeout(() => note.remove(), 1000);
    }, 5000);
  }
  
  function checkForHostOverride() {
    const iframe = document.querySelector('iframe[src*="kick.com/embed"]');
    if (!iframe) return;
  
    const pathParts = window.location.pathname.split('/');
    const currentChannel = pathParts[1]?.toLowerCase();
  
    const srcMatch = iframe.src.match(/embed\/([^?/]+)/i);
    const embedChannel = srcMatch?.[1]?.toLowerCase();
  
    if (embedChannel && currentChannel && embedChannel !== currentChannel) {
      console.warn(`🚫 Host yayını tespit edildi: embed = ${embedChannel}, sayfa = ${currentChannel}`);
  
      iframe.style.display = 'none';
  
      const msg = document.createElement("div");
      msg.textContent = "⚠️ Bu kanal şu anda başka bir yayını host ediyor. Video gösterilmiyor.";
      msg.style.position = "absolute";
      msg.style.top = "120px";
      msg.style.left = "50%";
      msg.style.transform = "translateX(-50%)";
      msg.style.backgroundColor = "#111";
      msg.style.color = "#fff";
      msg.style.padding = "10px 20px";
      msg.style.borderRadius = "10px";
      msg.style.zIndex = "9999";
      msg.style.fontSize = "16px";
      msg.style.boxShadow = "0 2px 6px rgba(0,0,0,0.5)";
      document.body.appendChild(msg);
    }
  }