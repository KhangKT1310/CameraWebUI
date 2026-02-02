const page = document.getElementById("page");
const toast = document.getElementById("toast");

const USE_MOCK = true;

const ENDPOINTS = {
  reboot: "/cgi-bin/system.cgi?action=reboot",
  status: "/cgi-bin/status.cgi",
  video: "/cgi-bin/video.cgi",
  audio: "/cgi-bin/audio.cgi",
  network: "/cgi-bin/network.cgi",
  time: "/cgi-bin/time.cgi",
  export: "/cgi-bin/config.cgi?action=export",
  factoryReset: "/cgi-bin/system.cgi?action=reset",
  ir: "/cgi-bin/ir.cgi?action=toggle",
  record: "/cgi-bin/record.cgi?action=start",
  snapshot: "/cgi-bin/snapshot.cgi"
};

const MOCK = {
  status: {
    health: "Online",
    mode: "Normal",
    uptime: "12d 04h 22m",
    firmware: "v2.1.8",
    storage: "78% used",
    storageState: "Healthy",
    temp: "48°C",
    voltage: "12.1V"
  },
  health: {
    cpu: "38%",
    mem: "62%",
    net: "4.2 Mbps / 1.1 Mbps"
  },
  system: {
    model: "VX-5000",
    serial: "VGT-2026-0312",
    firmware: "v2.1.8",
    build: "2026-01-12"
  },
  network: {
    dhcp: false,
    mtu: "1500",
    ip: "192.168.1.100",
    mask: "255.255.255.0",
    gateway: "192.168.1.1",
    dns1: "8.8.8.8",
    dns2: "1.1.1.1",
    http_port: "80"
  },
  video: {
    codec: "H.264",
    resolution: "1920x1080",
    fps: "30",
    bitrate: "2048",
    gop: "60",
    profile: "Main",
    rotate: "0°",
    mirror: "Off"
  },
  audio: {
    audio_codec: "AAC",
    sample_rate: "48 kHz",
    audio_bitrate: "128",
    mic_gain: "75",
    noise_reduction: "Medium",
    audio_channel: "Mono"
  }
};

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

