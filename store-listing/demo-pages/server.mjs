import { createServer } from "node:http";

const host = "127.0.0.1";

const demos = [
  {
    port: 4311,
    key: "inbox",
    symbol: "M",
    title: "Morning Mail",
    section: "Inbox",
    accent: "#4f7cff",
    accentSoft: "#e9efff",
    content: `
      <div class="toolbar">
        <div>
          <span class="eyebrow">INBOX</span>
          <h1>Good morning, Alex</h1>
          <p class="lede">Three messages need your attention today.</p>
        </div>
        <button>Compose</button>
      </div>
      <section class="mail-list">
        <article class="mail unread">
          <span class="avatar blue">JL</span>
          <div><strong>Jordan Lee</strong><p>Final review for the launch brief</p></div>
          <time>9:42 AM</time>
        </article>
        <article class="mail unread">
          <span class="avatar violet">MK</span>
          <div><strong>Mina Kim</strong><p>Design system notes and next steps</p></div>
          <time>8:18 AM</time>
        </article>
        <article class="mail">
          <span class="avatar coral">TC</span>
          <div><strong>Team Calendar</strong><p>Weekly planning starts in 30 minutes</p></div>
          <time>Yesterday</time>
        </article>
        <article class="mail">
          <span class="avatar green">AR</span>
          <div><strong>Activity Report</strong><p>Your workspace summary is ready</p></div>
          <time>Yesterday</time>
        </article>
      </section>
    `,
  },
  {
    port: 4312,
    key: "board",
    symbol: "B",
    title: "Launch Board",
    section: "Projects",
    accent: "#805ad5",
    accentSoft: "#f0eaff",
    content: `
      <div class="toolbar">
        <div>
          <span class="eyebrow">PROJECT BOARD</span>
          <h1>Extension launch</h1>
          <p class="lede">A clear path from final checks to launch day.</p>
        </div>
        <button>Add task</button>
      </div>
      <section class="board">
        <div class="column">
          <header><strong>Next up</strong><span>3</span></header>
          <article class="task"><span class="tag blue-tag">STORE</span><h3>Review listing copy</h3><p>Make the core value clear in one sentence.</p></article>
          <article class="task"><span class="tag violet-tag">VIDEO</span><h3>Record product tour</h3><p>Keep the walkthrough under 90 seconds.</p></article>
        </div>
        <div class="column">
          <header><strong>In progress</strong><span>2</span></header>
          <article class="task"><span class="tag coral-tag">VISUAL</span><h3>Capture screenshots</h3><p>Use a clean profile and neutral demo data.</p></article>
          <article class="task"><span class="tag green-tag">QA</span><h3>Test multi-window sync</h3><p>Verify pin, unpin, and tab navigation.</p></article>
        </div>
        <div class="column">
          <header><strong>Ready</strong><span>2</span></header>
          <article class="task done"><span class="tag green-tag">RELEASE</span><h3>Package version 0.7.0</h3><p>Tests passed and upload archive verified.</p></article>
        </div>
      </section>
    `,
  },
  {
    port: 4313,
    key: "calendar",
    symbol: "C",
    title: "Week Ahead",
    section: "Calendar",
    accent: "#f06b5d",
    accentSoft: "#fff0ed",
    content: `
      <div class="toolbar">
        <div>
          <span class="eyebrow">CALENDAR</span>
          <h1>Week of July 27</h1>
          <p class="lede">A focused week with room to do the work.</p>
        </div>
        <button>New event</button>
      </div>
      <section class="calendar">
        <div class="day"><header><span>MON</span><strong>27</strong></header><div class="event blue-event"><time>09:30</time><b>Weekly planning</b></div><div class="event quiet-event"><time>14:00</time><b>Focus time</b></div></div>
        <div class="day current"><header><span>TUE</span><strong>28</strong></header><div class="event coral-event"><time>10:00</time><b>Launch review</b></div><div class="event quiet-event"><time>13:30</time><b>Screenshot session</b></div></div>
        <div class="day"><header><span>WED</span><strong>29</strong></header><div class="event violet-event"><time>11:00</time><b>Design critique</b></div></div>
        <div class="day"><header><span>THU</span><strong>30</strong></header><div class="event green-event"><time>09:00</time><b>Release check</b></div><div class="event quiet-event"><time>15:00</time><b>Write update</b></div></div>
        <div class="day"><header><span>FRI</span><strong>31</strong></header><div class="event blue-event"><time>10:30</time><b>Launch day</b></div></div>
      </section>
    `,
  },
  {
    port: 4314,
    key: "notes",
    symbol: "N",
    title: "Product Notes",
    section: "Notes",
    accent: "#159a84",
    accentSoft: "#e2f7f1",
    content: `
      <div class="toolbar">
        <div>
          <span class="eyebrow">NOTES</span>
          <h1>PinAllWindows launch notes</h1>
          <p class="lede">Last edited just now</p>
        </div>
        <button>Share</button>
      </div>
      <article class="document">
        <h2>One pinned workspace, in every window</h2>
        <p>PinAllWindows keeps essential apps ready across a multi-window Chrome workspace.</p>
        <h3>Launch checklist</h3>
        <label><input type="checkbox" checked disabled /> Package version 0.7.0</label>
        <label><input type="checkbox" checked disabled /> Refresh store description</label>
        <label><input type="checkbox" disabled /> Capture product screenshots</label>
        <label><input type="checkbox" disabled /> Publish the update</label>
        <blockquote>Pin once. Stay organized everywhere.</blockquote>
      </article>
    `,
  },
];

