import { CommandInteraction, ButtonInteraction, MessageEmbed, MessageActionRow, MessageButton } from "discord.js";
import { DiscordAdapter, DiscordCommand, DiscordHandler } from "@core/decorators";
import { getDurationString } from "~/utils";
import { PlayerService } from "./PlayerService";

const QUEUE_PAGE_ID = "player.queue";
const CONTROL_ID = "player";

@DiscordAdapter()
export class PlayerDiscordAdapter {
  constructor(private readonly service: PlayerService) {}

  private getPlayer(interaction: CommandInteraction<"present"> | ButtonInteraction<"present">, validate = true) {
    return this.service.getPlayer(interaction.guildId, interaction.channelId, interaction.user.id, validate);
  }

  @DiscordCommand({
    description: "Play music in your voice chat",
    options: [
      {
        name: "query",
        type: "STRING",
        description: "URL or name of the song to play",
      },
    ],
  })
  async play(interaction: CommandInteraction<"present">) {
    await interaction.deferReply();

    const query = interaction.options.getString("query", false);
    const result = await this.service.play(
      interaction.guildId,
      interaction.channelId,
      interaction.user.id,
      query || undefined,
    );

    if (result) {
      const playlist = "entries" in result ? result.entries : [result];
      const songs = playlist.length === 1 ? `\`${playlist[0].title}\`` : playlist.length + " song(s)";
      return interaction.editReply(`Added ${songs} to queue`);
    }
    return interaction.editReply("Playing");
  }

  @DiscordCommand({
    description: "Change the channel where the players sends currently playing songs",
    defaultPermission: false,
    options: [{ name: "channel", type: "CHANNEL", description: "The channel for updates" }],
  })
  async playerchannel(interaction: CommandInteraction<"present">) {
    const channel = interaction.options.getChannel("channel", false);
    await this.service.changeUpdateChannel(interaction.guildId, channel?.id ?? interaction.channelId);
    return interaction.reply({ content: "Player channel updated", ephemeral: true });
  }

  @DiscordCommand({ description: "Show the currently playing song" })
  async playing(interaction: CommandInteraction<"present">) {
    const player = await this.getPlayer(interaction);

    if (!player.currentSong) throw "Nothing is currently playing";

    return interaction.reply({
      embeds: [this.service.createSongEmbed(player.currentSong)],
      components: [getPlayerControls("queue")],
    });
  }

  @DiscordCommand({ description: "Pause the music player" })
  async pause(interaction: CommandInteraction<"present">) {
    const player = await this.getPlayer(interaction);
    player.pause();
    return interaction.reply("Player paused");
  }

  @DiscordCommand({ description: "Resume paused music player" })
  async resume(interaction: CommandInteraction<"present">) {
    const player = await this.getPlayer(interaction);
    player.resume();
    return interaction.reply("Player resumed");
  }

  @DiscordCommand({ description: "Stop playing, leave the voice channel and forget the queue" })
  async stop(interaction: CommandInteraction<"present">) {
    const player = await this.getPlayer(interaction);
    player.destroy();
    return interaction.reply("Player stopped");
  }

  @DiscordCommand({ description: "Skip currently playing song" })
  async skip(interaction: CommandInteraction<"present">) {
    const player = await this.getPlayer(interaction);
    return interaction.reply(player.skip() ? "Current song skipped" : "Failed to skip song");
  }

  @DiscordCommand({
    description: "Remove a song from queue at specified position",
    options: [
      {
        name: "position",
        type: "INTEGER",
        required: true,
        description: "The position of the song in the queue",
      },
    ],
  })
  async remove(interaction: CommandInteraction<"present">) {
    const position = Math.min(1, interaction.options.getInteger("position", true));
    const player = await this.getPlayer(interaction);
    const [song] = player.queue.splice(position - 1, 1);
    return interaction.reply(song ? "Song removed" : `No song at position ${position}`);
  }

  @DiscordCommand({ description: "Join a voice channel" })
  async join(interaction: CommandInteraction<"present">) {
    const voice = await this.service.getUserVoice(interaction.guildId, interaction.user.id);
    if (!voice) throw "You are not in a voice channel";

    const player = await this.getPlayer(interaction, false);
    player.join(voice);

    return interaction.reply("Joining voice channel");
  }

  @DiscordCommand({ description: "Leave the current voice chat (remembers the queue for a while)" })
  async leave(interaction: CommandInteraction<"present">) {
    const player = await this.getPlayer(interaction);
    player.leave();
    return interaction.reply("Voice channel left");
  }

