import { CommandInteraction, ButtonInteraction, MessageEmbed, MessageActionRow, MessageButton } from "discord.js";
import { DiscordAdapter, DiscordCommand, DiscordHandler, Inject } from "@core/decorators";
import { PlayerModule } from "./";

const QUEUE_PAGE_ID = "player.queue";
const CONTROL_ID = "player";
const controlReplies = {
  stop: "Player stopped",
  resume: "Player resumed",
  pause: "Player paused",
  skip: "Current song skipped",
  loopOn: "The player queue now **will** loop",
  loopOff: "The player queue now **won't** loop",
};

@DiscordAdapter()
export class PlayerModuleDiscordAdapter {
  constructor(@Inject(() => PlayerModule) private readonly service: PlayerModule) {}

  private getPlayer(interaction: CommandInteraction | ButtonInteraction) {
    return this.service.getPlayer(interaction.guildId, interaction.channelId);
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
  async play(interaction: CommandInteraction) {
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
    return interaction.editReply("Player is ready, no songs added");
  }

  @DiscordCommand({ description: "Pause the music player" })
  async pause(interaction: CommandInteraction) {
    const player = await this.getPlayer(interaction);
    player.pause();
    return interaction.reply(controlReplies.pause);
  }

  @DiscordCommand({ description: "Resume paused music player" })
  async resume(interaction: CommandInteraction) {
    const player = await this.getPlayer(interaction);
    player.resume();
    return interaction.reply(controlReplies.resume);
  }

  @DiscordCommand({ description: "Stop playing, leave the voice channel and forget the queue" })
  async stop(interaction: CommandInteraction) {
    const player = await this.getPlayer(interaction);
    player.destroy();
    return interaction.reply(controlReplies.stop);
  }

  @DiscordCommand({ description: "Skip currently playing song" })
  async skip(interaction: CommandInteraction) {
    const player = await this.getPlayer(interaction);
    return interaction.reply(player.skip() ? controlReplies.skip : "Failed to skip song");
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
  async remove(interaction: CommandInteraction) {
    const position = Math.min(1, interaction.options.getInteger("position", true));
    const player = await this.getPlayer(interaction);
    const [song] = player.queue.splice(position - 1, 1);
    return interaction.reply(song ? "Song removed" : `No song at position ${position}`);
  }

  @DiscordCommand({ description: "Join a voice channel" })
  async join(interaction: CommandInteraction) {
    const voice = await this.service.getVoice(interaction.guildId, interaction.user.id);
    if (!voice) throw "You are not in a voice channel";

    const player = await this.getPlayer(interaction);
    player.join(voice);
    return interaction.reply("Joining voice channel");
  }

  @DiscordCommand({ description: "Leave the current voice chat (remembers the queue for a while)" })
  async leave(interaction: CommandInteraction) {
    const player = await this.getPlayer(interaction);
    player.leave();
    return interaction.reply("Voice channel left");
  }

  @DiscordCommand({
    description: "Toggle looping of the current player queue",
    options: [{ name: "loop", type: "BOOLEAN", description: "Whether the queue should loop" }],
  })
  async loop(interaction: CommandInteraction) {
    const player = await this.getPlayer(interaction);
    const state = interaction.options.getBoolean("loop", false);
    player.loop = state ?? !player.loop;
    return interaction.reply(controlReplies[player.loop ? "loopOn" : "loopOff"]);
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
  async queue(interaction: CommandInteraction) {
    const page = Math.max(0, (interaction.options.getInteger("page", false) ?? 1) - 1);

    return this.sendQueue(interaction, page);
  }

  private async sendQueue(interaction: CommandInteraction | ButtonInteraction, page = 0) {
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
          value: song ? `[${song.title}](${song.webpage_url})` : "Nothing",
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
  async queueButtons(interaction: ButtonInteraction) {
    const page = +(interaction.customId.split(":")[1] || 0);
    return this.sendQueue(interaction, page);
  }

  @DiscordHandler(CONTROL_ID)
  async controlButtons(interaction: ButtonInteraction) {
    const cmd = interaction.customId.split(":")[1];
    const player = await this.getPlayer(interaction);

    let reply = "";
    if (cmd === "stop") {
      player.destroy();
      reply = controlReplies.stop;
    } else if (cmd === "skip") {
      player.skip();
      reply = controlReplies.skip;
    } else if (cmd === "play") {
      if (player.paused) {
        player.resume();
        reply = controlReplies.resume;
      } else {
        player.pause();
        reply = controlReplies.pause;
      }
    } else if (cmd === "loop") {
      player.loop = !player.loop;
      reply = controlReplies[player.loop ? "loopOn" : "loopOff"];
    } else throw "Unknown control command";

    return interaction.reply(reply);
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