function escapeXml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
}

function faviconSvg(demo) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="16" fill="${demo.accent}"/>
      <text x="32" y="42" text-anchor="middle" font-family="Arial, sans-serif" font-size="31" font-weight="700" fill="white">${escapeXml(demo.symbol)}</text>
    </svg>
  `;
}

function page(demo) {
  const favicon = `data:image/svg+xml,${encodeURIComponent(faviconSvg(demo))}`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${demo.title}</title>
    <link rel="icon" href="${favicon}" />
    <style>
      :root {
        color-scheme: light;
        font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        --accent: ${demo.accent};
        --accent-soft: ${demo.accentSoft};
        --ink: #182033;
        --muted: #69728a;
        --line: #e7eaf1;
      }
      * { box-sizing: border-box; }
      body { margin: 0; min-width: 760px; min-height: 100vh; color: var(--ink); background: #f6f7fb; }
      .shell { display: grid; grid-template-columns: 210px minmax(0, 1fr); min-height: 100vh; }
      aside { padding: 28px 20px; border-right: 1px solid var(--line); background: #fff; }
      .logo { display: flex; align-items: center; gap: 11px; margin-bottom: 36px; font-weight: 750; letter-spacing: -.02em; }
      .logo-mark { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; color: #fff; background: var(--accent); }
      nav { display: grid; gap: 8px; }
      nav span { padding: 10px 12px; border-radius: 9px; color: var(--muted); font-size: 14px; font-weight: 600; }
      nav .active { color: var(--accent); background: var(--accent-soft); }
      main { padding: 42px 4.8vw 54px; overflow: hidden; }
      .toolbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 30px; margin-bottom: 34px; }
      .eyebrow { color: var(--accent); font-size: 11px; font-weight: 800; letter-spacing: .14em; }
      h1 { margin: 7px 0 6px; font-size: clamp(30px, 3vw, 44px); line-height: 1.05; letter-spacing: -.045em; }
      .lede { margin: 0; color: var(--muted); font-size: 15px; }
      button { padding: 11px 18px; border: 0; border-radius: 10px; color: #fff; background: var(--accent); font: inherit; font-weight: 700; box-shadow: 0 8px 24px color-mix(in srgb, var(--accent) 22%, transparent); }
      .mail-list, .document { overflow: hidden; border: 1px solid var(--line); border-radius: 16px; background: #fff; box-shadow: 0 18px 50px rgba(30, 42, 75, .07); }
      .mail { display: grid; grid-template-columns: 42px minmax(0, 1fr) auto; align-items: center; gap: 14px; min-height: 76px; padding: 14px 20px; border-bottom: 1px solid var(--line); }
      .mail:last-child { border-bottom: 0; }
      .mail.unread { background: #fbfcff; }
      .mail strong, .mail p { display: block; margin: 0; }
      .mail p, .mail time { color: var(--muted); font-size: 13px; }
      .avatar { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 12px; color: #fff; font-size: 12px; font-weight: 800; }
      .blue { background: #4f7cff; } .violet { background: #805ad5; } .coral { background: #f06b5d; } .green { background: #159a84; }
      .board { display: grid; grid-template-columns: repeat(3, minmax(210px, 1fr)); gap: 18px; }
      .column { min-height: 450px; padding: 16px; border: 1px solid var(--line); border-radius: 16px; background: rgba(255,255,255,.7); }
      .column > header { display: flex; justify-content: space-between; margin-bottom: 14px; }
      .column > header span { color: var(--muted); }
      .task { margin-bottom: 12px; padding: 17px; border: 1px solid var(--line); border-radius: 12px; background: #fff; box-shadow: 0 8px 22px rgba(30,42,75,.05); }
      .task h3 { margin: 9px 0 5px; font-size: 15px; } .task p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.45; }
      .task.done { opacity: .72; }
      .tag { font-size: 10px; font-weight: 800; letter-spacing: .08em; }
      .blue-tag { color: #3863d8; } .violet-tag { color: #7043bd; } .coral-tag { color: #d95144; } .green-tag { color: #0f806d; }
      .calendar { display: grid; grid-template-columns: repeat(5, minmax(120px, 1fr)); overflow: hidden; border: 1px solid var(--line); border-radius: 16px; background: #fff; box-shadow: 0 18px 50px rgba(30,42,75,.07); }
      .day { min-height: 460px; padding: 16px 12px; border-right: 1px solid var(--line); } .day:last-child { border-right: 0; }
      .day.current { background: #fffaf9; }
      .day header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; color: var(--muted); font-size: 11px; }
      .day header strong { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; color: var(--ink); font-size: 14px; }
      .day.current header strong { color: #fff; background: var(--accent); }
      .event { margin-bottom: 10px; padding: 11px; border-left: 3px solid; border-radius: 8px; font-size: 12px; }
      .event time, .event b { display: block; } .event time { margin-bottom: 4px; opacity: .68; font-size: 10px; }
      .blue-event { color: #3158bd; background: #edf2ff; } .coral-event { color: #b9483e; background: #fff0ed; } .violet-event { color: #6740a7; background: #f2ebff; } .green-event { color: #0d705f; background: #e7f8f3; } .quiet-event { color: #596174; background: #f2f4f8; }
      .document { max-width: 820px; padding: 48px 58px; }
      .document h2 { margin: 0 0 18px; font-size: 27px; letter-spacing: -.035em; } .document h3 { margin: 34px 0 15px; }
      .document > p { color: var(--muted); font-size: 16px; line-height: 1.65; }
      .document label { display: block; margin: 13px 0; font-size: 15px; } .document input { margin-right: 10px; accent-color: var(--accent); }
      blockquote { margin: 34px 0 0; padding: 19px 22px; border-left: 4px solid var(--accent); color: #0d705f; background: var(--accent-soft); font-size: 18px; font-weight: 700; }
    </style>
  </head>
  <body>
    <div class="shell">
      <aside>
        <div class="logo"><span class="logo-mark">${demo.symbol}</span><span>Demo Workspace</span></div>
        <nav>
          <span class="${demo.section === "Inbox" ? "active" : ""}">Inbox</span>
          <span class="${demo.section === "Projects" ? "active" : ""}">Projects</span>
          <span class="${demo.section === "Calendar" ? "active" : ""}">Calendar</span>
          <span class="${demo.section === "Notes" ? "active" : ""}">Notes</span>
        </nav>
      </aside>
      <main>${demo.content}</main>
    </div>
  </body>
</html>`;
}

const servers = demos.map((demo) => {
  const server = createServer((request, response) => {
    if (request.url === "/favicon.ico") {
      response.writeHead(200, { "Content-Type": "image/svg+xml" });
      response.end(faviconSvg(demo));
      return;
    }

    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8",
    });
    response.end(page(demo));
  });

  server.listen(demo.port, host, () => {
    console.log(`${demo.title}: http://${host}:${demo.port}/`);
  });

  return server;
});

function closeServers() {
  for (const server of servers) {
    server.close();
  }
}

process.on("SIGINT", closeServers);
process.on("SIGTERM", closeServers);
