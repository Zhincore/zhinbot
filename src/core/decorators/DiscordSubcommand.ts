import { ApplicationCommandSubCommandData, ApplicationCommandSubGroupData, BaseCommandInteraction } from "discord.js";
import { pushToMetaArray, IInteractionHandler } from "./utils";
import { DiscordCommandExecutor } from "./";

const symbol = Symbol("subcommands");

type ApplicationCommandSub_Data = ApplicationCommandSubCommandData | ApplicationCommandSubGroupData;

export type DiscordSubcommandData<T extends ApplicationCommandSub_Data> = Omit<T, "name" | "type"> & {
  name?: string;
  type?: T["type"];
  description: string;
};

export type DiscordSubcommandExecutor = (interaction: BaseCommandInteraction) => Promise<void>;

export interface IDiscordSubcommand extends IInteractionHandler<BaseCommandInteraction> {
  commandData: ApplicationCommandSub_Data;
  execute: DiscordCommandExecutor;
}

/**
 * Can only be used inside Discord adapter
 */
export function DiscordSubcommand(data: DiscordSubcommandData<ApplicationCommandSubCommandData>): MethodDecorator;
export function DiscordSubcommand(data: DiscordSubcommandData<ApplicationCommandSubGroupData>): MethodDecorator;
export function DiscordSubcommand(data: DiscordSubcommandData<any>): MethodDecorator {
  return (target, method) => {
    const commandmethod: IDiscordSubcommand = {
      commandData: {
        ...data,
        type: data.type ?? "SUB_COMMAND",
        name: data.name ?? method.toString(),
      },
      execute: target[method as keyof typeof target] as DiscordCommandExecutor,
    };

    pushToMetaArray(symbol, commandmethod, target);
  };
}

export function getDiscordSubcommands(target: any): IDiscordSubcommand[] | undefined {
  return Reflect.getMetadata(symbol, target);
}
