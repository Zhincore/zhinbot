import Winston from "winston";
import Journald from "winston-journald3";
import chalk from "chalk";

const levelColors: LevelColors = {
  error: {
    level: chalk.red,
    message: chalk.redBright,
  },
  warn: {
    level: chalk.yellowBright,
    message: chalk.yellow,
  },
  http: {
    message: chalk.cyan,
  },
  info: {
    level: chalk.cyanBright,
    message: chalk.whiteBright,
  },
  silly: {
    message: chalk.blueBright,
  },
  verbose: {
    message: chalk.white, // it's grayish actually
  },
  debug: {
    message: chalk.gray,
  },
};

export function getLogger(serviceName?: string) {
  const isProd = process.env.NODE_ENV === "production";

  const logger = Winston.createLogger({
    level: isProd ? "info" : "debug",
    levels: Winston.config.npm.levels,
    defaultMeta: {
      module: undefined,
    },
    format: Winston.format.combine(Winston.format.splat(), Winston.format.printf(printfTemplateFunction)),
    transports: [
      new Winston.transports.Console({
        handleExceptions: true,
      }),
    ],
  });

  if (isProd && serviceName) logger.add(new Journald({ identifier: serviceName }));

  return logger;
}

const maxLevelLength = Math.max(...Object.keys(Winston.config.npm.levels).map((l) => l.length));

function printfTemplateFunction(info: Winston.Logform.TransformableInfo) {
  const prefix = info.module ? `[${info.module}]` : "";

  let level = info.level.toUpperCase().padEnd(maxLevelLength, " ");
  let message = `${prefix} ${info.message}`;

  const colors = levelColors[info.level];
  if (colors) {
    if (colors.level) level = colors.level(level);
    if (colors.message) message = colors.message(message);
  }

  return `${level} ${message}`;
}

type LevelColors = {
  [level in keyof typeof Winston.config.npm.levels]?: { message?: chalk.Chalk; level?: chalk.Chalk };
};
