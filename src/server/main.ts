const { Server } = require("socket.io");
const express = require("express");
const http = require("http");

(function main(): void {
	const app = express();
	const server = http.createServer(app);
	const socketIo = new Server(server);
	socketIo.on("connection", (socket) => {
		console.log("socket connected:", socket);
	});

	app.get("/", (req, res) => {
		res.sendFile(__dirname + "../../index.html");
	});

	server.listen(3000, () => {
		console.log("Listening on HTTP *:3000");
	});
})();
