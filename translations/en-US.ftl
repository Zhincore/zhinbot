-bot-name = ZhinBot

###
### Birthdays
###

module-birthdays = Birthdays module
module-birthdays-dsc = Sends notifications about birthdays of members that saved their birthdate.

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

module-messageRating = Message rating module (WIP)
module-messageRating-dsc = Allows members to like/dislike messages to give points to their authors

cmd-like = Like this message
cmd-dislike = Dislike this message

# /rating
cmd-rating-dsc = Show rating of a member
cmd-rating-member-dsc = The member to show rating of (you if not specified)

###
### Moderator
###

module-moderator = Moderator module
module-moderator-dsc = Commands for moderation of server

# /timeout
cmd-timeout-dsc = Timeout a member for a custom amount of time
cmd-timeout-member-dsc = The member to timeout
cmd-timeout-duration-dsc = How long the timeout should last (e.g. `1h` or `30s`)
cmd-timeout-reason-dsc = Explanation why was the timeout given
cmd-timeout-announce-dsc = Whether or not the timeout should be announced

# /modconf
cmd-modconf-dsc = Change or show configuration of the moderator module
# /modconf set
cmd-modconf-set-dsc = Change configuration
cmd-modconf-set-automod-dsc = Enable/disable automod
# /modconf get
cmd-modconf-get-dsc = Show configuration

# /warn
cmd-warn-dsc = Warn a member
cmd-warn-member-dsc = The member to warn
cmd-warn-reason-dsc = The reason for the warning
# /warns
cmd-warns-dsc = Show warning given to a member
cmd-warns-member-dsc = The member to show warnings of
cmd-warns-page-dsc = Page of the warning list to show (first by default)

###
### Player
###

module-player = Music player module
module-player-dsc = Allows the bot to play music from various sources in VC

# /play
cmd-play-dsc = Play music in your voice chat
cmd-play-query-dsc = URL or name of the song to play

# /playerchannel
cmd-playerchannel-dsc = Change the channel where player sends currently playing songs
cmd-playerchannel-channel-dsc = The channel for updates

# /playing
cmd-playing-dsc = Show the currently playing song
# /pause
cmd-pause-dsc = Pause the music player
# /resume
cmd-resume-dsc = Resume paused music player
# /stop
cmd-stop-dsc = Stop playing, leave the voice chat and forget the queue
# /skip
cmd-skip-dsc = Skip the currently playing song

# /remove
cmd-remove-dsc = Remove a song at given position from the queue
cmd-remove-position-dsc = The position of the song in the queue

# /join
cmd-join-dsc = Join a voice channel

# /leave
cmd-leave-dsc = Leave the current voice chat (remember the queue for a while)

# /loop
cmd-loop-dsc = Toggle looping of the current player queue
cmd-loop-loop-dsc = Whether the queue should loop

# /queue
cmd-queue-dsc = Show the current player queue
cmd-queue-page-dsc = The page of the queue tho show (first by default)

###
### Selfroles
###

module-selfroles = Self-roles module
module-selfroles-dsc = Allow your members to give themselves roles

cmd-selfroles--item-dsc = Name of the self-roles item

# /selfroles
cmd-selfroles-dsc = Allow your members to give themselves roles
# /selfroles list
cmd-selfroles-list-dsc = Show all self-roles of the guild
# /selfroles show
cmd-selfroles-show-dsc = Show info about a self-roles item
# /selfroles create
cmd-selfroles-create-dsc = Create a new self-roles
# /selfroles delete
cmd-selfroles-delete-dsc = Delete a self-roles item
# /selfroles render
cmd-selfroles-render-dsc = Send/edit the self-roles message

# /selfroles role
cmd-selfroles-role-dsc = Edit roles of a self-roles item

# /selfroles role set
cmd-selfroles-role-set-dsc = Add or change a role
cmd-selfroles-role-set-role-dsc = The role to add/change
cmd-selfroles-role-set-emoji-dsc = Emoji to assign to the role
cmd-selfroles-role-set-description-dsc = Description of the role

# /selfroles role remove
cmd-selfroles-role-remove-dsc = Remove a role from self-roles
cmd-selfroles-role-remove-role-dsc = The role to remove

# /selfroles edit
cmd-selfroles-edit-dsc = Edit a self-roles item
cmd-selfroles-edit--dsc = Edit the '{$fieldName}' field
cmd-selfroles-edit-name-value-dsc = The name of the self-roles item (used as an id)
cmd-selfroles-edit-title-value-dsc = The title of the embed
cmd-selfroles-edit-color-value-dsc = Color of the embed (color name/hex/whatever)
cmd-selfroles-edit-message-value-dsc = Message to show above the embed
cmd-selfroles-edit-showhelp-value-dsc = Whether to show hint on how to use the self-roles
cmd-selfroles-edit-showroles-value-dsc = Whether to show list of roles in the embed
cmd-selfroles-edit-showname-value-dsc = Whether to show name (id) of the self-roles item in the embed
cmd-selfroles-edit-channel-value-dsc = The channel of the self-roled embed
cmd-selfroles-edit-description-value-dsc = Description to show in the embed
cmd-selfroles-edit-messageid-value-dsc = !Advanced! Change id of the tracked message

###
### Utils
###

module-utilities = Utilities module
module-utilities-dsc = Bot utility comands primarily for the maintainer 

# /ping
cmd-ping-dsc = Replies with "Pong!"
# /latency
cmd-latency-dsc = Measures the roundtrip latency between Discord and the bot
# /status
cmd-status-dsc = Sends some numbers about the bot
