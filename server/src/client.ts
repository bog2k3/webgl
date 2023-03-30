import { Socket } from "socket.io";

export enum ClientState {
	LOBBY = "lobby",
	SPECTATE = "spectate",
	PLAY = "play",
}

export class Client {
	id: string;
	state = ClientState.LOBBY;

	constructor(public socket: Socket, public name: string) {
		this.id = socket.id;
	}
}
