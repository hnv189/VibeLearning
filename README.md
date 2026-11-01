# Vibe Street

A cozy multiplayer hangout. Join a room, find a seat, chill or study while the host picks the music and street sounds.

**Rooms**
- **Night Market Corner**: a noodle cart under string lights at night.
- **Chợ Đà Lạt**: a cool highland afternoon on the plaza ledge above Đà Lạt market, with a fruit seller, pine hills and a film-photo look.
- **Quán Nhậu 1-2-3 Dzô**: a warm, dark beer place with a giant screen and 8 tables. Sit at a table and click the waiter (or your table). He comes to take your order, fetches it from the kitchen and sets it on your table. An LED board under the screen scrolls the latest orders. Dishes stay on the table for 30 minutes and everyone sees them.

## Run

```bash
npm install
npm start          # http://localhost:3000
```

Others on your network can join at `http://<your-ip>:3000`. `?join=night-market` skips the lobby.

## What's in a room

- **Walk around**: click the ground or use WASD / arrow keys. Click a stool to sit, click the cart to order food.
- **Chat & emotes**: speech bubbles over your head plus a small chat log.
- **Status**: Chilling / Studying (your character reads a book) / AFK.
- **Host controls**: the first person in a room is host (👑). They choose the music and which street sounds play for everyone, and can hand host to someone else. Each person controls their own volume.
- **Focus timer**: a personal Pomodoro timer that sets you to Studying during focus blocks.

## Sound

Everything is synthesized live with the Web Audio API in `public/js/audio.js`, so no audio assets are needed:

- Street sounds: sizzling grill, chatter and clinking bowls, passing scooters and horns, rain, crickets, birdsong, wind in the pines, cheers and clinking glasses
- Music: Lo-fi Night Beats, Late Night Jazz, Rainy Piano, Neon Bossa, Highland Acoustic, Bolero Đêm (generative, never loops the same)

To use real recordings, put music files in `public/audio/` and they show up in the host's music menu.

### YouTube

The host can paste any YouTube link (videos, live streams, Shorts, music.youtube.com) into **Vibe → YouTube**, or click the wall TV above the cart. The video plays on that TV for everyone, synced to the host's start time, so late joiners skip ahead to where the room is. Videos loop when they end. The ⤢ button under the TV switches to a big centered screen; Esc goes back.

- The video stays visible on the TV because YouTube's terms don't allow hiding the player or pulling out only the audio. On small windows the TV is smaller than YouTube's 200×200 px guideline, so use the big-screen view there.
- Some videos block embedding, and ads may play. The app shows a message when a video can't play.
- The Music volume slider controls the YouTube volume too.

## Code map

| File | What it does |
| --- | --- |
| `server.js` | Express + Socket.IO; rooms (scene, menu, default sounds), players, host, settings |
| `public/js/scene.js` | Shared drawing (characters, props, TV screen, rain, name tags) + the night-market scene |
| `public/js/dalat.js` | The Chợ Đà Lạt scene |
| `public/js/nhau.js` | The quán nhậu scene: tables, waiter, LED order ticker |
| `public/js/audio.js` | Ambience layers and the music sequencer |
| `public/js/youtube.js` | YouTube link parsing and the synced IFrame player |
| `public/js/main.js` | Lobby, networking, input, panels, focus timer |

To add a room, add a `createRoom({...})` call in `server.js`. To give it its own look, write a scene class that extends `BaseScene` (see `dalat.js`) and register it in `SCENES` in `main.js`.
