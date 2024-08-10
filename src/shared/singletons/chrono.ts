import { Modding } from "@flamework/core";
import Signal from "@rbxts/rbx-better-signal";
import { RunService } from "@rbxts/services";
import { GetLogger } from "shared/utilities/setup-logger";
import { VoidCallback } from "types/utility";

export class _Chrono {
	public readonly OnChangeGameSpeed = new Signal<(newSpeed: number, oldSpeed: number) => void>();
	private gameSpeed = 1;
	private logger = GetLogger();
	private threads = new Set<thread>();
	private tasks = new Set<VoidCallback>();

	public SetSpeed(val: number) {
		if (val === this.gameSpeed) return;
		val = math.max(val, 0);

		const oldSpeed = this.gameSpeed;
		this.gameSpeed = val;
		this.OnChangeGameSpeed.Fire(val, oldSpeed);
		this.logger.Debug(`Set game speed to ${val}`);
	}

	public Wait(time: number) {
		let passedTime = 0;
		const thread = coroutine.running();
		this.threads.add(thread);

		const connection = RunService.Heartbeat.Connect((dt) => {
			if (coroutine.status(thread) === "dead") {
				connection.Disconnect();
				this.threads.delete(thread);
				return;
			}

			passedTime += dt * this.gameSpeed;
			if (passedTime >= time) {
				connection.Disconnect();
				coroutine.resume(thread, passedTime - time);
				this.threads.delete(thread);
			}
		});

		return coroutine.yield() as unknown as number;
	}

	public Calculate(val: number) {
		return val * this.gameSpeed;
	}

	public Spawn(callback: VoidCallback) {
		const thread = task.spawn(() => {
			callback();
			this.threads.delete(thread);
		});
		this.threads.add(thread);

		return thread;
	}

	private resolveRate(rate: number | (() => number)) {
		return typeIs(rate, "function") ? rate() : rate;
	}

	public LifeCycle(callback: (dt: number) => void, rate: number | (() => number), doFirstCall = true) {
		let passedTime = 0;
		let isBlocked = false;
		let firstCall = true;

		const connection = RunService.Heartbeat.Connect((dt) => {
			if (firstCall && doFirstCall) {
				firstCall = false;
				isBlocked = true;
				callback(dt * this.gameSpeed);
				isBlocked = false;
				return;
			}

			if (isBlocked) return;

			passedTime += dt * this.gameSpeed;
			if (passedTime >= this.resolveRate(rate)) {
				const previousPassedTime = passedTime;

				passedTime = 0;
				isBlocked = true;
				callback(previousPassedTime);
				isBlocked = false;
			}
		});

		const disconnect = () => {
			this.tasks.delete(disconnect);
			connection.Disconnect();
		};
		this.tasks.add(disconnect);

		return disconnect;
	}

	public Clear() {
		for (const thread of this.threads) {
			coroutine.close(thread);
		}
		this.tasks.forEach((disconnect) => {
			disconnect();
		});

		this.tasks.clear();
		this.threads.clear();
		this.logger.Debug("Cleared all threads");
	}

	public Delay(time: number, callback: VoidCallback) {
		let passedTime = 0;

		const connection = RunService.Heartbeat.Connect((dt) => {
			passedTime += dt * this.gameSpeed;
			if (passedTime >= time) {
				callback();
				connection.Disconnect();
			}
		});

		const disconnect = () => {
			this.tasks.delete(disconnect);
			connection.Disconnect();
		};
		this.tasks.add(disconnect);

		return disconnect;
	}
}

const newChrono = new _Chrono();
Modding.registerDependency<Chrono>(() => newChrono);

export type Chrono = _Chrono;
export const Chrono = newChrono;
