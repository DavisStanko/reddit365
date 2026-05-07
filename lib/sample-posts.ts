export interface Post {
  id: number;
  title: string;
  subreddit: string;
  author: string;
  time: string;
  score: string;
  comments: number;
  body: string;
  imageUrl?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  permalink?: string;
}

export interface RedditComment {
  id: string;
  author: string;
  time: string;
  score: string;
  body: string;
  replies?: RedditComment[];
}

export const SAMPLE_COMMENTS: Record<string, RedditComment[]> = {
  "/r/science/comments/1": [
    {
      id: "sci_1",
      author: "space_nerd",
      time: "2h",
      score: "4.2k",
      body: "It's absolutely mind-blowing that we are looking at light that left its source 4.6 billion years ago. That's before the Earth was even formed.",
      replies: [
        {
          id: "sci_1_1",
          author: "astro_phys_guy",
          time: "1h",
          score: "1.8k",
          body: "Even crazier is that due to the expansion of the universe, the galaxies in this image are now over 13 billion light-years away from us.",
        }
      ]
    },
    {
      id: "sci_2",
      author: "optic_tech",
      time: "3h",
      score: "2.1k",
      body: "The amount of engineering that went into making the NIRCam work perfectly after surviving a rocket launch and journey to L2 is arguably mankind's greatest technical achievement.",
    }
  ],
  "/r/AskReddit/comments/2": [
    {
      id: "ask_1",
      author: "keyboard_warrior",
      time: "4h",
      score: "8.9k",
      body: "Learning keyboard shortcuts! Not just Ctrl+C/V, but things like Ctrl+Shift+T to reopen closed tabs, or Alt+Tab. Watching someone navigate a computer without touching the mouse always looks like magic.",
    },
    {
      id: "ask_2",
      author: "handy_andy",
      time: "3h",
      score: "6.5k",
      body: "Basic troubleshooting. 'Did you turn it off and on again?' solves like 80% of problems.",
    }
  ],
  "/r/todayilearned/comments/3": [
    {
      id: "til_1",
      author: "sweet_tooth",
      time: "6h",
      score: "5.1k",
      body: "So you're telling me I could literally spread 3000 year old Pharaoh honey on my toast and be completely fine?",
      replies: [
        {
          id: "til_1_1",
          author: "history_dork",
          time: "5h",
          score: "3.2k",
          body: "Yes, though they typically wouldn't eat it out of respect for the artifacts. But chemically speaking, perfectly safe.",
        }
      ]
    }
  ],
  "/r/programming/comments/4": [
    {
      id: "prog_1",
      author: "senior_dev",
      time: "1h",
      score: "2.4k",
      body: "Congratulations! That first deployment is a feeling you never forget. Welcome to the club.",
    },
    {
      id: "prog_2",
      author: "learner_404",
      time: "2h",
      score: "1.1k",
      body: "How long did it take you to get comfortable with React? I've been struggling with useEffect for weeks.",
    }
  ],
  "/r/funny/comments/6": [
    {
      id: "fun_1",
      author: "dog_lover",
      time: "45m",
      score: "12.4k",
      body: "You need to get a decoy keyboard. It's the only way.",
      replies: [
        {
          id: "fun_1_1",
          author: "cat_person_99",
          time: "30m",
          score: "8.2k",
          body: "I tried! She knows. She somehow knows which one has the heat from the laptop battery.",
        }
      ]
    }
  ]
};

