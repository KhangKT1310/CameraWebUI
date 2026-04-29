const page = document.getElementById("page");
const toast = document.getElementById("toast");
const authScreen = document.getElementById("auth-screen");
const appShell = document.querySelector(".app");

const USE_MOCK = true;

const AUTH_KEY = "camera-auth";
const CAMERA_KEY = "camera-list";
const DASHBOARD_CAMERA_ID = "camera-001";
const DASHBOARD_STREAM_COUNT = 4;
const WEBRTC_CLIENT_ID_LENGTH = 10;
const DEFAULT_WEBRTC_RUNTIME_CONFIG = {
  host: "webrtc.vigorlabs.org",
  wsPort: 23000,
  stunUrl: "stun:webrtc.vigorlabs.org:23001",
  turnUrl: "turn:webrtc.vigorlabs.org:23001?transport=udp",
  username: "myuser",
  credential: "mypassword",
  iceTransportPolicy: "relay"
};
let activePage = null;
let dashboardSessions = [];
let webRtcRuntimeConfig = { ...DEFAULT_WEBRTC_RUNTIME_CONFIG };

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
  snapshot: "/cgi-bin/snapshot.cgi",
  login: "/cgi-bin/login.cgi",
  logout: "/cgi-bin/logout.cgi"
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
  },
  cameras: [
    {
      name: "Camera 01 – Entrance",
      channel: "0",
      snapshot: "/cgi-bin/snapshot.cgi?ch=0",
      meta: "1920x1080 @ 30fps"
    },
    {
      name: "Camera 02 – Parking",
      channel: "1",
      snapshot: "/cgi-bin/snapshot.cgi?ch=1",
      meta: "1920x1080 @ 25fps"
    },
    {
      name: "Camera 03 – Lobby",
      channel: "2",
      snapshot: "/cgi-bin/snapshot.cgi?ch=2",
      meta: "1280x720 @ 30fps"
    },
    {
      name: "Camera 04 – Warehouse",
      channel: "3",
      snapshot: "/cgi-bin/snapshot.cgi?ch=3",
      meta: "1920x1080 @ 20fps"
    }
  ]
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
  teardownPage(activePage);
  fetch(`pages/${name}.html`)
    .then(res => res.text())
    .then(html => {
      page.innerHTML = html;
      activePage = name;
      initPage(name);
    });
}

