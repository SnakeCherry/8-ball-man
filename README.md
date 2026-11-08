# 8-ball Man
A magical 8-ball that you speak to, and it finds you the best solutions based on cost, the time spent, and also your health.

We all make choices every day, but have we ever asked whether they are really the best ones we can make for our health, the time they take and what they cost? 8-ball Man listens to exactly what you say and works out what your next choices could be, weighing health, time and money. Everything runs on our own hardware, so what people say and spend never has to leave it, which matters when you are dealing with financial information.


<p align="center">
  <img src="docs/screenshots/10-home.png" alt="Home: 8-Ball Man in a retro pixel window on a night sky" width="820">
</p>

## How does it work?
Faster-Whisper model used for speech inference, then transcript passed onto Qwen 3.8 for processing. Then recommendations are provided, with links to further resources.

1. **Tell the ball** what you spend on, by voice or typing ("I get an Uber to uni every morning and a Lidl shop"). Whisper turns speech into text.
2. **Qwen prices it.** It splits the sentence into habits, finds your usual option plus two realistic alternatives, and estimates cost, time and a health score for each. If the request is too vague it asks one short question; if the amount is far too big to judge (a house) it says so instead of guessing.
3. **You get an answer first.** The saving, what it could buy you in a year, and what it does for your life expectancy, spoken back by the character (Piper on our own hardware by default; ElevenLabs only if you opt in with `VITE_USE_ELEVENLABS=1`, which sends the spoken sentence to their cloud).
4. **Say what matters this week.** Rank money, time and health with one tap each (or sliders) and the options re-order live.
5. **Pick one**, see what you gained, earn medals, and get next week's suggested swaps on the recap.

| The ball listens and answers | The full answer |
| :---: | :---: |
| <img src="docs/screenshots/04-ball-answer.png" alt="The ball page: the 8-ball says 'Walk, about £240 saved a month' with the saving, what it buys and days of life" width="400"> | <img src="docs/screenshots/05-results.png" alt="Results: the answer, your habit and useful info with a blue directions link" width="400"> |

| What matters this week | Your choice, then the recap |
| :---: | :---: |
| <img src="docs/screenshots/06-priority.png" alt="Priority screen: rank money, time and health as gold, silver and bronze" width="400"> | <img src="docs/screenshots/08-recap.png" alt="Recap: wrapped summary, tiles for money, free time and life, and next week's swaps" width="400"> |

## Features
- **Voice in, voice out.** Just speak to the magical ball.
- Breaks down your habits into its financial cost, health benefits, and impact on life
- **What it buys.** Savings are turned into things you can picture ("about 3 holidays abroad a year").
- **Time vs life chart**: Projects your life based on your actions
- **8-Ball Man reacts.** He hops and sparkles when you save, slumps when you spend more, and says a line about it.
- **Private by design**: speech recognition (Whisper), the language model (Qwen) and the voice (Piper) all run locally on our own hardware, with no cloud AI service in the loop, which is vital when dealing with customers' financial data. Presets and the browser voice still work if that hardware is unreachable. The only optional exceptions are ElevenLabs (off unless you opt in), the Google Fonts the page loads for its pixel fonts, and the links in "useful info" that you choose to open.

<p align="center">
  <img src="docs/screenshots/09-mobile-home.png" alt="Home on a phone" width="260">
</p>
