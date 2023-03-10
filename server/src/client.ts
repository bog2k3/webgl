import { Socket } from "socket.io";

export class Client {
	id: string;

	constructor(public socket: Socket, public name: string) {
		this.id = socket.id;
	}
}
