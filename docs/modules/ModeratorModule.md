# ModeratorModule

## /timeout

Timeout a member for a custom amount of time

Options:

- `member` &ndash; User (required) &ndash; The member to timeout
- `duration` &ndash; String (required) &ndash; How long the timeout should last (e.g. `1h` or `30s`)
- `reason` &ndash; String (optional) &ndash; Explanation why was the timeout given
- `announce` &ndash; Boolean (optional) &ndash; Whether or not the timeout should be announced

## /modconf

Change or show configuration of the moderator module

### /modconf set

Change configuration

Options:

- `automod` &ndash; Boolean (optional) &ndash; Enable/disable automod

### /modconf get

Show configuration


## /warn

Warn a member

Options:

- `member` &ndash; User (required) &ndash; The member to warn
- `reason` &ndash; String (required) &ndash; The reason for the warning

## /warns

Show warning given to a member

Options:

- `member` &ndash; User (required) &ndash; The member to show warnings of
- `page` &ndash; Integer (optional) &ndash; Page of the warning list to show (first by default)

