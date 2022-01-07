import Discord, { DiscordAPIError } from "discord.js";
import { Constructable } from "typedi";
import * as Decorators from "../decorators";
import { Bot } from "./";

export class ModuleManager {
  private readonly modules = new Set<Decorators.BotModuleData<any>>();
  private readonly autocompleters = new Map<string, Decorators.IAutocompleter>();
  private readonly commands = new Map<string, Decorators.IDiscordCommand>();
  private readonly handlers = new Map<string, Decorators.IDiscordHandler>();
  private readonly logger = this.bot.getLogger("ModuleManager");

  private commandDataList: Discord.ApplicationCommandData[] = [];

  constructor(private readonly bot: Bot) {
    bot.on("guildCreate", (guild) => this.updateGuildCommands(guild));

    bot.on("roleUpdate", (role) => this.updateGuildCommandPermissions(role.guild));

    bot.once("ready", (bot): Promise<any> => Promise.all(bot.guilds.cache.map(this.updateGuildCommands.bind(this))));

    bot.on("interactionCreate", async (interaction) => {
      let handler: Decorators.IInteractionHandler<any> | undefined;

      if (interaction.isMessageComponent()) {
        handler = this.handlers.get(interaction.customId.split(":")[0]);
      } else if (interaction.isApplicationCommand()) {
        handler = this.commands.get(interaction.commandName);
      } else if (interaction.isAutocomplete()) {
        const subcmdGroup = interaction.options.getSubcommandGroup(false);
        const subcmd = interaction.options.getSubcommand(false);
        const id = Decorators.getAutocompleterId(
          subcmdGroup ?? subcmd ?? interaction.commandName,
          interaction.options.getFocused(true).name,
          subcmd ? interaction.commandName : undefined,
          subcmd ?? undefined,
        );
        handler = this.autocompleters.get(id);
      }

      try {
        if (!handler) throw new Error("Recieved unexpected interaction");

        await handler.execute(interaction);
      } catch (err) {
        if (typeof err !== "string") this.logger.error(err);
        await this.sendError(interaction, err);
      }
    });
  }

  private async sendError(interaction: Discord.Interaction, err: any) {
    try {
      if (interaction.isApplicationCommand() || interaction.isMessageComponent()) {
        if (!interaction.replied) {
          if (interaction.deferred) await interaction.editReply({ content: String(err) });
          else await interaction.reply({ content: String(err), ephemeral: true });
        } else await interaction.followUp({ content: String(err), ephemeral: true });
      } else if (interaction.isAutocomplete()) {
        if (interaction.responded) throw "AutocompleteInteraction was already responded to";
        await interaction.respond([]);
      } else {
        throw "Cannot respond to this interaction";
      }
    } catch (_err) {
      this.logger.error("While sending error another error was thrown:", _err);
    }
  }

  register(modules: Constructable<any>[]) {
    for (const BotModule of modules) {
      const moduleData = Decorators.getModuleData(BotModule);
      if (!moduleData) {
        this.logger.error(`Class ${BotModule.name} is missing the BotModule decorator`);
        continue;
      }
      this.bot.container.get(BotModule);

      if (moduleData.discordAdapters) moduleData.discordAdapters.forEach(this.parseAdapterCommands.bind(this));
      if (moduleData.services) moduleData.services.forEach((Service) => this.bot.container.get(Service));
      if (moduleData.subModules) this.register(moduleData.subModules);
      this.modules.add(moduleData);
    }
  }

  private parseAdapterCommands(DiscordAdapter: Constructable<any>) {
    const discordAdapter = this.bot.container.get(DiscordAdapter);
    const adapterData = Decorators.getDiscordAdapterData(discordAdapter);
    if (!adapterData) {
      this.logger.error(`Class ${DiscordAdapter.name} is missing the DiscordAdapter decorator`);
      this.bot.container.remove(DiscordAdapter);
      return;
    }

    for (const autocompleteMapping of adapterData.autocompleteMappings ?? []) {
      const autocompleter = adapterData.autocompleters?.find((item) => item.id === autocompleteMapping.id);
      const id = Decorators.getAutocompleterId(
        autocompleteMapping.commandName,
        autocompleteMapping.optionName,
        adapterData.supercomand?.name,
        autocompleteMapping.subcommandName,
      );

      if (!autocompleter) {
        this.logger.error("Autocomplete " + DiscordAdapter.name + "." + id + " has no handler");
        continue;
      }

      this.autocompleters.set(id, {
        ...autocompleter,
        execute: autocompleter.execute.bind(discordAdapter),
      });
    }

    for (const handler of adapterData.handlers ?? []) {
      this.handlers.set(handler.id, { ...handler, execute: handler.execute.bind(discordAdapter) });
    }

    // Generate command list
    const mainCommand = adapterData ? this.createMainCommand(adapterData) : undefined;
    const commands = [...(adapterData.commands ?? []), mainCommand].filter(Boolean) as Decorators.IDiscordCommand[];
    for (const { commandData, execute } of commands) {
      if (this.commands.has(commandData.name)) throw new Error(`Command '${commandData.name}' already exists`);
      this.commands.set(commandData.name, {
        commandData,
        execute: execute.bind(discordAdapter),
      });
      this.commandDataList.push(commandData);
    }
  }

  private async updateGuildCommands(guild: Discord.Guild) {
    try {
      // Apply commands
      await guild.commands.set(this.commandDataList);
      // Update command permissions
      await this.updateGuildCommandPermissions(guild);
    } catch (err) {
      if (err instanceof DiscordAPIError && err.message == "Missing Access") {
        await guild.leave();
      }
      this.logger.error(err);
    }
  }

  private async updateGuildCommandPermissions(guild: Discord.Guild) {
    // Generate perms for owners
    const owners = this.bot.settings.owners.map((id) => ({
      id,
      type: "USER" as const,
      permission: true,
    }));
    // Generate perms for admins
    const admins = Array.from(guild.roles.cache.values())
      .filter((role) => this.bot.isAdmin(role))
      .map(({ id }) => ({
        id,
        type: "ROLE" as const,
        permission: true,
      }));
    // Merge above perms
    const perms = [...owners, ...admins];

    // Generate perms of all admin commands
    const fullPermissions: Discord.GuildApplicationCommandPermissionData[] = [];
    for (const command of guild.commands.cache.values()) {
      if (command.defaultPermission) continue;

      fullPermissions.push({
        id: command.id,
        permissions: perms,
      });
    }

    // Apply the permissions
    await guild.commands.permissions.set({ fullPermissions });
  }

  private createMainCommand(adapterData: Decorators.IDiscordAdapter) {
    if (adapterData && adapterData.supercomand && adapterData.subcommands) {
      return {
        commandData: {
          ...adapterData.supercomand,
          options: adapterData.subcommands.map((subcmd) => subcmd.commandData),
        },
        execute: function (interaction: Discord.CommandInteraction) {
          const subcommand = interaction.options.getSubcommandGroup(false) || interaction.options.getSubcommand(true);

          const command = adapterData.subcommands!.find((subcmd) => subcmd.commandData.name == subcommand);
          if (command) return command.execute.apply(this, [interaction]);
        },
      } as Decorators.IDiscordCommand;
    }
  }
}
