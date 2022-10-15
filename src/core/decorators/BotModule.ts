import { Service, Constructable } from "typedi";

const symbol = Symbol("moduleData");

export type BotModuleData<T> = {
  /** Name of the module. The class name by default */
  name?: string;
  /** Description of the module. Filled from translations by default */
  description?: string;
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

export interface IBotModule<T> extends Omit<BotModuleData<T>, "name"> {
  name: string;
  nameFriendly: string;
}

export function BotModule(data: BotModuleData<any> = {}): ClassDecorator {
  const service = Service();
  return (target) => {
    Reflect.defineMetadata(
      symbol,
      {
        name: target.name,
        nameFriendly: target.name, // To be replaced by module manager
        ...data,
      },
      target,
    );
    service(target);
  };
}

export function getModuleData(target: Constructable<any>): IBotModule<any> | undefined {
  return Reflect.getMetadata(symbol, target);
}
