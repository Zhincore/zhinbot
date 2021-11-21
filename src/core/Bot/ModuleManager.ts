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
  getDiscordAdapterData,
  IDiscordCommand,
  DiscordAdapterData,
} from "../decorators";
import { Bot } from "./";

export class ModuleManager {
  private readonly modules = new Set<BotModuleData<any>>();
  private readonly commands = new Map<string, IDiscordCommand>();

  constructor(private readonly bot: Bot) {
    bot.once("ready", (bot) => {
      bot.guilds.cache.forEach(this.registerCommands.bind(this));
    });

    bot.on("guildCreate", (guild) => {
      this.registerCommands(guild);
    });

    bot.on("interactionCreate", async (interaction) => {
      if (!interaction.isApplicationCommand()) return;

      try {
        const command = this.commands.get(interaction.commandName);
        if (!command) throw new Error("Recieved unexpected interaction");

        await command.execute(interaction, command.commandData);
      } catch (err) {
        console.error(err);
        interaction.reply({ content: String(err), ephemeral: true });
      }
    });
  }

  register(modules: Constructable<any>[]) {
    for (const BotModule of modules) {
      const moduleData = getModuleData(BotModule);
      if (!moduleData) {
        console.error(BotModule.name + " is missing the BotModule decorator");
        continue;
      }

      this.modules.add(moduleData);
    }
  }

  private async registerCommands(guild: Guild) {
    const commands: ApplicationCommandData[] = [];

    // Generate command list
    for (const module of this.modules) {
      if (module.discordAdapter) {
        const discordAdapter = this.bot.container.get(module.discordAdapter);
        const adapterData = getDiscordAdapterData(module.discordAdapter);
        const adapterCommands = getDiscordCommands(discordAdapter);

        const mainCommand = adapterData ? this.createMainCommand(adapterData, discordAdapter) : undefined;

        commands.push(
          ...([...(adapterCommands ?? []), mainCommand].filter(Boolean) as IDiscordCommand[]).map((adapterCommand) => {
            this.commands.set(adapterCommand.commandData.name, {
              ...adapterCommand,
              execute: adapterCommand.execute.bind(discordAdapter),
            });

            return adapterCommand.commandData;
          }),
        );
      }
    }

    try {
      // Set commands
      const result = await guild.commands.set(commands);

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
        execute: (interaction: CommandInteraction, cmdData) => {
          const subcommand = interaction.options.getSubcommandGroup() || interaction.options.getSubcommand(true);

          const command = adapterSubcommands.find((subcmd) => subcmd.commandData.name == subcommand);
          if (command) return command.execute(interaction, cmdData);
        },
      } as IDiscordCommand;
    }
  }
}
