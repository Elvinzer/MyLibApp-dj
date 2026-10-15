import { createServer } from "node:net";
export function freePort(preferred = 0) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", (error) => {
      if (preferred && error.code === "EADDRINUSE")
        freePort(0).then(resolve, reject);
      else reject(error);
    });
    server.listen(preferred, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}
