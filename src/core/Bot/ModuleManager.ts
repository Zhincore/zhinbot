import Discord, {
  ApplicationCommandData,
  ApplicationCommandOption,
  ApplicationCommandType,
  ChatInputApplicationCommandData,
  DiscordAPIError,
} from "discord.js";
import { Constructable } from "typedi";
import { Logger } from "winston";
import * as Decorators from "../decorators";
import { Bot } from "./";

export class ModuleManager {
  private readonly modules = new Set<Decorators.BotModuleData<any>>();
  private readonly autocompleters = new Map<string, Decorators.IAutocompleter>();
  private readonly commands = new Map<string, Decorators.IDiscordCommand>();
  private readonly handlers = new Map<string, Decorators.IDiscordHandler>();
  private readonly logger: Logger;

  private commandDataList: Discord.ApplicationCommandData[] = [];

  constructor(private readonly bot: Bot) {
    this.logger = bot.getLogger("ModuleManager");

    bot.on("guildCreate", (guild) => this.updateGuildCommands(guild));

    bot.once("ready", (bot): Promise<any> => Promise.all(bot.guilds.cache.map(this.updateGuildCommands.bind(this))));

    bot.on("interactionCreate", async (interaction) => {
      let handler: Decorators.IInteractionHandler<any> | undefined;

      if (interaction.isMessageComponent()) {
        handler = this.handlers.get(interaction.customId.split(":")[0]);
      } else if (interaction.type === Discord.InteractionType.ApplicationCommand) {
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
      if (interaction.type === Discord.InteractionType.ApplicationCommand || interaction.isMessageComponent()) {
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
    const adapterData = Decorators.getDiscordAdapterData(discordAdapter, this.bot);
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

    for (const command of [...(adapterData.commands ?? []), mainCommand]) {
      if (!command) continue;
      const { commandData, execute } = command;
      if (this.commands.has(commandData.name)) throw new Error(`Command '${commandData.name}' already exists`);
      this.commands.set(commandData.name, {
        commandData: this.translateCommandData(commandData),
        execute: execute.bind(discordAdapter),
      });
      this.commandDataList.push(commandData);
    }
  }

  private translateCommandData<T extends ApplicationCommandData>(data: T): T {
    const trans = this.bot.trans;

    const getKey = (...elements: any[]) => elements.filter((v) => v).join("-");
    const traverse = <P extends ApplicationCommandOption | ApplicationCommandData>(subdata: P, supname?: string): P => {
      const getLocalKey = (...elements: any[]) => getKey("cmd", supname, subdata.name, ...elements);
      return {
        ...subdata,
        name: trans.translate(getLocalKey("name"), {}, [], true) ?? data.name,
        nameLocalizations: trans.getTranslations(getLocalKey("name")),
        description: "description" in subdata ? trans.translate(getLocalKey("dsc")) : undefined,
        descriptionLocalizations: "description" in subdata ? trans.getTranslations(getLocalKey("dsc")) : undefined,
        options:
          "options" in subdata
            ? subdata.options?.map((opt) => traverse(opt, getKey(supname, subdata.name)))
            : undefined,
      };
    };

    return traverse(data);
  }

  private async updateGuildCommands(guild: Discord.Guild) {
    try {
      // Apply commands
      await guild.commands.set(this.commandDataList);
    } catch (err) {
      if (err instanceof DiscordAPIError && err.message == "Missing Access") {
        await guild.leave();
      }
      this.logger.error(err);
    }
  }

  private createMainCommand(adapterData: Decorators.IDiscordAdapter) {
    if (adapterData && adapterData.supercomand && adapterData.subcommands) {
      return {
        commandData: {
          defaultMemberPermissions: "0",
          type: ApplicationCommandType.ChatInput,
          ...adapterData.supercomand,
          options: adapterData.subcommands?.map((subcmd) => subcmd.commandData),
        } as ChatInputApplicationCommandData,
        execute(interaction: Discord.ChatInputCommandInteraction) {
          const subcommand = interaction.options.getSubcommandGroup(false) || interaction.options.getSubcommand(true);

          const command = adapterData.subcommands!.find((subcmd) => subcmd.commandData.name == subcommand);
          if (command) return command.execute.apply(this, [interaction]);
        },
      } as Decorators.IDiscordCommand;
    }
  }
}