function initPage(name) {
  if (name === "dashboard") {
    loadDashboardStatus();
    bindForm("camera-form", addCamera);
    renderCameras();
    initDashboardLiveGrid();
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

function teardownPage(name) {
  if (name === "dashboard") {
    destroyDashboardLiveGrid();
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

function getCameras() {
  const stored = localStorage.getItem(CAMERA_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (err) {
      return [...MOCK.cameras];
    }
  }
  return [...MOCK.cameras];
}

function saveCameras(cameras) {
  localStorage.setItem(CAMERA_KEY, JSON.stringify(cameras));
}

function renderCameras() {
  const grid = document.getElementById("camera-grid");
  if (!grid) return;
  const cameras = getCameras();
  grid.innerHTML = "";

  cameras.forEach(camera => {
    const card = document.createElement("div");
    card.className = "card cam";
    card.dataset.ch = camera.channel || "";

    const thumb = document.createElement("div");
    thumb.className = "cam-thumb";

    const img = document.createElement("img");
    img.alt = camera.name;
    img.dataset.src = camera.snapshot;
    img.src = cacheBust(camera.snapshot);

    const badge = document.createElement("span");
    badge.className = "badge live";
    badge.textContent = "LIVE";

    thumb.appendChild(img);
    thumb.appendChild(badge);

    const title = document.createElement("div");
    title.className = "cam-title";
    title.textContent = camera.name;

    const meta = document.createElement("div");
    meta.className = "cam-meta";
    meta.textContent = camera.meta || "Stream";

    card.appendChild(thumb);
    card.appendChild(title);
    card.appendChild(meta);
    grid.appendChild(card);
  });
}

function cacheBust(url) {
  if (!url) return "";
  const joiner = url.includes("?") ? "&" : "?";
  return `${url}${joiner}_=${Date.now()}`;
}

async function loadRuntimeConfig() {
  try {
    const response = await fetch("/api/runtime-config", { cache: "no-store" });
    if (!response.ok) return;

    const runtimeConfig = await response.json();
    if (!runtimeConfig || !runtimeConfig.webrtc) return;

    webRtcRuntimeConfig = {
      ...DEFAULT_WEBRTC_RUNTIME_CONFIG,
      ...runtimeConfig.webrtc
    };
  } catch (error) {
    console.warn("Runtime config unavailable, using defaults", error);
  }
}

function randomId(length) {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
}

function waitForIceGatheringComplete(pc) {
  return new Promise(resolve => {
    if (!pc || pc.iceGatheringState === "complete") {
      resolve();
      return;
    }
    const onStateChange = () => {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener("icegatheringstatechange", onStateChange);
        resolve();
      }
    };
    pc.addEventListener("icegatheringstatechange", onStateChange);
  });
}

function getWebRtcPeerConfig() {
  const runtimeConfig = webRtcRuntimeConfig;
  const config = {
    bundlePolicy: "max-bundle",
    iceServers: [
      { urls: runtimeConfig.stunUrl },
      {
        urls: runtimeConfig.turnUrl,
        username: runtimeConfig.username,
        credential: runtimeConfig.credential
      }
    ]
  };
  if (runtimeConfig.iceTransportPolicy) {
    config.iceTransportPolicy = runtimeConfig.iceTransportPolicy;
  }
  return config;
}

function createDashboardLiveCard(index) {
  const wrapper = document.createElement("div");
  wrapper.className = "card live-card";
  wrapper.innerHTML = `
    <div class="live-stage">
      <video autoplay playsinline muted></video>
      <div class="live-placeholder">
        <strong>Awaiting signal</strong>
        <span>Signaling standby</span>
      </div>
      <div class="live-footer">
        <span class="live-status" data-state="idle">Idle</span>
        <span class="live-meta">Socket disconnected</span>
      </div>
    </div>
  `;
  return wrapper;
}

function updateDashboardSummary() {
  const summary = document.getElementById("live-summary");
  const pill = document.getElementById("connection-pill");
  if (!summary || !pill) return;

  const liveCount = dashboardSessions.filter(session => session.connectionState === "live").length;
  const connectingCount = dashboardSessions.filter(session => session.connectionState === "connecting").length;
  const errorCount = dashboardSessions.filter(session => session.connectionState === "error").length;

  summary.textContent = `${liveCount}/${dashboardSessions.length} live`;
  if (liveCount === dashboardSessions.length && liveCount > 0) {
    summary.className = "chip";
  } else if (errorCount > 0) {
    summary.className = "chip danger";
  } else {
    summary.className = "chip warning";
  }

  pill.innerHTML = `<span class="dot"></span>${liveCount > 0 ? `${liveCount} stream live` : connectingCount > 0 ? "Connecting streams" : "Disconnected"}`;
}

function setDashboardSessionState(session, state, label, meta) {
  session.connectionState = state;
  if (session.statusEl) {
    session.statusEl.dataset.state = state;
    session.statusEl.textContent = label;
  }
  if (session.metaEl && meta) {
    session.metaEl.textContent = meta;
  }
  if (session.placeholderEl) {
    if (state !== "live") {
      session.placeholderEl.querySelector("strong").textContent = label;
      if (meta) {
        session.placeholderEl.querySelector("span").textContent = meta;
      }
    }
    session.placeholderEl.hidden = state === "live";
  }
  updateDashboardSummary();
}

function initDashboardLiveGrid() {
  const liveGrid = document.getElementById("live-grid");
  if (!liveGrid) return;

  destroyDashboardLiveGrid();
  liveGrid.innerHTML = "";

  dashboardSessions = Array.from({ length: DASHBOARD_STREAM_COUNT }, (_, offset) => {
    const index = offset + 1;
    const card = createDashboardLiveCard(index);
    liveGrid.appendChild(card);
    const videoEl = card.querySelector("video");
    const placeholderEl = card.querySelector(".live-placeholder");
    const statusEl = card.querySelector(".live-status");
    const metaEl = card.querySelector(".live-meta");

    const session = {
      index,
      cameraId: DASHBOARD_CAMERA_ID,
      clientId: randomId(WEBRTC_CLIENT_ID_LENGTH),
      card,
      videoEl,
      placeholderEl,
      statusEl,
      metaEl,
      socket: null,
      pc: null,
      reconnectTimer: null,
      stopped: false,
      connectionState: "idle"
    };

    startDashboardStream(session);
    return session;
  });

  updateDashboardSummary();
}

function startDashboardStream(session) {
  session.stopped = false;
  connectDashboardSocket(session);
}

function connectDashboardSocket(session) {
  const runtimeConfig = webRtcRuntimeConfig;
  clearTimeout(session.reconnectTimer);
  setDashboardSessionState(session, "connecting", "Connecting", `WS ${runtimeConfig.host}:${runtimeConfig.wsPort}`);

  const wsUrl = `ws://${runtimeConfig.host}:${runtimeConfig.wsPort}/${session.clientId}`;
  const socket = new WebSocket(wsUrl);
  session.socket = socket;

  socket.onopen = () => {
    if (session.stopped) return;
    setDashboardSessionState(session, "connecting", "Requesting stream", session.cameraId);
    socket.send(JSON.stringify({
      id: session.cameraId,
      type: "request"
    }));
  };

  socket.onmessage = async event => {
    if (session.stopped || typeof event.data !== "string") return;
    try {
      const message = JSON.parse(event.data);
      if (message.type === "offer") {
        await handleDashboardOffer(session, message);
      }
    } catch (error) {
      setDashboardSessionState(session, "error", "Invalid signal", "Cannot parse signaling payload");
      console.error("WebRTC signaling parse failed", error);
    }
  };

  socket.onerror = () => {
    setDashboardSessionState(session, "error", "Socket error", `WS ${runtimeConfig.host}:${runtimeConfig.wsPort}`);
  };

  socket.onclose = () => {
    closeDashboardPeer(session);
    if (!session.stopped && activePage === "dashboard") {
      setDashboardSessionState(session, "connecting", "Reconnecting", "Socket closed, retrying");
      session.reconnectTimer = setTimeout(() => {
        connectDashboardSocket(session);
      }, 1500);
    }
  };
}

function createDashboardPeerConnection(session) {
  const pc = new RTCPeerConnection(getWebRtcPeerConfig());
  session.pc = pc;

  pc.addEventListener("iceconnectionstatechange", () => {
    const state = pc.iceConnectionState;
    if (state === "connected" || state === "completed") {
      setDashboardSessionState(session, "live", "Live", `ICE ${state}`);
    } else if (state === "failed" || state === "disconnected" || state === "closed") {
      setDashboardSessionState(session, "error", "Connection lost", `ICE ${state}`);
    } else {
      setDashboardSessionState(session, "connecting", "Negotiating", `ICE ${state}`);
    }
  });

  pc.ontrack = event => {
    session.videoEl.srcObject = event.streams[0];
    session.videoEl.play().catch(() => {});
    setDashboardSessionState(session, "live", "Live", `${session.cameraId} · Stream ${session.index}`);
  };

  return pc;
}

async function handleDashboardOffer(session, offer) {
  closeDashboardPeer(session);
  const pc = createDashboardPeerConnection(session);

  await pc.setRemoteDescription(offer);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  await waitForIceGatheringComplete(pc);

  if (!session.socket || session.socket.readyState !== WebSocket.OPEN) {
    return;
  }

  session.socket.send(JSON.stringify({
    id: session.cameraId,
    type: pc.localDescription.type,
    sdp: pc.localDescription.sdp
  }));
}

function closeDashboardPeer(session) {
  if (!session.pc) return;
  session.pc.getTransceivers().forEach(transceiver => {
    if (transceiver.stop) transceiver.stop();
  });
  session.pc.getSenders().forEach(sender => {
    if (sender.track) sender.track.stop();
  });
  session.pc.close();
  session.pc = null;
  if (session.videoEl) {
    session.videoEl.srcObject = null;
  }
}

function stopDashboardStream(session) {
  session.stopped = true;
  clearTimeout(session.reconnectTimer);
  closeDashboardPeer(session);
  if (session.socket) {
    const socket = session.socket;
    session.socket = null;
    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;
    socket.close();
  }
  setDashboardSessionState(session, "idle", "Stopped", "Session closed");
}

function destroyDashboardLiveGrid() {
  dashboardSessions.forEach(stopDashboardStream);
  dashboardSessions = [];
}

function addCamera(formData, form) {
  const payload = Object.fromEntries(formData.entries());
  if (!payload.name || !payload.snapshot) {
    showToast("Name and snapshot URL are required");
    return;
  }
  const cameras = getCameras();
  cameras.push(payload);
  saveCameras(cameras);
  renderCameras();
  if (form) form.reset();
  showToast("Camera added");
}

function resetCameras() {
  saveCameras([...MOCK.cameras]);
  renderCameras();
  showToast("Camera list reset");
}

function refreshThumbs() {
  if (activePage === "dashboard" && dashboardSessions.length > 0) {
    initDashboardLiveGrid();
    showToast("Live streams reconnecting");
    return;
  }
  document.querySelectorAll(".cam-thumb img").forEach(img => {
    const base = img.dataset.src || img.src;
    img.src = cacheBust(base);
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

function setAuthState(isAuthed) {
  if (!authScreen || !appShell) return;
  authScreen.classList.toggle("hidden", isAuthed);
  appShell.classList.toggle("is-locked", !isAuthed);
}

function login(formData) {
  const payload = Object.fromEntries(formData.entries());
  if (USE_MOCK) {
    if (payload.username === "admin" && payload.password === "admin") {
      localStorage.setItem(AUTH_KEY, "mock-token");
      setAuthState(true);
      loadPage("dashboard");
      showToast("Login successful");
    } else {
      showToast("Invalid credentials");
    }
    return;
  }
  apiPost(ENDPOINTS.login, payload).then(() => {
    localStorage.setItem(AUTH_KEY, "token");
    setAuthState(true);
    loadPage("dashboard");
    showToast("Login successful");
  });
}

function logout() {
  localStorage.removeItem(AUTH_KEY);
  setAuthState(false);
  if (!USE_MOCK) {
    fetch(ENDPOINTS.logout, { method: "POST" });
  }
}

function initAuth() {
  const form = document.getElementById("login-form");
  if (form) {
    form.addEventListener("submit", event => {
      event.preventDefault();
      login(new FormData(form));
    });
  }

  if (USE_MOCK) {
    localStorage.setItem(AUTH_KEY, "mock-token");
  }
  const authed = Boolean(localStorage.getItem(AUTH_KEY));
  setAuthState(authed);
  if (authed) {
    loadPage("dashboard");
  }
}

async function bootstrapApp() {
  await loadRuntimeConfig();
  initAuth();
}

bootstrapApp();
