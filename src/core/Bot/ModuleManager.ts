import {
  Guild,
  DiscordAPIError,
  CommandInteraction,
  ApplicationCommandData,
  GuildApplicationCommandPermissionData,
} from "discord.js";
import { Constructable } from "typedi";
import {
  getModuleData,
  BotModuleData,
  getDiscordCommands,
  getDiscordSubcommands,
  getDiscordHandlers,
  getDiscordAdapterData,
  IDiscordCommand,
  IDiscordHandler,
  DiscordAdapterData,
} from "../decorators";
import { IInteractionHandler } from "../decorators/utils";
import { Bot } from "./";

export class ModuleManager {
  private readonly modules = new Set<BotModuleData<any>>();
  private readonly commands = new Map<string, IDiscordCommand>();
  private readonly handlers = new Map<string, IDiscordHandler>();

  private commandDataList: ApplicationCommandData[] = [];

  constructor(private readonly bot: Bot) {
    bot.on("guildCreate", (guild) => {
      this.registerCommands(guild);
    });

    bot.once("ready", (bot) => {
      bot.guilds.cache.forEach(this.registerCommands.bind(this));
    });

    bot.on("interactionCreate", async (interaction) => {
      let handler: IInteractionHandler<any> | undefined;

      if (interaction.isMessageComponent()) {
        handler = this.handlers.get(interaction.customId.split(":")[0]);
      } else if (interaction.isApplicationCommand()) {
        handler = this.commands.get(interaction.commandName);
      }

      try {
        if (!handler) throw new Error("Recieved unexpected interaction");

        await handler.execute(interaction);
      } catch (err) {
        console.error(err);

        if (interaction.isApplicationCommand() || interaction.isMessageComponent()) {
          try {
            if (!interaction.replied) await interaction.reply({ content: String(err), ephemeral: true });
            else await interaction.followUp({ content: String(err), ephemeral: true });
          } catch (err) {
            console.error("Failed to send error:", err);
          }
        }
      }
    });
  }

  register(modules: Constructable<any>[]) {
    this.commandDataList.length = 0;

    for (const BotModule of modules) {
      const moduleData = getModuleData(BotModule);
      if (!moduleData) {
        console.error(BotModule.name + " is missing the BotModule decorator");
        continue;
      }

      for (const DiscordAdapter of moduleData.discordAdapters ?? []) {
        const discordAdapter = this.bot.container.get(DiscordAdapter);
        const adapterData = getDiscordAdapterData(DiscordAdapter);
        const commands = getDiscordCommands(discordAdapter);
        const handlers = getDiscordHandlers(discordAdapter);

        for (const handler of handlers ?? []) {
          this.handlers.set(handler.id, { ...handler, execute: handler.execute.bind(discordAdapter) });
        }

        const mainCommand = adapterData ? this.createMainCommand(adapterData, discordAdapter) : undefined;

        // Generate command list
        this.commandDataList.push(
          ...([...(commands ?? []), mainCommand].filter(Boolean) as IDiscordCommand[]).map((adapterCommand) => {
            this.commands.set(adapterCommand.commandData.name, {
              ...adapterCommand,
              execute: adapterCommand.execute.bind(discordAdapter),
            });

            return adapterCommand.commandData;
          }),
        );
      }

      this.modules.add(moduleData);
    }
  }

  private async registerCommands(guild: Guild) {
    try {
      // Set commands
      const result = await guild.commands.set(this.commandDataList);

      // Generate permission list for each
      const fullPermissions: GuildApplicationCommandPermissionData[] = [];
      const onwersPerms = this.bot.owners.map((id) => ({
        id,
        type: "USER" as const,
        permission: true,
      }));

      for (const command of result.values()) {
        if (command.defaultPermission) continue;

        fullPermissions.push({
          id: command.id,
          permissions: [...onwersPerms],
        });
      }

      // Set permissions
      await guild.commands.permissions.set({ fullPermissions });
    } catch (err) {
      if (err instanceof DiscordAPIError && err.message == "Missing Access") {
        guild.leave();
      }
      console.error(err);
    }
  }

  private createMainCommand(adapterData: DiscordAdapterData, discordAdapter: any) {
    const adapterSubcommands = getDiscordSubcommands(discordAdapter);

    if (adapterData && adapterData.supercomand && adapterSubcommands) {
      return {
        commandData: {
          ...adapterData.supercomand,
          options: adapterSubcommands.map((subcmd) => subcmd.commandData),
        },
        execute: function (interaction: CommandInteraction) {
          const subcommand = interaction.options.getSubcommandGroup(false) || interaction.options.getSubcommand(true);

          const command = adapterSubcommands.find((subcmd) => subcmd.commandData.name == subcommand);
          if (command) return command.execute.apply(this, [interaction]);
        },
      } as IDiscordCommand;
    }
  }
}
