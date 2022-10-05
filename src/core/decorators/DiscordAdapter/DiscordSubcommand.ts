import {
  ApplicationCommandOptionType,
  ApplicationCommandSubCommandData,
  ApplicationCommandSubGroupData,
  ChatInputCommandInteraction,
} from "discord.js";
import { Bot } from "~/core/Bot";
import { DiscordCommandExecutor } from "./DiscordCommand";
import { pushToMetaArray, IInteractionHandler, AnnotWithBot } from "./_utils";
import { CustomCommandOption, CustomAppSubcmdData, parseAutocompleters } from "./DiscordAutocompleter";

const symbol = Symbol("subcommands");

export type ApplicationCommandSub_Data = ApplicationCommandSubCommandData | ApplicationCommandSubGroupData;

type _D<T extends "subcmd" | "group"> = T extends "subcmd"
  ? ApplicationCommandSubCommandData
  : ApplicationCommandSubGroupData;
export type DiscordSubcommandData<T extends "subcmd" | "group"> = Omit<_D<T>, "name" | "type" | "options"> & {
  name?: string;
  type?: _D<T>["type"];
  description: string;
  options?: T extends "subcmd" ? CustomCommandOption[] : DiscordSubcommandData<"subcmd">[];
};

export type DiscordSubcommandExecutor = (interaction: ChatInputCommandInteraction) => Promise<void>;

export interface IDiscordSubcommand extends IInteractionHandler<ChatInputCommandInteraction> {
  commandData: ApplicationCommandSub_Data;
  execute: DiscordCommandExecutor;
}

/**
 * Can only be used inside Discord adapter
 */
export function DiscordSubcommand(data: AnnotWithBot<DiscordSubcommandData<"subcmd">>): MethodDecorator;
export function DiscordSubcommand(data: AnnotWithBot<DiscordSubcommandData<"group">>): MethodDecorator;
export function DiscordSubcommand(data: AnnotWithBot<DiscordSubcommandData<any>>): MethodDecorator {
  return (target, method) => {
    const subcommand = (bot: Bot): IDiscordSubcommand => ({
      commandData: parseAutocompleters(target, {
        type: ApplicationCommandOptionType.Subcommand,
        name: method.toString(),
        ...(typeof data === "function" ? data(bot) : data),
      } as CustomAppSubcmdData),
      execute: target[method as keyof typeof target] as DiscordCommandExecutor,
    });

    pushToMetaArray(symbol, subcommand, target);
  };
}

export function getDiscordSubcommands(target: any): ((bot: Bot) => IDiscordSubcommand)[] | undefined {
  return Reflect.getMetadata(symbol, target);
}
