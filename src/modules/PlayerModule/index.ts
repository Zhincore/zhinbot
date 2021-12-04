import { TextChannel, Snowflake, MessageEmbed } from "discord.js";
import { BotModule } from "@core/decorators";
import { Bot } from "@core/Bot";
import { Cache } from "~/utils/Cache";
import { PrismaService } from "~/services/PrismaService";
import { Config } from "~/Config";
import { Player, SongResponse } from "./Player";
import { PlayerModuleDiscordAdapter, getPlayerControls } from "./PlayerModule.discord";

@BotModule({ discordAdapters: [PlayerModuleDiscordAdapter] })
export class PlayerModule {
  private readonly songCache = new Cache<Promise<SongResponse>>(16_000, 64);
  private readonly players = new Map<string, { player: Player; updateChannel: TextChannel }>();

  constructor(private readonly bot: Bot, private readonly prisma: PrismaService, private readonly config: Config) {}

  private async getGuild(guildId: Snowflake, updateChannelId?: Snowflake, create = false) {
    let entry = this.players.get(guildId);
    if (!entry) {
      if (create) {
        let updateChannel: TextChannel | null = null;

        const guildData = await this.prisma.guild.findUnique({ where: { id: guildId } });
        if (guildData && guildData.playerUpdatesChannel) {
          updateChannel = await this.getUpdateChannel(guildData.playerUpdatesChannel);
        }

        if (!updateChannel && updateChannelId) updateChannel = await this.getUpdateChannel(updateChannelId);
        if (!updateChannel) throw "Failed to get update channel";

        const player = new Player(this.config, this.songCache)
          .on("destroyed", this.getDestroyHandler(guildId))
          .on("timeout", this.getTimeoutHandler(guildId))
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

  private getSongHandler(guildId: Snowflake) {
    return () => {
      const item = this.players.get(guildId);
      if (!item) return;
      const song = item.player.currentSong;
      if (!song) return;

      let description = song.description ?? "*No description*";
      if (description.length > 256) description = description.slice(0, 256 - 3) + "...";

      const embed = new MessageEmbed()
        .setColor("#00afff")
        .setTitle(song.title)
        .setDescription(description)
        .setURL(song.webpage_url || song.url);

      if (song.thumbnail) embed.setThumbnail(song.thumbnail);
      if (song.uploader) embed.setAuthor(song.uploader, undefined, song.uploader_url);

      item.updateChannel.send({ embeds: [embed], content: "**Now playing:**", components: [getPlayerControls(true)] });
    };
  }

  async changeUpdateChannel(guildId: Snowflake, channelId: Snowflake) {
    const channel = await this.getUpdateChannel(channelId);
    if (!channel) throw "Failed to get update channel";

    try {
      const entry = await this.getGuild(guildId, channelId);
      entry.updateChannel = channel;
    } catch (err) {
      if (err === "The player is not currently playing") return;
      throw err;
    }

    await this.prisma.guild.update({ where: { id: guildId }, data: { playerUpdatesChannel: channelId } });
    return true;
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
