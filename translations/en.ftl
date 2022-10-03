-bot-name = ZhinBot

## Birthdays

birthdays-alert-title = { RANDOM_INDEX(4) ->
  *[0] { $subject } has birthday today!
  [1] { $subject } has been born on this day!
  [2] A few years ago on this day { $subject } came to life!
  [3] Today marks an anniversay of { $subject }'s existence!
}
birthdays-alert-message = { RANDOM_INDEX(4) ->
  *[0] Wish them happy bithday!
  [1] Be nice to them today
  [2] Wish them good luck!
  [3] Bake them a cake!
}
