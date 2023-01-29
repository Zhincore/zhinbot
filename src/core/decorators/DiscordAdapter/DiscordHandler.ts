import { MessageComponentInteraction } from "discord.js";
import { TranslateFn } from "@core";
import { pushToMetaArray, IInteractionHandler } from "./_utils";

const symbol = Symbol("handlers");

export type DiscordHandlerExecutor = (interaction: MessageComponentInteraction, t: TranslateFn) => Promise<void>;
export interface IDiscordHandler extends IInteractionHandler<MessageComponentInteraction> {
  /**
   * customId of the MessageComponent to handle, it's up to you to make it unique across the whole bot
   */
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
