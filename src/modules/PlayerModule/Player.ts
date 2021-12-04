import EventEmitter from "events";
import { BaseGuildVoiceChannel } from "discord.js";
import { VoiceConnection, DiscordGatewayAdapterCreator, NoSubscriberBehavior, StreamType } from "@discordjs/voice";
import * as Voice from "@discordjs/voice";
import youtubedl, { YtResponse } from "youtube-dl-exec";
import { Config } from "~/Config";
import { Cache } from "~/utils/Cache";

export type SongResponse = YtResponse | { _type: "playlist"; entries: YtResponse[] };

export class Player extends EventEmitter {
  private readonly player = Voice.createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });
  private connection?: VoiceConnection;
  private fetchPromise: Promise<any> = Promise.resolve();
  private timeout?: NodeJS.Timeout;
  readonly queue: Readonly<YtResponse>[] = [];
  loop = false;
  destroyed = false;
  timedout = false;
  currentSong?: YtResponse;

  constructor(private readonly config: Config, private readonly cache: Cache<Promise<SongResponse>>) {
    super();

    this.player.on("error", console.error);
    this.player.on("stateChange", (oldState, state) => {
      if (oldState === state) return;

      if (state.status !== "idle") {
        this.clearTimeout();
      }

      if (state.status === "idle") {
        if (this.destroyed) {
          return this.connection?.destroy();
        }

        if (this.loop && this.currentSong) this.queue.push(this.currentSong);
        this.currentSong = undefined;

        if (!this.startQueue()) this.startTimeout();
      } else if (state.status === "playing") {
        this.emit("playing", this.currentSong);
      } else if (state.status === "paused") {
        this.startTimeout();
      }
    });
  }

  get paused() {
    return this.player.state.status === "paused";
  }

  get connected() {
    return !!this.connection;
  }

  startTimeout() {
    if (this.destroyed) return;
    if (this.timeout) return;
    this.timeout = setTimeout(() => {
      this.emit("timout");
      this.timedout = true;
      this.destroy();
    }, this.config.player.timeout).unref();
  }

  clearTimeout() {
    if (!this.timeout) return;
    clearTimeout(this.timeout);
    this.timeout = undefined;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.emit("destroyed");

    this.clearTimeout();
    this.player.stop();
    // Destroying continues in onStateChange to idle
  }

  private startQueue() {
    if (this.destroyed || this.player.state.status !== "idle") return false;

    const song = (this.currentSong = this.queue.shift());
    if (!song) return false;

    const resource = Voice.createAudioResource(song.url, { inputType: StreamType.OggOpus });
    this.player.play(resource);
    return true;
  }

  skip() {
    return this.player.stop();
  }

  pause() {
    if (this.paused) throw "Player is already paused";
    this.player.pause(true);
  }

  resume() {
    if (!this.paused) throw "Player wasn't paused";
    this.player.unpause();
  }

  join(voice: BaseGuildVoiceChannel) {
    if (this.destroyed) return;
    this.connection?.destroy();

    this.connection = Voice.joinVoiceChannel({
      channelId: voice.id,
      guildId: voice.guildId,
      adapterCreator: voice.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator,
    });
    this.connection.subscribe(this.player);
  }

  leave() {
    if (this.destroyed) return;
    this.connection?.destroy();
    this.connection = undefined;
  }

  async add(query: string) {
    if (this.destroyed) return;
    if (this.queue.length >= this.config.player.maxQueueLength) throw new Error("The queue is full");

    if (!query.startsWith("http")) {
      query = "ytsearch:" + query;
    }

    const song = await (this.fetchPromise = this.fetchPromise
      .then(() => {
        let promise = this.cache.get(query);
        if (!promise) {
          promise = youtubedl(query, {
            dumpSingleJson: true,
            extractAudio: true,
            audioFormat: "opus",
            noCheckCertificate: true,
            noWarnings: true,
            markWatched: false,
            geoBypass: true,
            cookies: "./.player-cookies.txt",
          }) as Promise<SongResponse>;
          this.cache.set(query, promise);
        }
        return promise;
      })
      .catch((err) => {
        console.error("Failed to load song", err);
        throw "Failed to load song";
      }));

    if (this.destroyed) return;
    if ("_type" in song) {
      song.entries.forEach((entry) => this.addSong(entry));
    } else {
      this.addSong(song);
    }
    setImmediate(() => this.startQueue());

    return song;
  }

  private addSong(entry: YtResponse) {
    if (entry && "url" in entry) this.queue.push(entry);
  }
}
