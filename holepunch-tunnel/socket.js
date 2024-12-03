import net from "bare-net"; // For Unix socket support

export function createSocket(path, onConnection) {
  try {
    fs.rmSync(path, {
      force: true,
    });
    console.log("Deleting");
  } catch {
    // console.error("Socket not found");
  }

  console.log("Creating socket next2unix");

  try {
    const unixServer = net.createServer(onConnection);

    unixServer.listen(path);
    console.log(`Unix socket listening on ${path}`);
  } catch (err) {
    console.error("Failed to create Unix socket:", err);
  }
}
