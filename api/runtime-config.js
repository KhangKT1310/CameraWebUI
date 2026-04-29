module.exports = function handler(_req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.status(200).json({
    webrtc: {
      host: process.env.WEBRTC_SERVER_HOST || "webrtc.vigorlabs.org",
      wsPort: Number(process.env.WEBRTC_WS_PORT || 23000),
      stunUrl: process.env.WEBRTC_STUN_URL || "stun:webrtc.vigorlabs.org:23001",
      turnUrl: process.env.WEBRTC_TURN_URL || "turn:webrtc.vigorlabs.org:23001?transport=udp",
      username: process.env.WEBRTC_TURN_USERNAME || "myuser",
      credential: process.env.WEBRTC_TURN_CREDENTIAL || "mypassword",
      iceTransportPolicy: process.env.WEBRTC_ICE_TRANSPORT_POLICY || "relay"
    }
  });
};
