# Islamic videos: standing rules

Always stay respectful to Islam and to all the prophets, peace be upon them.

- Prophets are never shown with a face: the face is covered by light (the glow figure). Never shown as weak, comic or in a demeaning pose.
- Honorifics: "peace be upon him" after a prophet's name, and ﷺ (or "peace and blessings be upon him") for Prophet Muhammad.
- Quran Arabic and English come from the quran-json data (Uthmani, Saheeh International), never typed by hand; every verse shows its reference.
- Hadith are quoted from authentic collections with their number. No weak narrations, no Israelite stories presented as fact.
- Names and details the Quran or authentic hadith do not give are left out; uncertain places are labelled "traditional".
- No music and no AI voice reciting Quran; the voiceover reads the English only.
- Pharaoh and other wrongdoers are shown, but Allah is never depicted in any form.

# Thumbnails: house style (chosen by the user)

Every video's thumbnail follows `thumbnails/template/thumbnail.html` (1280x720; render with `NODE_PATH=$(npm root -g) node shot.cjs thumbnail.html out.png` from that folder, then save as JPG in `out/`):

- Left: a large dark figure. A wrongdoer may have a shadowed face; a prophet is only ever the glow figure with light over the face; the Prophet Muhammad ﷺ, his family, Companions and angels are never drawn.
- Right: a two-line brush title (Permanent Marker, light grunge texture): first line white, key word red with a red underline.
- A red arrow pointing at the key detail.
- Bottom-left: three torn-paper labels that build curiosity (e.g. "HIS SIGNS… HIS LIES… HIS END…").
- Background: dramatic burning sky with a glowing planet or sun, a silhouette of the place, and a crowd at the bottom.
- Any Arabic or detail on the thumbnail must be accurate to the Quran or authentic hadith (no garbled text).

# Voiceover

- Use the ElevenLabs voice `9nQCoggz87mG7f9fAFdF` for every new video (chosen by the user; replaces `Qla8bn3D6EePM4A27KxH`). Settings: eleven_multilingual_v2, speed 1.0, stability 0.5, similarity 0.8, style 0.
