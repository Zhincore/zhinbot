import EventEmitter from "events";
import ms from "ms";
import { BaseGuildVoiceChannel } from "discord.js";
import { VoiceConnection, DiscordGatewayAdapterCreator, NoSubscriberBehavior } from "@discordjs/voice";
import * as Voice from "@discordjs/voice";
import youtubedl, { YtResponse } from "youtube-dl-exec";
import { Config } from "~/Config";
import { Cache } from "~/utils/Cache";

const SONG_DELAY = ms("5s");

export type { YtResponse };
export type YTQueryResponse = YtResponse | { _type: "playlist"; entries: YtResponse[] };

export class Player extends EventEmitter {
  private readonly player = Voice.createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });
  private connection?: VoiceConnection;
  private fetchPromise: Promise<any> = Promise.resolve();
  private timeout?: NodeJS.Timeout;
  private lastSongTimestamp = 0;
  private preloadedResource?: Voice.AudioResource<YtResponse>;
  readonly queue: Readonly<YtResponse>[] = [];
  currentSong?: YtResponse;
  destroyed = false;
  loop = false;
  alone = false;

  constructor(private readonly config: Config, private readonly cache: Cache<Promise<YTQueryResponse>>) {
    super();

    this.player.on("error", console.error);
    this.player.on("stateChange", (oldState, state) => {
      if (oldState === state) return;

      this.cancelTimeoutIfInactive();

      if (state.status === "idle") {
        if (this.loop && this.currentSong) this.queue.push(this.currentSong);
        this.currentSong = undefined;

        this.playNext();
      } else if (state.status === "playing") {
        this.emit("playing", this.currentSong);
      } else if (state.status === "paused" || state.status === "autopaused") {
        this.startTimeout();
      }
    });
  }

  get voiceId() {
    return this.connection?.joinConfig.channelId;
  }

  get paused() {
    return this.player.state.status === "paused";
  }

  get connected() {
    return !!this.connection;
  }

  private playNext() {
    if (this.destroyed || this.player.state.status !== "idle") return;
    const _playNext = () => {
      const started = this.playNextResource();
      // If no song available start the timeout
      if (!started) {
        this.startTimeout();
        this.emit("queueEnd");
      }
      // elseway a new song is playing and we save current timestamp
      else this.lastSongTimestamp = Date.now();
      return started;
    };

    // Prevent playing a new song sooner than SONG_DELAY after starting the previous
    const delta = Date.now() - this.lastSongTimestamp;
    if (delta < SONG_DELAY) return setTimeout(_playNext, SONG_DELAY - delta);
    return _playNext();
  }

  setAlone(alone: boolean) {
    this.alone = alone;
    if (alone) this.startTimeout();
    else this.cancelTimeoutIfInactive();
  }

  private cancelTimeoutIfInactive() {
    const { status } = this.player.state;

    if (!this.alone && !["idle", "paused", "autopaused"].includes(status)) {
      this.clearTimeout();
    }
  }

  private startTimeout() {
    if (this.destroyed || this.timeout) return;

    this.timeout = setTimeout(() => {
      this.emit("timeout");
      this.destroy();
    }, this.config.player.timeout).unref();
  }

  private clearTimeout() {
    if (!this.timeout) return;

    clearTimeout(this.timeout);
    this.timeout = undefined;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.emit("destroyed");

    this.clearTimeout();
    this.player.stop(true);
    this.connection?.destroy();
  }

  private playNextResource() {
    if (this.destroyed || this.player.state.status !== "idle") return false;

    const song = (this.currentSong = this.queue.shift());
    if (!song) return false;

    const resource = this.loadSong(song);
    this.player.play(resource);

    this.preloadNextSong();

    return true;
  }

  private preloadNextSong() {
    // Get next song in queue or the current one if queue is empty and looping is on
    const nextSong = this.queue[0] ?? this.loop ? this.currentSong : undefined;
    // Preload next song if it exists
    if (nextSong) {
      this.preloadedResource = this.loadSong(nextSong);
    } else {
      this.preloadedResource = undefined;
    }
  }

  private loadSong(song: YtResponse) {
    if (this.preloadedResource && !this.preloadedResource.ended && this.preloadedResource.metadata.url === song.url) {
      // Use preloaded resource if suitable
      return this.preloadedResource;
    }
    // Otherwise load a new one
    return Voice.createAudioResource<YtResponse>(song.url, {
      inputType: Voice.StreamType.WebmOpus,
      metadata: song,
    });
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
          }) as Promise<YTQueryResponse>;
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
    setImmediate(() => this.playNext());

    return song;
  }

  private addSong(song: YtResponse) {
    if (!song || !("url" in song) || !song.url || song.acodec === "none") return;

    const wasEmpty = !this.queue.length;
    this.queue.push(song);
    if (wasEmpty) this.preloadNextSong();
  }
}
