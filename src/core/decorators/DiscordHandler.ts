import { ButtonInteraction } from "discord.js";
import { pushToMetaArray, IInteractionHandler } from "./utils";

const symbol = Symbol("handlers");

export type DiscordHandlerExecutor = (interaction: ButtonInteraction) => Promise<void>;
export interface IDiscordHandler extends IInteractionHandler<ButtonInteraction> {
  id: string;
  execute: DiscordHandlerExecutor;
}

/**
 * Can only be used inside Discord adapter
 */
export function DiscordHandler(id: string): MethodDecorator {
  return (target, method) => {
    const commandmethod: IDiscordHandler = {
      id,
      execute: target[method as keyof typeof target] as DiscordHandlerExecutor,
    };

    pushToMetaArray(symbol, commandmethod, target);
  };
}

export function getDiscordHandlers(target: any): IDiscordHandler[] | undefined {
  return Reflect.getMetadata(symbol, target);
}
