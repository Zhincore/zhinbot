# ZhinBot

Another multipurpose Discord bot.

## Installation

1. Configure secrets inside `.env`, use `.env.example` as a template
2. Optionally you can configure `config.toml`, use `config.default.toml` as a template
3. Run `pnpm install` to install dependencies
4. Run `pnpm prebuild` to setup the database
5. Run `pnpm build` to transpile the project

Run `pnpm start` to start

## Scripts

- `start` - Starts the builded bot (runnig `node .` directly is slightly more effective), use with `NODE_ENV=production` in production

### Building
- `prebuild` - Sets up database with Prisma and builds the Prisma client
- `build` - Transpiles Typescript

## Development
- `watch` - Transpiles Typescript with source maps and re-transpiles on changes
- `dev` - Start the bot in development mode (uses source maps, use concurrently with `watch`; note that you have to restart this script manually on changes to prevent hitting rate-limit from Discord)
- `dev:dry` - Start the bot in dry development mode; no transpilation, automatic restarts, but won't sign in to Discord.

- `check` - Checks source code typings with TSC
- `lint` - Lints source code with Eslint
- `format` - Formats source code with Prettier
