import { Service, Constructable } from "typedi";

const symbol = Symbol("moduleData");

export type BotModuleData<T> = {
  /**
   * Array of class with the DiscordAdapter decorator, handling discord interactions.
   */
  discordAdapters?: Constructable<T>[];
  /**
   * Array of (sub)modules that should be loaded with this module
   */
  subModules?: Constructable<T>[];
  /**
   * Array of services to be automatically initialized.
   * A service doesn't have to be in this array to be injected.
   */
  services?: Constructable<T>[];
};

export function BotModule(data: BotModuleData<any> = {}): ClassDecorator {
  const service = Service();
  return (target) => {
    Reflect.defineMetadata(symbol, data, target);
    service(target);
  };
}

export function getModuleData(target: Constructable<any>): BotModuleData<any> | undefined {
  return Reflect.getMetadata(symbol, target);
}
