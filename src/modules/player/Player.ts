import EventEmitter from "events";
import { spawn } from "child_process";
import { PassThrough } from "stream";
import ms from "ms";
import { BaseGuildVoiceChannel } from "discord.js";
import { VoiceConnection, DiscordGatewayAdapterCreator, NoSubscriberBehavior } from "@discordjs/voice";
import * as Voice from "@discordjs/voice";
import YTDLP from "yt-dlp-wrap";
import { Logger } from "winston";
import { Cache } from "~/utils/Cache";
import { Config } from "~/Config";
import { YtResponse } from "./YTDLP.types";

const SONG_DELAY = ms("5s");
const YTDLP_OPTS = [
  ["--format", "bestaudio/best"],
  ["--audio-format", "opus"],
  "--geo-bypass",
  ["--cookies", "./.player-cookies.txt"],
].flat();

export type { YtResponse };
export type YTQueryResponse = (YtResponse & { _type?: "video" }) | { _type: "playlist"; entries: YtResponse[] };

export class Player extends EventEmitter {
  private readonly ytdlp = new YTDLP();
  readonly player = Voice.createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });
  private connection?: VoiceConnection;
  private fetchPromise: Promise<YTQueryResponse | string> = Promise.resolve("");
  private timeout?: NodeJS.Timeout;
  private lastSongTimestamp = 0;
  private preloadedResource?: Voice.AudioResource<YtResponse>;
  readonly queue: Readonly<YtResponse>[] = [];
  currentSong?: YtResponse;
  destroyed = false;
  loop = false;
  alone = false;

  constructor(
    private readonly config: Config,
    private readonly cache: Cache<Promise<YTQueryResponse>>,
    private readonly logger: Logger,
  ) {
    super();

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
    if (alone) {
      // If alone in VC and idle, leave; if playing then start timeout
      if (this.player.state.status === "idle") this.destroy();
      else this.startTimeout();
    }
    // If not alone anymore, cancel timeout if needed
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
    }, this.config.modules.player.timeout).unref();
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
    // TODO: file enede prematurely
    const ffmpeg = spawn(
      "ffmpeg",
      [
        "-hide_banner",
        ["-loglevel", "error"],
        "-re",
        ["-i", song.url],
        ["-f", "opus"],
        "-vn",
        ["-map", "0:a"],
        "-",
      ].flat(),
    );
    ffmpeg.stderr.on("data", (d) => this.logger.debug("[FFMPEG] " + d));
    const stream = new PassThrough();
    ffmpeg.stdout.pipe(stream);

    return Voice.createAudioResource<YtResponse>(stream, {
      inputType: Voice.StreamType.OggOpus,
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
    if (this.queue.length >= this.config.modules.player.maxQueueLength) throw new Error("The queue is full");

    if (!query.startsWith("http")) {
      query = "ytsearch:" + query;
    }

    this.fetchPromise = this.fetchPromise
      .then(() => {
        let promise = this.cache.get(query);
        if (!promise) {
          promise = this.ytdlp
            .getVideoInfo(["--dump-single-json", ...YTDLP_OPTS, query].flat())
            .then((r: YTQueryResponse | YTQueryResponse[]) => {
              return Array.isArray(r) ? r[0] : r;
            });
          this.cache.set(query, promise);
        }
        return promise;
      })
      .catch((err) => {
        this.logger.debug(err);
        return "Failed to load song";
      });
    const song = await this.fetchPromise;

    if (this.destroyed) return;
    if (typeof song == "string") throw song;
    if ("_type" in song && song._type == "playlist") {
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
