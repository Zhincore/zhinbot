import { ApplicationCommandData, ChatInputApplicationCommandData, BaseCommandInteraction } from "discord.js";
import { pushToMetaArray, IInteractionHandler } from "./utils";

const symbol = Symbol("commands");

type CommandDataWithType = Omit<ApplicationCommandData, "name">;
type CommandDataWithoutType = Omit<ChatInputApplicationCommandData, "name" | "type">;

export type DiscordCommandData = (CommandDataWithoutType | CommandDataWithType) & {
  name?: string;
  description: string;
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
    const commandmethod: IDiscordCommand = {
      commandData: {
        ...data,
        type: "type" in data ? data.type : "CHAT_INPUT",
        name: data.name ?? method.toString(),
      },
      execute: target[method as keyof typeof target] as DiscordCommandExecutor,
    };

    pushToMetaArray(symbol, commandmethod, target);
  };
}

export function getDiscordCommands(target: any): IDiscordCommand[] | undefined {
  return Reflect.getMetadata(symbol, target);
}
