// const { Server } = require("socket.io");
import { Server } from "socket.io";
import express from "express";
import http from "http";
import cors from "cors";

(function main(): void {
	const app = express();
	app.use(cors({ origin: "*" }));
	const server = http.createServer(app);
	const socketIo = new Server(server, {
		allowEIO3: true,
	});
	socketIo.on("connection", (socket) => {
		console.log("socket connected:", socket);
	});
	socketIo.on("hello", () => {
		console.log("received hello");
	});

	const fileOptions = {
		root: __dirname + "/../..",
	};

	const allowedFiles = ["/favicon.ico", "/index.html"];

	app.get("/dist/*", (req, res) => {
		res.sendFile(req.url, fileOptions);
	});

	app.get("/data/*", (req, res) => {
		res.sendFile(req.url, fileOptions);
	});

	app.get("/", (req, res) => {
		res.sendFile("index.html", fileOptions);
	});

	app.get("*", (req, res) => {
		if (allowedFiles.includes(req.url)) {
			res.sendFile(req.url, fileOptions);
		} else {
			res.status(403).send("Not allowed.");
		}
	});

	server.listen(3000, () => {
		console.log("Listening on HTTP *:3000");
	});
})();
