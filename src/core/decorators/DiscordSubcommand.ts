import { ApplicationCommandSubCommandData, ApplicationCommandSubGroupData, BaseCommandInteraction } from "discord.js";
import { pushToMetaArray } from "./utils";
import { DiscordCommandExecutor } from "./";

const symbol = Symbol("subcommands");

type ApplicationCommandSub_Data = ApplicationCommandSubCommandData | ApplicationCommandSubGroupData;

export type DiscordSubcommandData<T extends ApplicationCommandSub_Data> = Omit<T, "name" | "type"> & {
  name?: string;
  type?: T["type"];
  description: string;
};

export type DiscordSubcommandExecutor = (
  interaction: BaseCommandInteraction,
  commandData: ApplicationCommandSub_Data,
) => void | Promise<void>;

export type IDiscordSubcommand = {
  commandData: ApplicationCommandSub_Data;
  execute: DiscordCommandExecutor;
};

/**
 * Can only be used inside Discord adapter
 */
export function DiscordSubcommand(
  subcommandData: DiscordSubcommandData<ApplicationCommandSubCommandData>,
): MethodDecorator;
export function DiscordSubcommand(
  subcommandData: DiscordSubcommandData<ApplicationCommandSubGroupData>,
): MethodDecorator;
export function DiscordSubcommand(subcommandData: DiscordSubcommandData<any>): MethodDecorator {
  return (target, method) => {
    const commandmethod: IDiscordSubcommand = {
      commandData: {
        ...subcommandData,
        type: subcommandData.type ?? "SUB_COMMAND",
        name: subcommandData.name ?? method.toString(),
      },
      execute: target[method as keyof typeof target] as DiscordCommandExecutor,
    };

    pushToMetaArray(symbol, commandmethod, target);
  };
}

export function getDiscordSubcommands(target: any): IDiscordSubcommand[] | undefined {
  return Reflect.getMetadata(symbol, target);
}
