import b4a from "b4a";
import crypto from "hypercore-crypto";
import Hyperswarm from "hyperswarm";
import { createSocket } from "./socket.js";

const swarm = new Hyperswarm();
Pear.teardown(() => swarm.destroy());

const topicKey = Pear.config.args[0];

const peers = [];
swarm.on("connection", (peer) => {
  const name = b4a.toString(peer.remotePublicKey, "hex");
  console.log(`✅ ${name} connected to the swarm`);
  peers.push(peer);
  peer.once("close", () => peers.splice(peers.indexOf(peer), 1));
  // peer.on("data", (data) => console.log(`${name}: ${data}`));
  peer.on("error", (e) => console.log(`Connection error: ${e}`));
});

// Join a common topic
const topic = topicKey ? b4a.from(topicKey, "hex") : crypto.randomBytes(32);
const discovery = swarm.join(topic, { client: true, server: true });

// The flushed promise will resolve when the topic has been fully announced to the DHT
discovery.flushed().then(() => {
  console.log("joined topic:", b4a.toString(topic, "hex"));
});

const socketPath = Pear.config.args[1];

createSocket(socketPath, (socketConn) => {
  let buffer = "";

  // Proxy from holepunch to the socket
  for (const peer of peers) {
    peer.on("data", (data) => {
      socketConn.write(data);
      socketConn.write("\n");
    });
  }

  socketConn.on("data", (chunk) => {
    buffer += chunk;

    const requests = buffer.split("\n");
    // Keep last incomplete chunk
    buffer = requests[requests.length - 1];

    // Process complete requests
    for (let i = 0; i < requests.length - 1; i++) {
      const data = requests[i];
      if (!data) continue;
      for (const peer of peers) {
        peer.write(data);
      }
    }
  });

  socketConn.on("error", (err) => {
    console.error("Unix socket connection error:", err);
  });
});
