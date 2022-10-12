import { ApplicationCommandOptionType, ChatInputCommandInteraction } from "discord.js";
import { Bot } from "~/core/Bot";
import { DiscordCommandExecutor } from "./DiscordCommand";
import {
  pushToMetaArray,
  IInteractionHandler,
  AnnotWithBot,
  CustomSubCommandData,
  CustomSubGroupData,
  CustomCommandOptionData,
  CustomSubData,
} from "./_utils";
import { parseAutocompleters } from "./DiscordAutocompleter";

const symbol = Symbol("subcommands");

type _D<T extends "subcmd" | "group"> = T extends "subcmd" ? CustomSubCommandData : CustomSubGroupData;
export type DiscordSubcommandData<T extends "subcmd" | "group"> = Omit<_D<T>, "name" | "type" | "options"> & {
  name?: string;
  type?: _D<T>["type"];
  options?: T extends "subcmd" ? CustomCommandOptionData[] : DiscordSubcommandData<"subcmd">[];
};

export type DiscordSubcommandExecutor = (interaction: ChatInputCommandInteraction) => Promise<void>;

export interface IDiscordSubcommand extends IInteractionHandler<ChatInputCommandInteraction> {
  commandData: CustomSubData;
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
      } as CustomSubData),
      execute: target[method as keyof typeof target] as DiscordCommandExecutor,
    });

    pushToMetaArray(symbol, subcommand, target);
  };
}

export function getDiscordSubcommands(target: any): ((bot: Bot) => IDiscordSubcommand)[] | undefined {
  return Reflect.getMetadata(symbol, target);
}
