import type { WeeklyLesson } from "./types";

// Deterministic illustrative fixture. This is NOT live lesson data; every
// surface that shows it must carry the "Illustrative — not current official
// lesson" label until a validated live source exists.
export const ILLUSTRATIVE_LABEL = "Illustrative — not current official lesson";

export const DISCLAIMER =
  "Independent study tool · Not affiliated with or endorsed by The Church of Jesus Christ of Latter-day Saints · Official sources prioritized";

export const PRIVATE_MICROCOPY = "Private · stays on this device · not uploaded or shared";

export const ILLUSTRATIVE_LESSON: WeeklyLesson = {
  id: "illustrative-alma-5-7",
  illustrative: true,
  title: "Alma 5–7: “Have Ye Experienced This Mighty Change of Heart?”",
  weekLabel: "Illustrative week",
  coreTruth:
    "Through the Atonement of Jesus Christ, hearts can be changed and souls made new.",
  connectionToChrist:
    "Alma invites everyone to look to Jesus Christ, be born again, and take His image into their countenance.",
  classContext: "Sunday class · about 40 minutes · mixed ages and backgrounds",
  officialSources: [
    {
      label: "Come, Follow Me — churchofjesuschrist.org",
      url: "https://www.churchofjesuschrist.org/study/come-follow-me"
    },
    {
      label: "Alma 5 — Book of Mormon",
      url: "https://www.churchofjesuschrist.org/study/scriptures/bofm/alma/5"
    },
    {
      label: "Alma 7 — Book of Mormon",
      url: "https://www.churchofjesuschrist.org/study/scriptures/bofm/alma/7"
    }
  ],
  scriptureAnchors: ["Alma 5:14", "Alma 5:26", "Alma 7:11–13"],
  suggestedBlocks: [
    {
      kind: "opening",
      title: "Opening thought",
      body: "Invite the class to think of a time their feelings toward God changed, even a little.",
      scriptureRefs: [],
      quietClassBackup: "Read Alma 5:14 together silently, then invite one voluntary observation."
    },
    {
      kind: "scripture",
      title: "Scripture anchor",
      body: "“Have ye received his image in your countenances? Have ye experienced this mighty change in your hearts?”",
      scriptureRefs: ["Alma 5:14"]
    },
    {
      kind: "discussion",
      title: "Discussion",
      body: "What helps a change of heart begin? What keeps it alive over time?",
      scriptureRefs: ["Alma 5:26"],
      quietClassBackup: "Invite the class to ponder silently, then share one word that describes a changed heart."
    },
    {
      kind: "explanation",
      title: "Context help (optional)",
      body: "Alma the Younger speaks from his own experience of conversion; he is asking questions he has lived.",
      scriptureRefs: ["Alma 5:12–13"]
    },
    {
      kind: "application",
      title: "Application invitation",
      body: "Consider one small thing to do this week that lets the Savior soften your heart.",
      scriptureRefs: ["Alma 7:11–13"]
    },
    {
      kind: "testimony-bridge",
      title: "Testimony bridge (structure only)",
      body: "Space for the teacher's own words about Jesus Christ, if moved to share. Nothing is written for you.",
      scriptureRefs: []
    }
  ],
  learnMore: [
    {
      label: "Book of Mormon Student Manual — Alma 5",
      url: "https://www.churchofjesuschrist.org/study/manual/book-of-mormon-student-manual",
      origin: "Church study manual (contextual)"
    },
    {
      label: "Guide to the Scriptures — Conversion",
      url: "https://www.churchofjesuschrist.org/study/scriptures/gs/conversion",
      origin: "Church study help (contextual)"
    }
  ]
};
