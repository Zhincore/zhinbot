# Birthdays module

Sends notifications about birthdays of members that saved their birthdate.

## /birthday

Save your birthday or see birthdays of others

### /birthday set

Save your birthday so we can notify everyone when it comes!

#### /birthday set date

The date of your birthday. For example `16 Oct` or `16/10` or `16.10.` etc.

### /birthday get

Show birthday of yours or other member.

Options:

- `user` &ndash; User (optional) &ndash; The user to get birthday of. Yours by default.

### /birthday forget

Delete your birthday from the database

## /birthdayconf

Configure the birthday alerts

### /birthdayconf set

Update birthday module alerts

#### /birthdayconf set time

The time at which to announce birthdays. E.g. `9:00am` or `16:00`

##### /birthdayconf set time time

The time at which to announce birthdays. E.g. `9:00am` or `16:00`

#### /birthdayconf set channel

The channel in which we should announce birthdays. Nothing to disable announcements

Options:

- `channel` &ndash; Channel (optional) &ndash; The channel in which we should announce birthdays. Nothing to disable announcements

#### /birthdayconf set ping

A role to ping in each birthday annoucements. Nothing to ping noone.

Options:

- `ping` &ndash; Role (optional) &ndash; A role to ping in each birthday annoucements. Nothing to ping noone.

### /birthdayconf show

Show current birthday module settings.
