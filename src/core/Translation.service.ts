import fs from "node:fs/promises";
import Path from "node:path";
import { FluentBundle, FluentFunction, FluentNumber, FluentResource, FluentVariable } from "@fluent/bundle";
import { LocaleString } from "discord.js";
import { Service } from "./decorators";
import { getLogger } from "./Bot/getLogger";

@Service()
export class TranslationService {
  private readonly logger = getLogger().child("Translations");
  private readonly localeBoundles = new Map<string, FluentBundle>();
  private readonly functions: Record<string, FluentFunction> = {
    RANDOM_INDEX: ([max]) => new FluentNumber(Math.floor(Math.random() * Number(max))),
  };

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
    return Array.from(this.localeBoundles.keys());
  }

  translate(
    pattern: string,
    args?: Record<string, FluentVariable>,
    locale: LocaleString | LocaleString[] = "en-US",
  ): string {
    const locales = Array.isArray(locale) ? [...locale] : [locale];
    const bundle = this.localeBoundles.get(locales.shift()!.split("-")[0]);
    if (bundle) {
      const message = bundle.getMessage(pattern);
      if (message?.value) {
        return bundle.formatPattern(message.value, args);
      }
    }

    // Try to fallback
    if (locales.length) return this.translate(pattern, args, locales);

    this.logger.warn(new Error(`Requested pattern '${pattern}' was not found.`));
    return pattern;
  }

  t = this.translate;

  getTranslate(locale?: LocaleString | LocaleString[]) {
    return (pattern: string, args?: Record<string, FluentVariable>) => this.translate(pattern, args, locale);
  }
}
