import { ApplicationCommandData, ChatInputApplicationCommandData, BaseCommandInteraction } from "discord.js";
import { pushToMetaArray, IInteractionHandler } from "./_utils";
import { CustomCommandOption, parseAutocompleters } from "./DiscordAutocompleter";

const symbol = Symbol("commands");

type _CommandDataWithType = Omit<ApplicationCommandData, "name">;
type _CommandDataWithoutType = Omit<ChatInputApplicationCommandData, "name" | "type" | "options">;
type _CommandData = _CommandDataWithoutType | _CommandDataWithType;

export type DiscordCommandData = _CommandData & {
  name?: string;
  description: string;
  options?: CustomCommandOption[];
};

export type DiscordCommandExecutor = (interaction: BaseCommandInteraction) => Promise<void>;

export interface IDiscordCommand extends IInteractionHandler<BaseCommandInteraction> {
  commandData: ApplicationCommandData;
  execute: DiscordCommandExecutor;
}

/**
 * Can only be used inside Discord adapter
 */
export function DiscordCommand(data: DiscordCommandData): MethodDecorator {
  return (target, method) => {
    const command: IDiscordCommand = {
      commandData: parseAutocompleters(target, {
        ...data,
        type: "type" in data ? data.type : "CHAT_INPUT",
        name: data.name ?? method.toString(),
      }),
      execute: target[method as keyof typeof target] as DiscordCommandExecutor,
    };

    pushToMetaArray(symbol, command, target);
  };
}

export function getDiscordCommands(target: any): IDiscordCommand[] | undefined {
  return Reflect.getMetadata(symbol, target);
}
