// All portfolio content lives here. Edit this file to update the site —
// index.html and the js/ files never need to change for content updates.
//
// To edit without redeploying, put the content in a JSON file online (e.g. a GitHub Gist, see the
// README) and set `contentUrl` to its raw link. The site then loads that file, and everything below
// is only the fallback for when it can't be reached.

window.PORTFOLIO = {
  contentUrl: "",
  name: "KLST",
  nickname: "Surya", // used in the greeting bubble, the hologram and the logo
  callsign: "KLST", // the hero headline, the navbar logo (klst.dev) and the favicon; remove it to use your name instead
  role: "Software Engineer · Problem Solver",
  tagline:
    "I build fast, user-friendly web and mobile apps. Today that means warehouse software used by logistics teams every day; after hours it's side projects in Next.js, Flutter and applied AI.",
  location: "Bengaluru, India",
  email: "klsteja1612@gmail.com",
  resumeUrl: "https://drive.google.com/file/d/1wBo9MGDLlQtSGu6s__LVLFacsGXmc8cf/view?usp=sharing",
  socials: {
    github: "https://github.com/k-surya-teja",
    linkedin: "https://www.linkedin.com/in/klsteja/",
    twitter: "",
  },

  about: [
    "Hi, I'm Surya Teja, a software engineer at Shipsy in Bengaluru. I build enterprise warehouse management apps for web and mobile with Angular and Ionic, and I've shipped 330+ production features and fixes across scanning, picking, packing, shipment tracking and configuration workflows.",
    "I care about apps that feel fast on real hardware: I cut a frontend bundle by ~85% (70 KB → 10 KB gzipped) and tuned rendering for low-bandwidth warehouse devices. Next I want to go deeper on frontend architecture, master the full stack and, someday, lead a team.",
  ],

  skills: {
    Frontend: ["Angular", "Next.js", "React", "PrimeNG", "PrimeFlex", "Tailwind CSS"],
    Languages: ["TypeScript", "JavaScript", "Python", "Dart", "SQL"],
    "Mobile": ["Ionic", "Flutter", "React Native / Expo"],
    Backend: ["Node.js", "Express", "Prisma", "PostgreSQL", "MongoDB"],
    "Cloud & AI": ["Supabase", "Firebase", "Vercel", "Docker", "Gemini", "Groq", "Cloud Computing (certified)"],
    Spoken: ["Telugu", "Hindi", "English"],
  },

  // Rendered as levels, highest (current) first and highlighted; scrolling walks back through the rest.
  // `sideQuest` entries ride along with a level.
  experience: [
    {
      level: 1,
      company: "Shipsy",
      title: "SDE Intern",
      period: "May 2024 – Apr 2025 · Bengaluru",
      points: [
        "Shipped 80+ production features across warehouse web and mobile apps.",
        "Redesigned high-frequency scanning and packing screens used in daily warehouse operations.",
        "Removed unused frontend dependencies and cleaned up code to improve load performance.",
        "Worked with senior engineers to debug production issues and support enterprise feature rollouts.",
      ],
    },
    {
      level: 1,
      sideQuest: true,
      company: "RGUKT RK Valley",
      title: "Software Development Mentor",
      period: "Apr 2024 – Mar 2025 · Vempalle",
      points: [
        "Mentored student developers one-on-one and reviewed their code and projects.",
        "Helped with resumes, interview prep and job search, and helped build course material.",
      ],
    },
    {
      level: 2,
      company: "Shipsy",
      title: "Software Engineer",
      period: "May 2025 – Apr 2026 · Bengaluru",
      points: [
        "Delivered 250+ production tickets and feature enhancements across enterprise WMS web and mobile apps used by multiple logistics clients.",
        "Built warehouse workflow modules for scanning, picking, packing, shipment tracking and cluster configuration in Angular and Ionic.",
        "Cut the frontend bundle by ~85% (70 KB → 10 KB gzip) by replacing heavy Lodash imports with tree-shakeable utilities.",
        "Optimised Angular change detection on high-frequency warehouse screens, improving responsiveness on low-bandwidth devices.",
        "Replaced nested iteration in large configuration lookups with map-based access, removing UI lag in high-volume workflows.",
        "Built an AI-powered label generation module that creates custom warehouse and shipping labels from user-defined configurations.",
        "Resolved production issues in order-picking workflows, improving reliability across client deployments.",
      ],
    },
    {
      level: 3,
      company: "Shipsy",
      title: "Software Engineer 1",
      period: "May 2026 – Present · Bengaluru",
      points: [
        "Promoted after a year of shipping across the enterprise WMS web and mobile apps.",
        "Own warehouse workflow modules end to end (scanning, picking, packing and shipment tracking) in Angular and Ionic, from requirements to production rollout.",
        "Lead frontend performance work on high-frequency warehouse screens, keeping bundles lean and rendering fast on low-bandwidth handheld devices.",
        "Extend the AI-powered label generation module that builds custom warehouse and shipping labels from user-defined configurations.",
        "Triage and fix production issues in order-picking workflows, keeping deployments reliable across multiple logistics clients.",
      ],
    },
  ],

  education: [
    { school: "RGUKT RK Valley", degree: "B.Tech, Computer Science", period: "2021 – 2025" },
    { school: "RGUKT RK Valley", degree: "Pre-University Course, MPC", period: "2019 – 2021" },
  ],

  // The last stop, Pluto. Each one shows as a numbered entry with a short line underneath.
  interests: [
    { name: "Coding", note: "Even off the clock: side projects in Next.js, Flutter and applied AI." },
    { name: "Basketball", note: "My favourite way to get away from the screen." },
    { name: "Movies", note: "Always up for a good story, on any screen." },
    { name: "Sudoku", note: "A quiet logic puzzle to reset between problems." },
    { name: "Chess", note: "Thinking a few moves ahead, on the board and off it." },
    { name: "Space", note: "Hence this portfolio: a trip from Earth out to Pluto." },
  ],

  projects: [
    {
      name: "GST Copilot",
      featured: true,
      description:
        "A resilience and reconciliation layer in front of India's GST portal. Filings go into a durable queue with retries during portal outages, a public status page tracks incidents, and a reconciliation engine matches GSTR-2B against returns to surface ITC at risk.",
      stack: ["Next.js 16", "TypeScript", "PostgreSQL", "Prisma", "Tailwind", "shadcn/ui"],
      github: "",
      live: "",
    },
    {
      name: "SkillBias",
      featured: true,
      description:
        "An AI-powered applicant tracking system. Companies post a job, share a public apply link, and every submitted resume is parsed and scored automatically against the job's requirements.",
      stack: ["Next.js", "React 19", "Supabase", "Groq", "Python", "Docker"],
      github: "https://github.com/k-surya-teja/skillbias",
      live: "https://skillbias.netlify.app/",
    },
    {
      name: "Flexiple Sourcing",
      featured: true,
      description:
        "A recruiter describes a role in plain English. The app turns it into objective filters and a fit rubric, scores candidates with an LLM, and lets the recruiter argue with the results, showing exactly what changed and why.",
      stack: ["Next.js", "TypeScript", "Zod", "LLMs"],
      github: "https://github.com/k-surya-teja/flexiple-sourcing",
      live: "https://flexiple-sourcing.netlify.app/",
    },
    {
      name: "Otply",
      description:
        "Forwards a matched OTP SMS from a trusted, approved connection's phone to yours as a notification. Supports multiple connections per user, each needing explicit one-time approval.",
      stack: ["Flutter", "Firebase", "Cloud Functions", "Firestore"],
      github: "",
      live: "",
    },
    {
      name: "Weather Hub",
      description:
        "A multi-page weather site: search any city for current conditions and the daily forecast (temperature, wind, humidity and UV) from the Foreca API on RapidAPI, with a map link, an interactive slider, an FAQ page and a PHP feedback form.",
      stack: ["JavaScript", "HTML", "CSS", "PHP", "RapidAPI"],
      github: "https://github.com/k-surya-teja/WeatherHub",
      // The GitHub Pages copy (k-surya-teja.github.io/WeatherHub/home.html) still has a placeholder API key,
      // so it can't load weather. Add it here once a working key is deployed.
      live: "https://weatherhub-528.netlify.app/",
    },
    {
      name: "Splash",
      description:
        "An AI-powered video discovery app. Describe what you want to watch in plain English; Gemini rewrites it into the right YouTube query and generates instant video summaries.",
      stack: ["React", "Firebase Auth", "Gemini", "Material UI"],
      github: "https://github.com/k-surya-teja/splash",
      live: "https://splashbysurya.netlify.app/",
    },
    {
      name: "Tech Tools",
      description:
        "A hub of software tools with download links, installation guides and tutorials, plus search and page navigation.",
      stack: ["React"],
      github: "https://github.com/k-surya-teja/Tech-Tools",
      live: "https://techtoolsbysurya.netlify.app/",
    },
    {
      name: "Love Analyzer",
      description: "A playful web app that scores compatibility between two names using the classic FLAMES logic.",
      stack: ["JavaScript", "HTML", "CSS"],
      github: "https://github.com/k-surya-teja/love-analyzer",
      live: "https://loveanalyzer.netlify.app/",
    },
  ],
};
