import { ClientState } from "./network/dto/client-state.enum";
import { SPlayerInfo } from "./network/dto/s-player-info.dto";
import { WebSock } from "./network/websock";

export class PlayerList {
	constructor() {
		WebSock.onPlayerConnected.add(this.handlePlayerConnected.bind(this));
		WebSock.onPlayerDisconnected.add(this.handlePlayerDisconnected.bind(this));
		WebSock.onPlayerListReceived.add(this.handlePlayerList.bind(this));
		WebSock.onPlayerStateChanged.add(this.handlePlayerStateChanged.bind(this));
	}

	getPlayers(): SPlayerInfo[] {
		return this.playerList.map((o) => ({ ...o }));
	}

	// ----------------- PRIVATE AREA --------------------------- //
	readonly playerList: SPlayerInfo[] = [];

	private playerIndex(name: string): number {
		return this.playerList.findIndex((e) => e.name === name);
	}

	private handlePlayerConnected(data: { name: string }): void {
		this.playerList.push(<SPlayerInfo>{
			name: data.name,
			state: ClientState.LOBBY,
		});
	}

	private handlePlayerDisconnected(data: { name: string }): void {
		this.playerList.splice(this.playerIndex(data.name), 1);
	}

	private handlePlayerList(list: SPlayerInfo[]): void {
		this.playerList.splice(0);
		this.playerList.push(...list);
	}

	private handlePlayerStateChanged(data: SPlayerInfo): void {
		this.playerList[this.playerIndex(data.name)].state = data.state;
	}
}
