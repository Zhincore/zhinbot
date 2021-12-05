import { TextChannel, Snowflake, MessageEmbed } from "discord.js";
import moment from "moment";
import { BotModule } from "@core/decorators";
import { Bot } from "@core/Bot";
import { Cache } from "~/utils/Cache";
import { PrismaService } from "~/services/PrismaService";
import { Config } from "~/Config";
import { Player, YTQueryResponse } from "./Player";
import { PlayerModuleDiscordAdapter, getPlayerControls } from "./PlayerModule.discord";

@BotModule({ discordAdapters: [PlayerModuleDiscordAdapter] })
export class PlayerModule {
  private readonly songCache = new Cache<Promise<YTQueryResponse>>(16_000, 64);
  private readonly players = new Map<string, { player: Player; updateChannel: TextChannel }>();

  constructor(private readonly bot: Bot, private readonly prisma: PrismaService, private readonly config: Config) {}

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

        this.players.set(guildId, (entry = { player, updateChannel }));
      } else {
        throw "The player is not currently playing";
      }
    }

    return entry;
  }

  private async getUpdateChannel(channelId: Snowflake) {
    const channel = await this.bot.fetchChannel<TextChannel>(channelId);
    if (channel?.isText()) return channel;
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

      const embed = new MessageEmbed()
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

      const embed = new MessageEmbed().setTitle("Reached end of the music queue").setColor("#00afff");
      item.updateChannel.send({ embeds: [embed] }).catch(console.error);
    };
  }

  private getSongHandler(guildId: Snowflake) {
    return () => {
      const item = this.players.get(guildId);
      if (!item) return;
      const song = item.player.currentSong;
      if (!song) return;

      let description = song.description ?? "*No description*";
      if (description.length > 256) description = description.slice(0, 256 - 3) + "...";

      let upload_date;
      if (song.upload_date) {
        const d = song.upload_date;
        upload_date = `${d.slice(-2)}. ${d.slice(-4, -2)}. ${d.slice(0, 4)}`;
      }

      const embed = new MessageEmbed()
        .setColor("#00afff")
        .setTitle(song.title)
        .setDescription(description)
        .setURL(song.webpage_url || song.url)
        .setFooter(
          [
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
        );

      if (song.thumbnail) embed.setThumbnail(song.thumbnail);
      if (song.uploader) embed.setAuthor(song.uploader, undefined, song.uploader_url);

      item.updateChannel.send({
        embeds: [embed],
        content: "**Now playing:**",
        components: [getPlayerControls("queue")],
      });
    };
  }

  async getVoice(guildId: Snowflake, authorId: Snowflake) {
    const guild = this.bot.guilds.resolve(guildId);
    const member = await guild!.members.fetch(authorId);
    return member.voice.channel;
  }

  async play(guildId: Snowflake, textChannelId: Snowflake, authorId: Snowflake, query?: string) {
    const { player } = await this.getGuild(guildId, textChannelId, true);

    if (!player.connected) {
      const voice = await this.getVoice(guildId, authorId);
      if (!voice) throw "Connect to a voice channel";
      player.join(voice);
    }

    if (player.paused) player.resume();
    if (query) {
      return player.add(query);
    }
  }

  async getPlayer(guildId: Snowflake, textChannelId: Snowflake) {
    const { player } = await this.getGuild(guildId, textChannelId);
    return player;
  }
}

function getDurationString(length: number, float = false) {
  const hours = Math.trunc(length / 3600);
  const minutes = Math.trunc((length - hours * 3600) / 60);
  const seconds = length - minutes * 60 - hours * 3600;

  return [minutes && hours, minutes || "00", float ? seconds : Math.round(seconds)]
    .filter((v) => v)
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
}
