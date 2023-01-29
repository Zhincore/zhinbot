import { ApplicationCommandData, ApplicationCommandType, Interaction } from "discord.js";
import { Optional, Bot, type TranslateFn } from "@core/index";
import { pushToMetaArray, IInteractionHandler, AnnotWithBot, CustomCommandData } from "./_utils";
import { parseAutocompleters } from "./DiscordAutocompleter";

const symbol = Symbol("commands");

export type DiscordCommandData = Optional<CustomCommandData, "name">;

export type DiscordCommandExecutor = (interaction: Interaction, t: TranslateFn) => Promise<void>;

export interface IDiscordCommand extends IInteractionHandler<Interaction> {
  commandData: ApplicationCommandData;
  execute: DiscordCommandExecutor;
}

/**
 * Can only be used inside Discord adapter
 */
export function DiscordCommand(data: AnnotWithBot<DiscordCommandData>): MethodDecorator {
  return (target, method) => {
    const command = (bot: Bot): IDiscordCommand => ({
      commandData: parseAutocompleters(target, {
        type: ApplicationCommandType.ChatInput,
        name: method.toString(),
        ...(typeof data === "function" ? data(bot) : data),
      }),
      execute: target[method as keyof typeof target] as DiscordCommandExecutor,
    });

    pushToMetaArray(symbol, command, target);
  };
}

export function getDiscordCommands(target: any): ((bot: Bot) => IDiscordCommand)[] | undefined {
  return Reflect.getMetadata(symbol, target);
}