  @DiscordCommand({
    description: "Toggle looping of the current player queue",
    options: [{ name: "loop", type: "BOOLEAN", description: "Whether the queue should loop" }],
  })
  async loop(interaction: CommandInteraction<"present">) {
    const player = await this.getPlayer(interaction);
    const state = interaction.options.getBoolean("loop", false);
    player.loop = state ?? !player.loop;
    return interaction.reply(`The player queue now **${player.loop ? "will" : "won't"}** loop`);
  }

  @DiscordCommand({
    description: "Show the current player queue",
    options: [
      {
        name: "page",
        type: "INTEGER",
        description: "Page of the queue to show (first by default)",
      },
    ],
  })
  async queue(interaction: CommandInteraction<"present">) {
    const page = Math.max(0, (interaction.options.getInteger("page", false) ?? 1) - 1);

    return this.sendQueue(interaction, page);
  }

  private async sendQueue(interaction: CommandInteraction<"present"> | ButtonInteraction<"present">, page = 0) {
    const player = await this.getPlayer(interaction);

    const queue = [player.currentSong, ...player.queue];
    const pages = Math.ceil(queue.length / 25);

    const embed = new MessageEmbed()
      .setTitle("Player queue")
      .setColor("#00afff")
      .setDescription(page * 25 > queue.length ? "This page is empty" : "")
      .addFields(
        queue.slice(page * 25, (page + 1) * 25).map((song, i) => ({
          name: page + i ? page * 25 + i + "." : "Current song",
          value: song
            ? `[${song.title}](${song.webpage_url}) — ${song.is_live ? "🔴 LIVE" : getDurationString(song.duration)}`
            : "Nothing",
        })),
      )
      .setFooter(
        [
          `${player.queue.length + Number(!!player.currentSong)} song(s) in total`,
          `page ${page + 1} of ${pages}`,
          player.loop ? "🔁 looping on" : "▶️ looping off",
        ].join(" ︱ "),
      );

    return interaction.reply({
      embeds: [embed],
      components: [
        new MessageActionRow({
          components: [
            new MessageButton({
              customId: QUEUE_PAGE_ID + ":" + (page - 1),
              label: "Prev page",
              style: "SECONDARY",
              disabled: page == 0,
            }),
            new MessageButton({
              customId: QUEUE_PAGE_ID + ":" + (page + 1),
              label: "Next page",
              style: "SECONDARY",
              disabled: page + 1 >= pages,
            }),
          ],
        }),
        getPlayerControls("loop"),
      ],
    });
  }

  @DiscordHandler(QUEUE_PAGE_ID)
  async queueButtons(interaction: ButtonInteraction<"present">) {
    const page = +(interaction.customId.split(":")[1] || 0);
    return this.sendQueue(interaction, page);
  }

  @DiscordHandler(CONTROL_ID)
  async controlButtons(interaction: ButtonInteraction<"present">) {
    const cmd = interaction.customId.split(":")[1];
    const player = await this.getPlayer(interaction);

    let activity = "";
    if (cmd === "stop") {
      player.destroy();
      activity = "stopped the player";
    } else if (cmd === "skip") {
      player.skip();
      activity = "skipped the current song";
    } else if (cmd === "play") {
      if (player.paused) {
        player.resume();
        activity = "resumed the player";
      } else {
        player.pause();
        activity = "paused the player";
      }
    } else if (cmd === "loop") {
      player.loop = !player.loop;
      activity = `turned queue looping ${player.loop ? "on" : "off"}`;
    } else throw "Unknown control command";

    return interaction.reply(`${interaction.user} ${activity}`);
  }
}

export const getPlayerControls = (extra?: "queue" | "loop") =>
  new MessageActionRow({
    components: [
      new MessageButton({
        customId: CONTROL_ID + ":" + "stop",
        label: "Stop",
        emoji: "⏹️",
        style: "SECONDARY",
      }),
      new MessageButton({
        customId: CONTROL_ID + ":" + "play",
        label: "Play/pause",
        emoji: "⏯️",
        style: "PRIMARY",
      }),
      new MessageButton({
        customId: CONTROL_ID + ":" + "skip",
        label: "Skip",
        emoji: "⏭️",
        style: "SECONDARY",
      }),
      ...(extra
        ? [
            new MessageButton(
              extra === "queue"
                ? {
                    customId: QUEUE_PAGE_ID,
                    label: "Show queue",
                    style: "SECONDARY",
                  }
                : {
                    customId: CONTROL_ID + ":" + "loop",
                    label: "Toggle looping",
                    emoji: "🔁",
                    style: "SECONDARY",
                  },
            ),
          ]
        : []),
    ],
  });
