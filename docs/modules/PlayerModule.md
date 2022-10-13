# PlayerModule

## /play

Play music in your voice chat

Options:

- `query` &ndash; String (optional) &ndash; URL or name of the song to play

## /playerchannel

Change the channel where player sends currently playing songs

Options:

- `channel` &ndash; Channel (optional) &ndash; The channel for updates

## /playing

Show the currently playing song

## /pause

Pause the music player

## /resume

Resume paused music player

## /stop

Stop playing, leave the voice chat and forget the queue

## /skip

Skip the currently playing song

## /remove

Remove a song at given position from the queue

Options:

- `position` &ndash; Integer (required) &ndash; The position of the song in the queue

## /join

Join a voice channel

## /leave

Leave the current voice chat (remember the queue for a while)

## /loop

Toggle looping of the current player queue

Options:

- `loop` &ndash; Boolean (optional) &ndash; Whether the queue should loop

## /queue

Show the current player queue

Options:

- `page` &ndash; Integer (optional) &ndash; The page of the queue tho show (first by default)

