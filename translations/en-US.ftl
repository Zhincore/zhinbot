-bot-name = ZhinBot

###
### Birthdays
###

# /birthday
cmd-birthday-dsc = Save your birthday or see birthdays of others
# /birthday set
cmd-birthday-set-dsc = Save your birthday so we can notify everyone when it comes!
cmd-birthday-set-date-dsc = The date of your birthday. For example `16 Oct` or `16/10` or `16.10.` etc.
# /birthday get
cmd-birthday-get-dsc = Show birthday of yours or other member.
cmd-birthday-get-user-dsc = The user to get birthday of. Yours by default.
# /birthday forget
cmd-birthday-forget-dsc = Delete your birthday from the database

# /birthdayconf
cmd-birthdayconf-dsc = Configure the birthday alerts
# /birthdayconf set
cmd-birthdayconf-set-dsc = Update birthday module alerts
# /birthdayconf set time
cmd-birthdayconf-set-time-dsc = The time at which to announce birthdays. E.g. `9:00am` or `16:00`
cmd-birthdayconf-set-time-time-dsc = {cmd-birthdayconf-set-time-dsc}
# /birthdayconf set channel
cmd-birthdayconf-set-channel-dsc = The channel in which we should announce birthdays. Nothing to disable announcements
cmd-birthdayconf-set-channel-channel-dsc = {cmd-birthdayconf-set-channel-dsc}
# /birthdayconf set ping
cmd-birthdayconf-set-ping-dsc = A role to ping in each birthday annoucements. Nothing to ping noone.
cmd-birthdayconf-set-ping-ping-dsc = {cmd-birthdayconf-set-ping-dsc}
# /birthdayconf show
cmd-birthdayconf-show-dsc = Show current birthday module settings.

# Alert
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

###
### Message ratings
###

cmd-like = Like this message
cmd-dislike = Dislike this message

# /rating
cmd-rating-dsc = Show rating of a member
cmd-rating-member-dsc = The member to show rating of (you if not specified)

###
### Moderator
###

# /timeout
cmd-timeout-dsc = Timeout a member for a custom amount of time
cmd-timeout-member-dsc = The member to timeout
cmd-timeout-duration-dsc = How long the timeout should last (e.g. `1h` or `30s`)
cmd-timeout-reason-dsc = Explanation why was the timeout given
cmd-timeout-announce-dsc = Whether or not the timeout should be announced

# /modconf
cmd-modconf-dsc = Change or show configuration of the moderator module
