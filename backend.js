const NotedBackend = (() => {
  const config = window.NOTED_CONFIG || {};
  let client = null;
  const configured = Boolean(config.supabaseUrl && config.supabaseAnonKey);

  async function init() {
    if (!configured) return { configured: false, user: null };
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    client = createClient(config.supabaseUrl, config.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    const { data: { user } } = await client.auth.getUser();
    return { configured: true, user };
  }
  function onAuthChange(callback) {
    if (!client) return () => {};
    const { data } = client.auth.onAuthStateChange((_event, session) => callback(session?.user || null));
    return () => data.subscription.unsubscribe();
  }
  async function signIn(email, password) {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  }
  async function signUp(email, password) {
    const { data, error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}${location.pathname}` } });
    if (error) throw error;
    return data;
  }
  async function signOut() { const { error } = await client.auth.signOut(); if (error) throw error; }
  async function userId() {
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) throw error || new Error("Please sign in again.");
    return user.id;
  }
  async function loadData() {
    const uid = await userId();
    const results = await Promise.all([
      client.from("topics").select("*").eq("user_id",uid).order("name"), client.from("entries").select("*").eq("user_id",uid).order("occurred_at", { ascending: false }),
      client.from("tasks").select("*").eq("user_id",uid).order("due_at"), client.from("books").select("*").eq("user_id",uid).order("created_at"),
      client.from("book_clippings").select("*").eq("user_id",uid).order("created_at", { ascending: false })
    ]);
    const failed = results.find(result => result.error); if (failed) throw failed.error;
    const [topics, entries, tasks, books, clippings] = results.map(result => result.data);
    return {
      topics: Object.fromEntries(topics.map(row => [row.slug, { name: row.name, color: row.color, soft: row.soft, description: row.description, ...(row.mode ? { mode: row.mode } : {}) }])),
      entries: entries.map(row => ({ id: row.id, type: row.type, title: row.title, excerpt: row.body || "", author: row.author || "", topics: row.topic_slugs || [], occurredAt: row.occurred_at, createdAt: row.created_at?.slice(0,10), publishedAt: row.published_at, image: row.image_url || "", imageAlt: row.image_alt || "", attachments: row.attachments || [], recipe: row.recipe || null })),
      tasks: tasks.map(row => ({ id: row.id, title: row.title, topics: row.topic_slugs || [], dueAt: row.due_at, completedAt: row.completed_at })),
      books: books.map(row => ({ id: row.id, title: row.title, author: row.author || "", status: row.status, progress: row.progress, cover: row.cover_url || "", topics: row.topic_slugs || [], notes: clippings.filter(c => c.book_id === row.id && c.kind === "note").map(c => ({ id:c.id,text:c.text,page:c.location||"",createdAt:c.created_at?.slice(0,10) })), quotes: clippings.filter(c => c.book_id === row.id && c.kind === "quote").map(c => ({ id:c.id,text:c.text,page:c.location||"",createdAt:c.created_at?.slice(0,10) })) }))
    };
  }
  async function loadPublished() {
    const { data, error } = await client.from("entries").select("*").not("published_at","is",null).order("published_at",{ascending:false});
    if(error) throw error;
    return data.map(row=>({id:row.id,type:row.type,title:row.title,excerpt:row.body||"",author:row.author||"",topics:row.topic_slugs||[],occurredAt:row.occurred_at,publishedAt:row.published_at,image:row.image_url||"",imageAlt:row.image_alt||"",attachments:[],recipe:row.recipe||null}));
  }
  async function syncTable(table, rows, ids, uid, idColumn="id") {
    if (rows.length) { const { error } = await client.from(table).upsert(rows); if (error) throw error; }
    const { data, error } = await client.from(table).select(idColumn).eq("user_id",uid); if (error) throw error;
    const stale = data.map(x => x[idColumn]).filter(id => !ids.includes(id));
    if (stale.length) { const { error: deleteError } = await client.from(table).delete().in(idColumn, stale); if (deleteError) throw deleteError; }
  }
  async function saveData(data) {
    const uid = await userId();
    const topicRows = Object.entries(data.topics).map(([slug,x]) => ({ user_id:uid,slug,name:x.name,color:x.color,soft:x.soft,description:x.description||"",mode:x.mode||null }));
    const entryRows = data.entries.map(x => ({ id:x.id,user_id:uid,type:x.type,title:x.title,body:x.excerpt||null,author:x.author||null,topic_slugs:x.topics||[],occurred_at:x.occurredAt||null,published_at:x.publishedAt||null,image_url:x.image||null,image_alt:x.imageAlt||null,attachments:x.attachments||[],recipe:x.recipe||null }));
    const taskRows = data.tasks.map(x => ({ id:x.id,user_id:uid,title:x.title,topic_slugs:x.topics||[],due_at:x.dueAt||null,completed_at:x.completedAt||null }));
    const bookRows = data.books.map(x => ({ id:x.id,user_id:uid,title:x.title,author:x.author||null,status:x.status||"want-to-read",progress:Number(x.progress||0),cover_url:x.cover||null,topic_slugs:x.topics||[] }));
    const clippingRows = data.books.flatMap(book => [...(book.notes||[]).map(x=>({id:x.id,user_id:uid,book_id:book.id,kind:"note",text:x.text,location:x.page||null})),...(book.quotes||[]).map(x=>({id:x.id,user_id:uid,book_id:book.id,kind:"quote",text:x.text,location:x.page||null}))]);
    await syncTable("topics",topicRows,topicRows.map(x=>x.slug),uid,"slug"); await syncTable("entries",entryRows,entryRows.map(x=>x.id),uid); await syncTable("tasks",taskRows,taskRows.map(x=>x.id),uid); await syncTable("books",bookRows,bookRows.map(x=>x.id),uid); await syncTable("book_clippings",clippingRows,clippingRows.map(x=>x.id),uid);
  }
  async function upload(file) {
    const uid = await userId(), safe = file.name.replace(/[^a-zA-Z0-9._-]+/g,"-"), path = `${uid}/${crypto.randomUUID()}-${safe}`;
    const { error } = await client.storage.from("attachments").upload(path,file,{upsert:false}); if(error) throw error;
    const size = file.size < 1024 ? `${file.size} B` : file.size < 1048576 ? `${Math.round(file.size/1024)} KB` : `${(file.size/1048576).toFixed(1)} MB`;
    return { name:file.name,kind:file.name.split(".").pop()?.toUpperCase()||"FILE",size,path };
  }
  async function attachmentUrl(path) { const {data,error}=await client.storage.from("attachments").createSignedUrl(path,60); if(error) throw error; return data.signedUrl; }
  return { configured,init,onAuthChange,signIn,signUp,signOut,loadData,loadPublished,saveData,upload,attachmentUrl };
})();
window.NotedBackend = NotedBackend;
