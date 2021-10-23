export class Config {
  auth: AuthConfig = {
    discord: {
      token: process.env.DISCORD_TOKEN,
    },
  };
}

interface AuthConfig {
  discord: {
    token?: string;
  };
}
