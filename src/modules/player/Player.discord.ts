import {
  ChatInputCommandInteraction,
  ButtonInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ApplicationCommandOptionType,
  ButtonStyle,
  MessageActionRowComponentBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { DiscordAdapter, DiscordCommand, DiscordHandler } from "@core/decorators/index.js";
import { getDurationString } from "~/utils/index.js";
import { PlayerService } from "./Player.service.js";

const QUEUE_PAGE_ID = "player.queue";
const CONTROL_ID = "player";

@DiscordAdapter()
export class PlayerDiscordAdapter {
  constructor(private readonly service: PlayerService) {}

  private getPlayer(interaction: ChatInputCommandInteraction<"cached"> | ButtonInteraction<"cached">, validate = true) {
    return this.service.getPlayer(interaction.guildId, interaction.channelId, interaction.user.id, validate);
  }

  @DiscordCommand({
    options: [
      {
        name: "query",
        type: ApplicationCommandOptionType.String,
      },
    ],
    defaultMemberPermissions: PermissionFlagsBits.Speak,
  })
  async play(interaction: ChatInputCommandInteraction<"cached">) {
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
    options: [{ name: "channel", type: ApplicationCommandOptionType.Channel }],
    defaultMemberPermissions: PermissionFlagsBits.DeafenMembers,
  })
  async playerchannel(interaction: ChatInputCommandInteraction<"cached">) {
    const channel = interaction.options.getChannel("channel", false);
    await this.service.changeUpdateChannel(interaction.guildId, channel?.id ?? interaction.channelId);
    return interaction.reply({ content: "Player channel updated", ephemeral: true });
  }

  @DiscordCommand({
    defaultMemberPermissions: PermissionFlagsBits.Speak,
  })
  async playing(interaction: ChatInputCommandInteraction<"cached">) {
    const player = await this.getPlayer(interaction);

    if (!player.currentSong) return interaction.reply({ ephemeral: true, content: "Nothing is currently playing" });

    return interaction.reply({
      embeds: [this.service.createSongEmbed(player.currentSong)],
      components: [getPlayerControls("queue")],
    });
  }

  @DiscordCommand({
    defaultMemberPermissions: PermissionFlagsBits.Speak,
  })
  async pause(interaction: ChatInputCommandInteraction<"cached">) {
    const player = await this.getPlayer(interaction);
    player.pause();
    return interaction.reply("Player paused");
  }

  @DiscordCommand({
    defaultMemberPermissions: PermissionFlagsBits.Speak,
  })
  async resume(interaction: ChatInputCommandInteraction<"cached">) {
    const player = await this.getPlayer(interaction);
    player.resume();
    return interaction.reply("Player resumed");
  }

  @DiscordCommand({
    defaultMemberPermissions: PermissionFlagsBits.Speak,
  })
  async stop(interaction: ChatInputCommandInteraction<"cached">) {
    const player = await this.getPlayer(interaction);
    player.destroy();
    return interaction.reply("Player stopped");
  }

  @DiscordCommand({
    defaultMemberPermissions: PermissionFlagsBits.Speak,
  })
  async skip(interaction: ChatInputCommandInteraction<"cached">) {
    const player = await this.getPlayer(interaction);
    return interaction.reply(player.skip() ? "Current song skipped" : "Failed to skip song");
  }

  @DiscordCommand({
    options: [
      {
        name: "position",
        type: ApplicationCommandOptionType.Integer,
        required: true,
      },
    ],
    defaultMemberPermissions: PermissionFlagsBits.Speak,
  })
  async remove(interaction: ChatInputCommandInteraction<"cached">) {
    const position = Math.min(1, interaction.options.getInteger("position", true));
    const player = await this.getPlayer(interaction);
    const [song] = player.queue.splice(position - 1, 1);
    return interaction.reply(song ? "Song removed" : `No song at position ${position}`);
  }

  @DiscordCommand({ defaultMemberPermissions: PermissionFlagsBits.Speak })
  async join(interaction: ChatInputCommandInteraction<"cached">) {
    const voice = await this.service.getUserVoice(interaction.guildId, interaction.user.id);
    if (!voice) return interaction.reply({ ephemeral: true, content: "You are not in a voice channel" });

    const player = await this.getPlayer(interaction, false);
    player.join(voice);

    return interaction.reply("Joining voice channel");
  }

  @DiscordCommand({
    defaultMemberPermissions: PermissionFlagsBits.Speak,
  })
  async leave(interaction: ChatInputCommandInteraction<"cached">) {
    const player = await this.getPlayer(interaction);
    player.leave();
    return interaction.reply("Voice channel left");
  }

  @DiscordCommand({
    options: [{ name: "loop", type: ApplicationCommandOptionType.Boolean }],
    defaultMemberPermissions: PermissionFlagsBits.Speak,
  })
  async loop(interaction: ChatInputCommandInteraction<"cached">) {
    const player = await this.getPlayer(interaction);
    const state = interaction.options.getBoolean("loop", false);
    player.loop = state ?? !player.loop;
    return interaction.reply(`The player queue now **${player.loop ? "will" : "won't"}** loop`);
  }

  @DiscordCommand({
    options: [
      {
        name: "page",
        type: ApplicationCommandOptionType.Integer,
      },
    ],
    defaultMemberPermissions: PermissionFlagsBits.Speak,
  })
  async queue(interaction: ChatInputCommandInteraction<"cached">) {
    const page = Math.max(0, (interaction.options.getInteger("page", false) ?? 1) - 1);

    return this.sendQueue(interaction, page);
  }

  private async sendQueue(interaction: ChatInputCommandInteraction<"cached"> | ButtonInteraction<"cached">, page = 0) {
    const player = await this.getPlayer(interaction);

    const queue = [player.currentSong, ...player.queue];
    const pages = Math.ceil(queue.length / 25);

    const embed = new EmbedBuilder()
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
      .setFooter({
        text: [
          `${player.queue.length + Number(!!player.currentSong)} song(s) in total`,
          `page ${page + 1} of ${pages}`,
          player.loop ? "🔁 looping on" : "▶️ looping off",
        ].join(" ︱ "),
      });

    return interaction.reply({
      embeds: [embed],
      components: [
        new ActionRowBuilder<MessageActionRowComponentBuilder>({
          components: [
            new ButtonBuilder({
              customId: QUEUE_PAGE_ID + ":" + (page - 1),
              label: "Prev page",
              emoji: "◀️",
              style: ButtonStyle.Secondary,
              disabled: page == 0,
            }),
            new ButtonBuilder({
              customId: QUEUE_PAGE_ID + ":" + (page + 1),
              label: "Next page",
              emoji: "▶️",
              style: ButtonStyle.Secondary,
              disabled: page + 1 >= pages,
            }),
          ],
        }),
        getPlayerControls("loop"),
      ],
    });
  }

  @DiscordHandler(QUEUE_PAGE_ID)
  async queueButtons(interaction: ButtonInteraction<"cached">) {
    const page = +(interaction.customId.split(":")[1] || 0);
    return this.sendQueue(interaction, page);
  }

  @DiscordHandler(CONTROL_ID)
  async controlButtons(interaction: ButtonInteraction<"cached">) {
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
    } else throw new Error("Unknown control command");

    return interaction.reply(`${interaction.user} ${activity}`);
  }
}

export const getPlayerControls = (extra?: "queue" | "loop") =>
  new ActionRowBuilder<MessageActionRowComponentBuilder>({
    components: [
      new ButtonBuilder({
        customId: CONTROL_ID + ":" + "stop",
        label: "Stop",
        emoji: "⏹️",
        style: ButtonStyle.Secondary,
      }),
      new ButtonBuilder({
        customId: CONTROL_ID + ":" + "play",
        label: "Play/pause",
        emoji: "⏯️",
        style: ButtonStyle.Primary,
      }),
      new ButtonBuilder({
        customId: CONTROL_ID + ":" + "skip",
        label: "Skip",
        emoji: "⏭️",
        style: ButtonStyle.Secondary,
      }),
      ...(extra
        ? [
            new ButtonBuilder(
              extra === "queue"
                ? {
                    customId: QUEUE_PAGE_ID,
                    label: "Show queue",
                    style: ButtonStyle.Secondary,
                  }
                : {
                    customId: CONTROL_ID + ":" + "loop",
                    label: "Toggle looping",
                    emoji: "🔁",
                    style: ButtonStyle.Secondary,
                  },
            ),
          ]
        : []),
    ],
  });