function apiPost(url, payload) {
  if (USE_MOCK) {
    return Promise.resolve({ ok: true, data: payload });
  }
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

function apiGet(url) {
  if (USE_MOCK) {
    return Promise.resolve({ ok: true, data: {} });
  }
  return fetch(url).then(res => res.json());
}

document.querySelectorAll(".nav a").forEach(link => {
  link.onclick = () => {
    document.querySelectorAll(".nav a").forEach(a => a.classList.remove("active"));
    link.classList.add("active");
    loadPage(link.dataset.page);
  };
});

function loadPage(name) {
  fetch(`pages/${name}.html`)
    .then(res => res.text())
    .then(html => {
      page.innerHTML = html;
      initPage(name);
    });
}

function initPage(name) {
  if (name === "dashboard") {
    loadDashboardStatus();
  }
  if (name === "video") {
    bindForm("video-form", saveVideo);
    bindForm("audio-form", saveAudio);
    loadVideoConfig();
    loadAudioConfig();
  }
  if (name === "network") {
    bindForm("network-form", saveNetwork);
    loadNetworkConfig();
  }
  if (name === "system") {
    bindForm("time-form", saveTime);
    loadSystemInfo();
  }
}

function bindForm(id, handler) {
  const form = document.getElementById(id);
  if (!form) return;
  form.addEventListener("submit", event => {
    event.preventDefault();
    handler(new FormData(form), form);
  });
}

function setFormValues(form, data) {
  if (!form || !data) return;
  Object.keys(data).forEach(key => {
    const field = form.querySelector(`[name="${key}"]`);
    if (!field) return;
    if (field.type === "checkbox") {
      field.checked = Boolean(data[key]);
    } else {
      field.value = data[key];
    }
  });
}

function loadDashboardStatus() {
  const status = MOCK.status;
  const health = MOCK.health;

  setText("status-health", status.health);
  setText("status-mode", status.mode);
  setText("status-uptime", status.uptime);
  setText("status-firmware", `Firmware ${status.firmware}`);
  setText("status-storage", status.storage);
  setText("status-storage-state", status.storageState);
  setText("status-temp", status.temp);
  setText("status-voltage", `Voltage ${status.voltage}`);
  setText("health-cpu", health.cpu);
  setText("health-mem", health.mem);
  setText("health-net", health.net);

  const pill = document.getElementById("connection-pill");
  if (pill) pill.lastChild.textContent = status.health;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function loadVideoConfig() {
  const form = document.getElementById("video-form");
  if (USE_MOCK) {
    setFormValues(form, MOCK.video);
    showToast("Loaded video configuration");
  } else {
    apiGet(ENDPOINTS.video).then(data => setFormValues(form, data));
  }
}

function loadAudioConfig() {
  const form = document.getElementById("audio-form");
  if (USE_MOCK) {
    setFormValues(form, MOCK.audio);
    showToast("Loaded audio configuration");
  } else {
    apiGet(ENDPOINTS.audio).then(data => setFormValues(form, data));
  }
}

function loadNetworkConfig() {
  const form = document.getElementById("network-form");
  if (USE_MOCK) {
    setFormValues(form, MOCK.network);
    showToast("Loaded network configuration");
  } else {
    apiGet(ENDPOINTS.network).then(data => setFormValues(form, data));
  }
}

function loadSystemInfo() {
  if (USE_MOCK) {
    setText("sys-model", MOCK.system.model);
    setText("sys-serial", MOCK.system.serial);
    setText("sys-firmware", MOCK.system.firmware);
    setText("sys-build", MOCK.system.build);
  } else {
    apiGet(ENDPOINTS.status).then(data => {
      setText("sys-model", data.model);
      setText("sys-serial", data.serial);
      setText("sys-firmware", data.firmware);
      setText("sys-build", data.build);
    });
  }
}

function saveVideo(formData) {
  const payload = Object.fromEntries(formData.entries());
  apiPost(ENDPOINTS.video, payload).then(() => showToast("Video settings applied"));
}

function saveAudio(formData) {
  const payload = Object.fromEntries(formData.entries());
  apiPost(ENDPOINTS.audio, payload).then(() => showToast("Audio settings applied"));
}

function saveNetwork(formData) {
  const payload = Object.fromEntries(formData.entries());
  payload.dhcp = payload.dhcp === "on";
  apiPost(ENDPOINTS.network, payload).then(() => showToast("Network settings applied"));
}

function saveTime(formData) {
  const payload = Object.fromEntries(formData.entries());
  apiPost(ENDPOINTS.time, payload).then(() => showToast("Time settings applied"));
}

function refreshThumbs() {
  document.querySelectorAll(".cam-thumb img").forEach(img => {
    const base = img.src.split("?")[0];
    img.src = `${base}?_=${Date.now()}`;
  });
  showToast("Thumbnails refreshed");
}

function reboot() {
  if (!confirm("Reboot camera?")) return;
  if (USE_MOCK) {
    showToast("Mock reboot triggered");
  } else {
    fetch(ENDPOINTS.reboot, { method: "POST" });
  }
}

function toggleIr() {
  apiPost(ENDPOINTS.ir, {}).then(() => showToast("IR LEDs toggled"));
}

function startRecording() {
  apiPost(ENDPOINTS.record, {}).then(() => showToast("Recording started"));
}

function captureSnapshot() {
  if (USE_MOCK) {
    showToast("Snapshot captured");
  } else {
    window.open(ENDPOINTS.snapshot, "_blank");
  }
}

function exportConfig() {
  if (USE_MOCK) {
    showToast("Config exported (mock)");
  } else {
    window.open(ENDPOINTS.export, "_blank");
  }
}

function factoryReset() {
  if (!confirm("Factory reset will erase settings. Continue?")) return;
  if (USE_MOCK) {
    showToast("Factory reset triggered (mock)");
  } else {
    fetch(ENDPOINTS.factoryReset, { method: "POST" });
  }
}

loadPage("dashboard");
