import { TextChannel, Snowflake, EmbedBuilder, ChannelType } from "discord.js";
import { Service } from "@core/decorators";
import { Bot } from "@core/Bot";
import { Logger } from "winston";
import { Player, YTQueryResponse, YtResponse } from "./Player";
import { getPlayerControls } from "./PlayerDiscordAdapter";
import { Cache } from "~/utils/Cache";
import { PrismaService } from "~/services/PrismaService";
import { Config } from "~/Config";
import { getDurationString } from "~/utils";

@Service()
export class PlayerService {
  private readonly songCache = new Cache<Promise<YTQueryResponse>>(16_000, 64);
  private readonly players = new Map<string, { player: Player; updateChannel: TextChannel }>();
  private readonly playerLogger: Logger;

  constructor(private readonly bot: Bot, private readonly prisma: PrismaService, private readonly config: Config) {
    this.playerLogger = bot.getLogger("Player");
    bot.on("voiceStateUpdate", (oldState, newState) => {
      if (newState.channelId === oldState.channelId) return;

      const item = this.players.get(oldState.guild.id);
      if (!item) return;

      const { player } = item;
      if (newState.channelId === player.voiceId) {
        // Member joined
        player.setAlone(false);
      } else if (oldState.channelId === player.voiceId && oldState.channel!.members.size === 1) {
        // Member left, Channel emptied
        player.setAlone(true);
      }
    });
  }

  private async getGuild(guildId: Snowflake, updateChannelId?: Snowflake, create = false) {
    let entry = this.players.get(guildId);
    if (!entry) {
      if (create) {
        let updateChannel: TextChannel | null = null;

        const guildData = await this.prisma.guild.findUnique({ where: { id: guildId } });
        if (guildData && guildData.playerChannel) {
          updateChannel = await this.getUpdateChannel(guildData.playerChannel);
        }

        if (!updateChannel && updateChannelId) updateChannel = await this.getUpdateChannel(updateChannelId);
        if (!updateChannel) throw "Failed to get update channel";

        const player = new Player(this.config, this.songCache)
          .on("destroyed", this.getDestroyHandler(guildId))
          .on("timeout", this.getTimeoutHandler(guildId))
          .on("queueEnd", this.getQueueEndHandler(guildId))
          .on("playing", this.getSongHandler(guildId));

        player.player
          .on("error", (err) => {
            this.playerLogger.error(err);
          })
          .on("debug", (msg) => {
            this.playerLogger.debug(msg);
          });

        this.players.set(guildId, (entry = { player, updateChannel }));
      } else {
        throw "The player is not currently playing";
      }
    }

    return entry;
  }

  async getPlayer(guildId: Snowflake, textChannelId: Snowflake, authorId: Snowflake, validate = true) {
    const { player } = await this.getGuild(guildId, textChannelId);

    if (validate) {
      const author = await this.bot.fetchMember(guildId, authorId);
      const authorVoice = author!.voice.channel;
      const playerVoiceId = player.voiceId;

      if (playerVoiceId && !this.bot.isAdmin(author!) && (!authorVoice || playerVoiceId !== authorVoice.id)) {
        throw "You can't control the music if you aren't a listener";
      } else if (!playerVoiceId && authorVoice) {
        player.join(authorVoice);
      }
    }

    return player;
  }

  private async getUpdateChannel(channelId: Snowflake) {
    const channel = await this.bot.fetchChannel<TextChannel>(channelId);
    if (channel?.type === ChannelType.GuildText) return channel;
    return null;
  }

  async changeUpdateChannel(guildId: Snowflake, channelId: Snowflake) {
    const channel = await this.getUpdateChannel(channelId);
    if (!channel) throw "Invalid update channel";

    try {
      const entry = await this.getGuild(guildId, channelId);
      entry.updateChannel = channel;
    } catch (err) {
      if (err === "The player is not currently playing") return;
      throw err;
    }

    await this.prisma.guild.update({ where: { id: guildId }, data: { playerChannel: channelId } });
    return true;
  }

  private getDestroyHandler(guildId: Snowflake) {
    return () => this.players.delete(guildId);
  }

  private getTimeoutHandler(guildId: Snowflake) {
    return () => {
      const item = this.players.get(guildId);
      if (!item) return;

      const embed = new EmbedBuilder()
        .setTitle("Player was left idle for too long")
        .setDescription("Queue deleted and voice channel left")
        .setColor("#00afff");
      item.updateChannel.send({ embeds: [embed] }).catch(console.error);
    };
  }

  private getQueueEndHandler(guildId: Snowflake) {
    return () => {
      const item = this.players.get(guildId);
      if (!item) return;

      const embed = new EmbedBuilder().setTitle("Reached end of the music queue").setColor("#00afff");
      item.updateChannel.send({ embeds: [embed] }).catch(console.error);
    };
  }

  private getSongHandler(guildId: Snowflake) {
    return () => {
      const item = this.players.get(guildId);
      if (!item) return;
      const song = item.player.currentSong;
      if (!song) return;

      item.updateChannel.send({
        embeds: [this.createSongEmbed(song)],
        content: "**Now playing:**",
        components: [getPlayerControls("queue")],
      });
    };
  }

  createSongEmbed(song: YtResponse) {
    // Description will have max. 6 lines and max. 256 chars in total
    let description = (song.description ?? "*No description*").split("\n").slice(0, 6).join("\n");
    if (description.length > 256) description = description.slice(0, 255 - 3) + "...";

    let upload_date;
    if (song.upload_date) {
      const d = song.upload_date;
      upload_date = `${d.slice(-2)}. ${d.slice(-4, -2)}. ${d.slice(0, 4)}`;
    }

    const embed = new EmbedBuilder()
      .setColor("#00afff")
      .setTitle(song.title)
      .setDescription(description)
      .setURL(song.webpage_url || song.url)
      .setFooter({
        text: [
          song.is_live && "🔴 LIVE",
          song.duration && getDurationString(song.duration),
          [
            song.like_count && `👍 ${song.like_count.toLocaleString("en")}`,
            song.dislike_count && `👎 ${song.dislike_count.toLocaleString("en")}`,
          ]
            .filter((v) => v)
            .join("  "),
          song.view_count && `👁️ ${song.view_count.toLocaleString("en")}`,
          upload_date,
          song.extractor_key,
        ]
          .filter((v) => v)
          .join(" ︱ "),
      });

    if (song.thumbnail) embed.setThumbnail(song.thumbnail);
    if (song.uploader) embed.setAuthor({ name: song.uploader, url: song.uploader_url });

    return embed;
  }

  async play(guildId: Snowflake, textChannelId: Snowflake, authorId: Snowflake, query?: string) {
    const { player } = await this.getGuild(guildId, textChannelId, true);

    if (!player.connected) {
      const voice = await this.getUserVoice(guildId, authorId);
      if (!voice) throw "Connect to a voice channel";
      player.join(voice);
    }

    if (query) {
      if (player.paused) player.resume();
      return player.add(query);
    }
  }

  async getUserVoice(guildId: Snowflake, userId: Snowflake) {
    const member = await this.bot.fetchMember(guildId, userId);
    return member!.voice.channel;
  }
}