export const SAMPLE_POSTS: Post[] = [
  {
    id: 1,
    title:
      "The James Webb Space Telescope just captured the deepest infrared image of the universe ever taken",
    subreddit: "r/science",
    author: "astro_news",
    time: "3h",
    score: "24.5k",
    comments: 1847,
    body: `NASA has released the deepest and sharpest infrared image of the distant universe to date, captured by the James Webb Space Telescope. Known as Webb's First Deep Field, the image shows the galaxy cluster SMACS 0723 as it appeared 4.6 billion years ago.

The combined mass of this galaxy cluster acts as a gravitational lens, magnifying much more distant galaxies behind it. Webb's NIRCam has brought those distant galaxies into sharp focus — they have tiny, faint structures that have never been seen before, including star clusters and diffuse features.

Researchers say this image covers a patch of sky approximately the size of a grain of sand held at arm's length by someone on the ground — and yet it reveals thousands of galaxies, some of the faintest objects ever observed in infrared.

The telescope's ability to peer back in time is giving astronomers unprecedented insight into the earliest stages of galaxy formation, just a few hundred million years after the Big Bang.`,
    imageUrl: "/images/webb_deep_field.png",
    permalink: "/r/science/comments/1",
  },
  {
    id: 2,
    title:
      "What's a skill that's relatively easy to learn but makes you seem much more competent?",
    subreddit: "r/AskReddit",
    author: "curious_mind",
    time: "5h",
    score: "18.2k",
    comments: 3421,
    body: `I'll start with mine: learning to type properly. I switched from hunt-and-peck to touch typing a few years ago and it's been a game changer. Not only do I actually work faster, but people always seem impressed when they see someone typing without looking at the keyboard.

Some other ones I've gathered from friends:

**Basic Excel/Spreadsheet skills** — knowing VLOOKUP, pivot tables, and basic formulas will make you look like a wizard in most office environments.

**Public speaking** — even just learning to pause instead of saying "um" and making eye contact makes a huge difference. Toastmasters is free.

**Cooking 3-4 solid meals** — you don't need to be a chef. Just knowing how to properly cook a steak, make a good pasta sauce, and bake something simple goes a long way.

**Basic sewing** — being able to fix a button or hem pants takes 10 minutes to learn and saves you trips to the tailor.

What are yours?`,
    permalink: "/r/AskReddit/comments/2",
  },
  {
    id: 3,
    title:
      "TIL that honey never spoils. Archaeologists have found 3000 year old honey in Egyptian tombs that was still edible.",
    subreddit: "r/todayilearned",
    author: "history_buff",
    time: "7h",
    score: "12.1k",
    comments: 892,
    body: `Honey is the only natural food that is made without destroying any kind of life. It's also the only food that never spoils.

The reason honey doesn't spoil comes down to its chemistry. Honey is extremely low in moisture and very high in sugar, which means that bacteria and microorganisms can't grow in it. Additionally, honey is quite acidic (its pH is between 3 and 4.5), and this acidity kills off almost anything that tries to grow in it.

Bees also add an enzyme called glucose oxidase to honey, which produces hydrogen peroxide — a natural antiseptic. This is why honey has been used medicinally for thousands of years to treat wounds and burns.

When archaeologists found 3,000-year-old honey in Egyptian tombs, they found it was perfectly preserved and still edible. The honey had crystallized, but once warmed, it was as good as fresh.

Source: National Geographic, Smithsonian Magazine`,
    imageUrl: "/images/honey_jar.png",
    permalink: "/r/todayilearned/comments/3",
  },
  {
    id: 4,
    title:
      "After 6 months of learning, I finally deployed my first full-stack app!",
    subreddit: "r/programming",
    author: "newdev2024",
    time: "2h",
    score: "8.4k",
    comments: 567,
    body: `I just want to share my excitement with this community. Six months ago I couldn't write a single line of code. Today, I deployed my first full-stack application!

**Tech Stack:**
- Frontend: React with TypeScript
- Backend: Node.js with Express
- Database: PostgreSQL
- Hosting: Railway + Vercel

**What I built:** A recipe management app where users can save, organize, and share recipes. It has authentication, image uploads, search, and a favorites system.

**What I learned:**
1. Start with the basics and don't skip them
2. Build projects, not just tutorials
3. Git is your best friend — I lost work twice before properly learning it
4. Reading documentation > watching videos (controversial, I know)
5. The imposter syndrome never fully goes away, but it gets quieter

The app isn't perfect — the code could be cleaner and there are definitely bugs I haven't found yet. But it works, it's deployed, and I'm proud of it.

Happy to answer any questions from fellow beginners!`,
    permalink: "/r/programming/comments/4",
  },
  {
    id: 5,
    title:
      "The new Battery Technology that could charge your phone in 5 minutes",
    subreddit: "r/technology",
    author: "tech_insider",
    time: "4h",
    score: "6.7k",
    comments: 423,
    body: `Researchers at a major university have developed a new type of lithium-ion battery that can charge to 80% capacity in just 5 minutes, potentially revolutionizing how we use electronic devices.

The breakthrough uses a novel electrode architecture made from specially designed carbon nanotubes that allow lithium ions to move much faster than in conventional batteries. The key innovation is in the anode design, which creates "highways" for ions instead of the typical winding paths.

**Key specs:**
- 80% charge in 5 minutes
- 90% charge in 8 minutes
- Full charge in 12 minutes
- Retains 90% capacity after 2,000 charge cycles
- Works at temperatures from -20°C to 60°C

The researchers say the manufacturing process is compatible with existing battery production lines, which means this technology could be commercially viable within 2-3 years.

However, the big caveat is that you'd need a much more powerful charger — standard USB-C chargers wouldn't deliver enough power for these speeds. We'd need new charging infrastructure.`,
    permalink: "/r/technology/comments/5",
  },
  {
    id: 6,
    title:
      "My cat decided that my keyboard is the perfect bed. Every. Single. Day.",
    subreddit: "r/funny",
    author: "cat_person_99",
    time: "1h",
    score: "31.2k",
    comments: 2103,
    body: `I work from home and my cat has decided that out of all the comfortable surfaces in this house — the couch, the bed, the cat tree I spent $200 on — my keyboard is the ideal napping spot.

At first I thought it was cute. Then she started joining important Zoom calls. My manager has seen more of my cat than my actual work this quarter.

I've tried:
- A decoy keyboard (she knows)
- A heated pad next to my desk (she ignores it)
- Closing the door (the screaming, oh the screaming)
- Putting her favorite blanket on the desk (she pushes it off)

The worst part? She only does this when I'm actively working. If I step away, she leaves. The moment I sit back down? Flop, right on the keyboard.

Yesterday she managed to send a half-written Slack message to my entire team that just said "asdkjf;laskdjf;alskdfj cat here, taking over." I didn't even try to explain.

I've accepted my fate. This is her desk now. I just work here.`,
    imageUrl: "/images/cat_on_keyboard.png",
    permalink: "/r/funny/comments/6",
  },
  {
    id: 7,
    title:
      "Scientists discover high levels of microplastics in cloud water for first time",
    subreddit: "r/worldnews",
    author: "env_watch",
    time: "6h",
    score: "15.8k",
    comments: 1205,
    body: `A team of researchers has for the first time detected significant concentrations of microplastics in cloud water collected from mountain peaks, raising new concerns about the global reach of plastic pollution.

The study, published in a peer-reviewed journal, found that cloud water samples contained between 6.7 to 13.9 pieces of microplastics per liter. Nine different types of polymers were identified, with polyethylene being the most common.

The researchers suggest that microplastics in clouds could be affecting climate patterns by acting as "cloud condensation nuclei" — tiny particles around which water droplets form. This could potentially influence precipitation patterns and solar radiation absorption.

"If cloud formation is being affected by microplastic pollution, the consequences for the climate could be significant," said the lead researcher.

The findings add to growing evidence that microplastic pollution has reached virtually every corner of the planet, from the deepest ocean trenches to the highest mountain peaks, and now the very clouds above us.`,
    permalink: "/r/worldnews/comments/7",
  },
  {
    id: 8,
    title: "What movie do you consider a 10/10?",
    subreddit: "r/movies",
    author: "cinephile",
    time: "8h",
    score: "9.3k",
    comments: 4521,
    body: `For me, it's got to be **The Shawshank Redemption** (1994).

Everything about this film is perfect — the acting from Tim Robbins and Morgan Freeman, the pacing that never feels rushed despite being 2.5 hours, the cinematography by Roger Deakins, and Thomas Newman's incredible score.

But what really elevates it is the theme of hope. In a story set primarily in a prison, the film manages to be one of the most uplifting and hopeful movies ever made. Andy Dufresne's quiet determination and Red's eventual redemption never fail to move me.

The ending — "I hope the Pacific is as blue as it has been in my dreams" — gives me chills every single time.

It's one of those rare films where every element comes together perfectly. Not a single wasted scene.

**Honorable mentions:**
- Spirited Away (2001)
- The Godfather (1972)
- Parasite (2019)
- The Lord of the Rings: Return of the King (2003)
- Interstellar (2014)

What are your 10/10 movies?`,
    permalink: "/r/movies/comments/8",
  },
];
