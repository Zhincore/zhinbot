import Winston from "winston";
import Journald from "winston-journald3";
import chalk, { Chalk } from "chalk";

const levelColors: LevelColors = {
  error: {
    level: chalk.red.bold,
    message: chalk.redBright,
  },
  warn: {
    level: chalk.yellowBright.bold,
    message: chalk.yellow,
  },
  http: {
    message: chalk.cyanBright,
  },
  info: {
    level: chalk.greenBright,
    message: chalk.whiteBright,
  },
  verbose: {
    message: chalk.white, // it's grayish actually
  },
  debug: {
    message: chalk.gray,
  },
  silly: {
    message: chalk.gray,
  },
};

export function getLogger(journalServiceName?: string) {
  const isProd = process.env.NODE_ENV === "production";

  const logger = Winston.createLogger({
    level: process.env.LOG_LEVEL ?? (isProd ? "info" : "debug"),
    levels: Winston.config.npm.levels,
    defaultMeta: {},
    format: Winston.format.combine(
      Winston.format.errors({ stack: true }),
      Winston.format.splat(),
      Winston.format.printf(printfTemplateFunction),
    ),
    transports: [
      new Winston.transports.Console({
        handleExceptions: true,
      }),
    ],
  });

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore: Validator cannot be instantiated or something, dunno what happened
  if (isProd && journalServiceName) logger.add(new Journald({ identifier: journalServiceName }));

  return logger;
}

const maxLevelLength = Math.max(...Object.keys(Winston.config.npm.levels).map((l) => l.length));

function printfTemplateFunction(info: Winston.Logform.TransformableInfo) {
  const prefix = info.module ? `[${info.module}]` : "";
  const msg = info.message.trim().split("\n");

  let level = info.level.toUpperCase().padEnd(maxLevelLength, " ");
  let message = `${prefix} ${[msg.shift(), ...msg.map((v: string) => " ".repeat(level.length) + v)].join("\n")}`;

  const colors = levelColors[info.level];
  if (colors) {
    if (colors.level) level = colors.level(level);
    if (colors.message) message = colors.message(message);
  }

  return `${level} ${message}`;
}

type LevelColors = {
  [level in keyof typeof Winston.config.npm.levels]?: { message?: Chalk; level?: Chalk };
};
