const { Server } = require("socket.io");
const express = require("express");
const http = require("http");
const cors = require("cors");

(function main(): void {
	const app = express();
	app.use(cors({ origin: "*" }));
	const server = http.createServer(app);
	const socketIo = new Server(server);
	socketIo.on("connection", (socket) => {
		console.log("socket connected:", socket);
	});

	const fileOptions = {
		root: __dirname + "/../..",
	};

	app.get("/dist/*", (req, res) => {
		res.sendFile(req.url, fileOptions);
	});

	app.get("/data/*", (req, res) => {
		res.sendFile(req.url, fileOptions);
	});

	app.get("/", (req, res) => {
		res.sendFile("index.html", fileOptions);
	});

	server.listen(3000, () => {
		console.log("Listening on HTTP *:3000");
	});
})();
