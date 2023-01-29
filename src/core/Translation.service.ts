import fs from "node:fs/promises";
import Path from "node:path";
import { FluentBundle, FluentFunction, FluentNumber, FluentResource, FluentVariable } from "@fluent/bundle";
import { Locale } from "discord.js";
import type { LocaleString } from "discord.js";
import { Logger } from "winston";
import { Service } from "./decorators";
import { Bot } from "./Bot";

type SupportedVariable = FluentVariable | boolean | undefined | null;
export type TranslateFn = <Strict extends boolean = false>(
  pattern: string,
  args?: Record<string, SupportedVariable>,
  strict?: Strict,
) => Strict extends true ? string | undefined : string;

@Service()
export class TranslationService {
  private readonly logger: Logger;
  private readonly localeBoundles = new Map<string, FluentBundle>();
  private readonly functions: Record<string, FluentFunction> = {
    RANDOM_INDEX: ([max]) => new FluentNumber(Math.floor(Math.random() * Number(max))),
  };

  constructor(public defaultLocale: LocaleString = "en-US", bot: Bot) {
    this.logger = bot.getLogger("TranslationService");
  }

  async load() {
    for (const error of await this.loadFolder("./translations")) {
      this.logger.warn(error);
    }
    for (const error of await this.loadFolder("./translations/overrides", true)) {
      this.logger.warn(new Error("Override failed", { cause: error }));
    }
  }

  private async loadFolder(path: string, override = false) {
    const promises: Promise<Error[]>[] = [];

    for await (const dirent of await fs.opendir(path)) {
      if (!dirent.isFile() || !dirent.name.endsWith(".ftl")) continue;

      const locale = dirent.name.slice(0, -".ftl".length);
      if (!Object.values(Locale).includes(locale as any)) {
        this.logger.warn(`Filename '${dirent.name}' doesn't correspond to a valid locale.`);
        continue;
      }

      promises.push(
        fs.readFile(Path.join(path, dirent.name), "utf-8").then((f) => {
          let bundle = this.localeBoundles.get(locale);
          if (!bundle) {
            bundle = new FluentBundle(locale, { functions: this.functions });
            this.localeBoundles.set(locale, bundle);
          }
          return bundle.addResource(new FluentResource(f), { allowOverrides: override });
        }),
      );
    }

    return (await Promise.all(promises)).flat();
  }

  getLocales() {
    return Array.from(this.localeBoundles.keys()) as LocaleString[];
  }

  getTranslations(pattern: string, args?: Record<string, SupportedVariable> | null, skipDefault = false) {
    return this.getLocales().reduce((obj, locale) => {
      if (skipDefault && locale == this.defaultLocale) return obj;
      const msg = this.translate(pattern, args, locale, true);
      if (msg) obj[locale] = msg;
      return obj;
    }, {} as Record<LocaleString, string>);
  }

  transformVariables(args: Record<string, SupportedVariable>): Record<string, FluentVariable> {
    const output: Record<string, FluentVariable> = {};
    for (const [key, value] of Object.entries(args)) {
      if (value === null || value === undefined || typeof value == "boolean") {
        output[key] = String(value);
      } else {
        output[key] = value;
      }
    }
    return output;
  }

  translate<Strict extends boolean = false>(
    pattern: string,
    args?: Record<string, SupportedVariable> | null,
    locale?: LocaleString | (LocaleString | undefined)[],
    strict?: Strict,
  ): Strict extends true ? string | undefined : string {
    const locales = (Array.isArray(locale) ? [...locale] : [locale]).filter((v) => v);
    if (!strict || !locales.length) locales.push(this.defaultLocale);

    const fluentArgs = args ? this.transformVariables(args) : undefined;

    const tryTranslate = (): string | undefined => {
      const chosenLocale = locales.shift();
      if (!chosenLocale) return;

      const bundle = this.localeBoundles.get(chosenLocale);
      if (bundle) {
        const message = bundle.getMessage(pattern);
        if (message?.value) {
          return bundle.formatPattern(message.value, fluentArgs);
        }
      }

      // Try to fallback
      return tryTranslate();
    };

    const result = tryTranslate();
    if (result) return result;

    if (!strict) {
      this.logger.warn(new Error(`Requested pattern '${pattern}' was not found.`));
      return pattern;
    }
    return undefined as any;
  }

  t = this.translate;

  getTranslate(locale?: LocaleString | (LocaleString | undefined)[]): TranslateFn {
    return (pattern, args, strict) => this.translate(pattern, args, locale, strict);
  }
}
