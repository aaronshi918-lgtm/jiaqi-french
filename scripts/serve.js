const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const file = path.join(__dirname, "../dist/jiaqi_french.html");
http
  .createServer((req, res) => {
    if (!["/", "/jiaqi_french.html"].includes(req.url)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    fs.createReadStream(file).pipe(res);
  })
  .listen(4173, "127.0.0.1");
