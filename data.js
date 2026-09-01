window.NOTA_DATA = {
  topics: {
    gardening: { name: "Gardening", color: "#3f6b2e", soft: "#e4ead9", description: "Seasons, seedlings and life outdoors" },
    music: { name: "Music", color: "#a13a2e", soft: "#f0e1dd", description: "Practice, listening and the guitar journey" },
    technology: { name: "Technology", mode:"tech", color: "#1c6e63", soft: "#dbe9e6", description: "Tools, code and thoughtful technology" },
    adhd: { name: "ADHD", color: "#5b4a9e", soft: "#e5e1f2", description: "Understanding attention and living well" },
    books: { name: "Books", color: "#8a5a12", soft: "#ece0cb", description: "Reading, marginalia and ideas worth keeping" },
    family: { name: "Family", color: "#96355a", soft: "#eddce3", description: "Home life and shared memories" },
    food: { name: "Food", mode:"recipes", color: "#8a4a1a", soft: "#ecddcb", description: "Recipes, experiments and things made for the table" }
  },
  entries: [
    { id:"j1", type:"Journal", title:"Staked the runner beans", excerpt:"The plants had finally reached the top of their canes. A quiet hour outside before the rain came.", image:"https://images.pexels.com/photos/7728082/pexels-photo-7728082.jpeg?auto=compress&cs=tinysrgb&w=1200", imageAlt:"Runner bean plants growing around garden canes", attachments:[{name:"garden-plan-august.pdf",kind:"PDF",size:"1.2 MB"}], topics:["gardening"], occurredAt:"2026-08-31", createdAt:"2026-08-31", publishedAt:"2026-08-31" },
    { id:"j2", type:"Journey", title:"Day 12: the chord change", excerpt:"For the first time, the movement from G to C felt less like a calculation and more like music.", topics:["music"], occurredAt:"2026-08-31", createdAt:"2026-08-31", publishedAt:"2026-08-31" },
    { id:"n1", type:"Note", title:"A week living with Omarchy", excerpt:"Small, deliberate defaults have changed how the computer feels to use.", topics:["technology"], occurredAt:"2026-08-27", createdAt:"2026-08-27", publishedAt:"2026-08-28" },
    { id:"j3", type:"Journal", title:"The assessment letter arrived", excerpt:"Relief, recognition, and more questions than I expected.", topics:["adhd"], occurredAt:"2026-08-27", createdAt:"2026-08-27", publishedAt:"2026-08-29" },
    { id:"q1", type:"Quote", title:"Attention is the beginning of devotion.", author:"Mary Oliver", topics:["books"], occurredAt:"2026-08-24", createdAt:"2026-08-24", publishedAt:"2026-08-24" },
    { id:"n2", type:"Note", title:"First seedlings potted", excerpt:"Six basil seedlings moved into their first proper pots.", topics:["gardening"], occurredAt:"2025-08-31", createdAt:"2025-08-31", publishedAt:"2025-08-31" },
    { id:"n3", type:"Note", title:"The humane scale of small software", excerpt:"The best personal tools leave room for the person using them.", attachments:[{name:"waybar-config.json",kind:"JSON",size:"4 KB"}], topics:["technology"], occurredAt:"2026-08-18", createdAt:"2026-08-18", publishedAt:"2026-08-18" },
    { id:"r1", type:"Note", title:"Slow-roast tomato focaccia", excerpt:"A forgiving dough, tomatoes from the garden, and enough olive oil to crisp the edges.", image:"https://images.pexels.com/photos/6605214/pexels-photo-6605214.jpeg?auto=compress&cs=tinysrgb&w=1200", imageAlt:"Fresh focaccia with tomatoes and herbs", recipe:{time:"3 hours",serves:"8",difficulty:"Easy",ingredients:["500g strong flour","ripe tomatoes","sea salt","olive oil"]}, topics:["food","gardening"], occurredAt:"2026-08-21", createdAt:"2026-08-21", publishedAt:"2026-08-22" }
  ],
  tasks: [
    { id:"t1", title:"Order more twine", topics:["gardening"], dueAt:"2026-08-31", completedAt:null },
    { id:"t2", title:"Ring NHS about follow-up", topics:["adhd"], dueAt:"2026-09-04", completedAt:null },
    { id:"t3", title:"Try the new Waybar module", topics:["technology"], dueAt:"2026-08-31", completedAt:null },
    { id:"t4", title:"Water the greenhouse", topics:["gardening"], dueAt:"2026-08-31", completedAt:"2026-08-31" }
  ],
  books: [
    { id:"b1", title:"The Anxious Generation", author:"Jonathan Haidt", status:"reading", progress:42, cover:"https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=700", notes:[{id:"bn1",text:"The chapter on play connects strongly with my notes about attention.",createdAt:"2026-08-29"}], quotes:[{id:"bq1",text:"Experience, not information, is the key to emotional development.",page:"p. 83"}], topics:["adhd","books"] },
    { id:"b2", title:"Meditations", author:"Marcus Aurelius", status:"finished", progress:100, cover:"https://images.pexels.com/photos/2908984/pexels-photo-2908984.jpeg?auto=compress&cs=tinysrgb&w=700", notes:[{id:"bn2",text:"Return to Book IV when everything feels noisier than it needs to.",createdAt:"2026-07-18"}], quotes:[{id:"bq2",text:"You have power over your mind, not outside events.",page:"Book XII"}], topics:["books"] },
    { id:"b3", title:"Tomorrow, and Tomorrow, and Tomorrow", author:"Gabrielle Zevin", status:"want-to-read", progress:0, cover:"https://images.pexels.com/photos/904616/pexels-photo-904616.jpeg?auto=compress&cs=tinysrgb&w=700", notes:[], quotes:[], topics:["books"] }
  ]
};
