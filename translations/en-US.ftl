-bot-name = ZhinBot

## Birthdays

birthdays-alert-title = { RANDOM_INDEX(4) ->
  *[0] { $subjects } { $subject_count -> 
      [1] has 
      *[other] have 
    } birthday today!
  [1] { $subjects } { $subject_count -> 
      [1] has 
      *[other] have 
    } been born on this day!
  [2] A few years ago on this day { $subjects } came to life!
  [3] Birthday time!!
}
birthdays-alert-message = { RANDOM_INDEX(4) ->
  *[0] Wish { $subjects } happy birthday!
  [1] Be nice to them today
  [2] Wish them good luck!
  [3] Bake them a cake!
}
