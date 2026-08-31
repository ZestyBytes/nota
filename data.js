window.NOTA_DATA = {
  topics: {
    gardening: { name: "Gardening", color: "#6a913b", soft: "#e8f0dc", description: "Seasons, seedlings and life outdoors" },
    music: { name: "Music", color: "#c55a35", soft: "#f8e7df", description: "Practice, listening and the guitar journey" },
    technology: { name: "Technology", color: "#168b78", soft: "#dff2ed", description: "Tools, code and thoughtful technology" },
    adhd: { name: "ADHD", color: "#7264c9", soft: "#ebe9fb", description: "Understanding attention and living well" },
    books: { name: "Books", color: "#b47716", soft: "#f5ead6", description: "Reading, marginalia and ideas worth keeping" },
    family: { name: "Family", color: "#b35472", soft: "#f6e5eb", description: "Home life and shared memories" }
  },
  entries: [
    { id:"j1", type:"Journal", title:"Staked the runner beans", excerpt:"The plants had finally reached the top of their canes. A quiet hour outside before the rain came.", topics:["gardening"], occurredAt:"2026-08-31", createdAt:"2026-08-31", publishedAt:"2026-08-31" },
    { id:"j2", type:"Journey", title:"Day 12 — the chord change", excerpt:"For the first time, the movement from G to C felt less like a calculation and more like music.", topics:["music"], occurredAt:"2026-08-31", createdAt:"2026-08-31", publishedAt:"2026-08-31" },
    { id:"n1", type:"Note", title:"A week living with Omarchy", excerpt:"Small, deliberate defaults have changed how the computer feels to use.", topics:["technology"], occurredAt:"2026-08-27", createdAt:"2026-08-27", publishedAt:"2026-08-28" },
    { id:"j3", type:"Journal", title:"The assessment letter arrived", excerpt:"Relief, recognition, and more questions than I expected.", topics:["adhd"], occurredAt:"2026-08-27", createdAt:"2026-08-27", publishedAt:"2026-08-29" },
    { id:"q1", type:"Quote", title:"Attention is the beginning of devotion.", author:"Mary Oliver", topics:["books"], occurredAt:"2026-08-24", createdAt:"2026-08-24", publishedAt:"2026-08-24" },
    { id:"n2", type:"Note", title:"First seedlings potted", excerpt:"Six basil seedlings moved into their first proper pots.", topics:["gardening"], occurredAt:"2025-08-31", createdAt:"2025-08-31", publishedAt:"2025-08-31" },
    { id:"n3", type:"Note", title:"The humane scale of small software", excerpt:"The best personal tools leave room for the person using them.", topics:["technology"], occurredAt:"2026-08-18", createdAt:"2026-08-18", publishedAt:"2026-08-18" }
  ],
  tasks: [
    { id:"t1", title:"Order more twine", topics:["gardening"], dueAt:"2026-08-31", completedAt:null },
    { id:"t2", title:"Ring NHS about follow-up", topics:["adhd"], dueAt:"2026-09-04", completedAt:null },
    { id:"t3", title:"Try the new Waybar module", topics:["technology"], dueAt:"2026-08-31", completedAt:null },
    { id:"t4", title:"Water the greenhouse", topics:["gardening"], dueAt:"2026-08-31", completedAt:"2026-08-31" }
  ],
  books: [
    { id:"b1", title:"The Anxious Generation", author:"Jonathan Haidt", status:"reading", progress:42, topics:["adhd","books"] },
    { id:"b2", title:"Meditations", author:"Marcus Aurelius", status:"finished", progress:100, topics:["books"] },
    { id:"b3", title:"Tomorrow, and Tomorrow, and Tomorrow", author:"Gabrielle Zevin", status:"want-to-read", progress:0, topics:["books"] }
  ]
};
