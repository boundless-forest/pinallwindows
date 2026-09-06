import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { Resvg } from "@resvg/resvg-js";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirectory = join(projectRoot, "store-listing", "source");
const finalDirectory = join(projectRoot, "store-listing", "assets", "final");
const screenshotSourceDirectory = join(
  projectRoot,
  "store-listing",
  "assets",
  "source",
  "screenshots",
);
const screenshotFinalDirectory = join(finalDirectory, "screenshots");
const fontFiles = ["Medium", "Bold", "ExtraBold"].map((weight) =>
  join(sourceDirectory, "fonts", `Manrope-${weight}.otf`),
);

function renderSvg(svg, outputPath, width, { removeAlpha = false } = {}) {
  const renderer = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: {
      fontFiles,
      loadSystemFonts: false,
      defaultFontFamily: "Manrope",
    },
  });

  const rendered = renderer.render().asPng();
  const output = removeAlpha
    ? PNG.sync.write(PNG.sync.read(rendered), {
        colorType: 2,
        inputColorType: 6,
      })
    : rendered;

  return writeFile(outputPath, output);
}

function escapeDataUri(buffer) {
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

function windowMotif({ x, y, width, height, opacity = 1 }) {
  return `<g transform="translate(${x} ${y})" opacity="${opacity}">
    <rect width="${width}" height="${height}" rx="16" fill="#111C47" stroke="#506397" stroke-width="2"/>
    <path d="M0 46H${width}" stroke="#506397" stroke-width="2"/>
    <rect x="20" y="17" width="25" height="12" rx="4" fill="#FF846E"/>
    <rect x="53" y="17" width="25" height="12" rx="4" fill="#A58AFF"/>
    <rect x="86" y="17" width="25" height="12" rx="4" fill="#73DCC7"/>
    <rect x="20" y="67" width="${width - 40}" height="20" rx="6" fill="#263765"/>
    <rect x="20" y="101" width="${width - 78}" height="8" rx="4" fill="#506397"/>
    <rect x="20" y="124" width="${width - 108}" height="8" rx="4" fill="#3C4E7F"/>
  </g>`;
}

function promoSvg({ width, height, small, iconDataUri }) {
  if (small) {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <defs>
          <linearGradient id="smallShade" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#070E2A"/>
            <stop offset="1" stop-color="#1B2456"/>
          </linearGradient>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#smallShade)"/>
        <circle cx="421" cy="0" r="134" fill="none" stroke="#A58AFF" stroke-opacity=".15" stroke-width="26"/>
        <image href="${iconDataUri}" x="30" y="27" width="45" height="45"/>
        <text x="87" y="61" fill="#F3F6FF" font-family="Manrope" font-size="33" font-weight="800" letter-spacing="-1">ztab</text>
        <text x="32" y="125" fill="#FFFFFF" font-family="Manrope" font-size="29" font-weight="800" letter-spacing="-.9">
          <tspan x="32" dy="0">Another excellent</tspan>
          <tspan x="32" dy="38" fill="#B7CCFF" font-size="27">tab manager for Chrome.</tspan>
        </text>
        <path d="M32 193H408" stroke="#677BAF" stroke-opacity=".35"/>
        <g font-family="Manrope" font-size="15" font-weight="700" fill="#DCE6FF">
          <circle cx="37" cy="228" r="4" fill="#FF846E"/><text x="50" y="233">Windows</text>
          <circle cx="183" cy="228" r="4" fill="#A58AFF"/><text x="196" y="233">Pins</text>
          <circle cx="293" cy="228" r="4" fill="#73DCC7"/><text x="306" y="233">Shortcuts</text>
        </g>
      </svg>`;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="marqueeShade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#070E2A"/>
          <stop offset="1" stop-color="#1B2456"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#marqueeShade)"/>
      <circle cx="1200" cy="58" r="250" fill="#A58AFF" opacity=".05"/>
      <image href="${iconDataUri}" x="64" y="52" width="50" height="50"/>
      <text x="128" y="90" fill="#F3F6FF" font-family="Manrope" font-size="37" font-weight="800" letter-spacing="-1.2">ztab</text>
      <text x="64" y="197" fill="#FFFFFF" font-family="Manrope" font-size="51" font-weight="800" letter-spacing="-1.7">
        <tspan x="64" dy="0">Another excellent</tspan>
        <tspan x="64" dy="66" fill="#B7CCFF">tab manager for Chrome.</tspan>
      </text>
      <text x="67" y="321" fill="#C6D4FA" font-family="Manrope" font-size="22" font-weight="500">A little more order. A lot less tab juggling.</text>
      ${windowMotif({ x: 939, y: 62, width: 320, height: 179, opacity: 0.65 })}
      ${windowMotif({ x: 875, y: 163, width: 320, height: 179 })}
      <path d="M1217 242v27a30 30 0 0 1-30 30h-18" fill="none" stroke="#73DCC7" stroke-width="3" stroke-linecap="round"/>
      <path d="m1178 290-10 9 10 9" fill="none" stroke="#73DCC7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      ${[
        { x: 64, color: "#FF846E", title: "Across windows", description: "View, move, and merge tabs across windows." },
        { x: 495, color: "#A58AFF", title: "Pinned tabs, in sync", description: "Keep your pinned apps close in every window." },
        { x: 926, color: "#73DCC7", title: "Made to move quickly", description: "Fast shortcuts. Thoughtful interactions." },
      ].map(({ x, color, title, description }) => `
        <rect x="${x}" y="410" width="410" height="101" rx="14" fill="#101B42" stroke="#344673"/>
        <rect x="${x + 23}" y="435" width="5" height="48" rx="2.5" fill="${color}"/>
        <text x="${x + 44}" y="453" fill="#F3F6FF" font-family="Manrope" font-size="22" font-weight="700" letter-spacing="-.4">${title}</text>
        <text x="${x + 44}" y="482" fill="#B9C9EC" font-family="Manrope" font-size="14" font-weight="500">${description}</text>
      `).join("")}
    </svg>`;
}

function screenshotSvg({
  screenshotDataUri,
  sourceWidth,
  sourceHeight,
  crop,
  headlineLead,
  headlineAccent,
  supporting,
  pillar,
  iconDataUri,
}) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
      <defs>
        <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#030922"/>
          <stop offset=".58" stop-color="#08133D"/>
          <stop offset="1" stop-color="#17205C"/>
        </linearGradient>
        <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#A9C2FF"/>
          <stop offset="1" stop-color="#71D7FF"/>
        </linearGradient>
        <filter id="shadow" x="-10%" y="-15%" width="120%" height="135%">
          <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#000619" flood-opacity=".48"/>
        </filter>
        <clipPath id="productClip">
          <rect x="28" y="220" width="1224" height="556" rx="14"/>
        </clipPath>
      </defs>

      <rect width="1280" height="800" fill="url(#background)"/>
      <circle cx="1235" cy="124" r="155" fill="#5639D8" opacity=".2"/>
      <circle cx="21" cy="22" r="58" fill="none" stroke="#FF755F" stroke-width="18" opacity=".95"/>
      <g fill="#58C8FF" opacity=".85">
        <circle cx="1177" cy="34" r="2.5"/><circle cx="1195" cy="34" r="2.5"/><circle cx="1213" cy="34" r="2.5"/><circle cx="1231" cy="34" r="2.5"/>
        <circle cx="1177" cy="52" r="2.5"/><circle cx="1195" cy="52" r="2.5"/><circle cx="1213" cy="52" r="2.5"/><circle cx="1231" cy="52" r="2.5"/>
      </g>

      <image href="${iconDataUri}" x="60" y="31" width="42" height="42"/>
      <text x="116" y="60" fill="#DCE6FF" font-family="Manrope" font-size="25" font-weight="800" letter-spacing="-.6">ztab</text>
      <text x="1129" y="58" text-anchor="end" fill="#B9C9EC" font-family="Manrope" font-size="14" font-weight="700" letter-spacing="1.2">${pillar}</text>
      <text x="60" y="132" font-family="Manrope" font-size="52" font-weight="800" letter-spacing="-2">
        <tspan fill="#FFFFFF">${headlineLead}</tspan>
        <tspan fill="url(#accent)"> ${headlineAccent}</tspan>
      </text>
      <text x="62" y="179" fill="#C6D4FA" font-family="Manrope" font-size="24" font-weight="500" letter-spacing="-.25">${supporting}</text>

      <rect x="28" y="220" width="1224" height="556" rx="14" fill="#071033" filter="url(#shadow)"/>
      <g clip-path="url(#productClip)">
        <svg x="28" y="220" width="1224" height="556" viewBox="${crop.x} ${crop.y} ${crop.width} ${crop.height}" preserveAspectRatio="xMidYMid meet">
          <image href="${screenshotDataUri}" width="${sourceWidth}" height="${sourceHeight}"/>
        </svg>
      </g>
      <rect x="28.5" y="220.5" width="1223" height="555" rx="13.5" fill="none" stroke="#8EA8EF" stroke-opacity=".45"/>
    </svg>`;
}

function keyboardScreenshotSvg({ screenshotDataUri, sourceWidth, sourceHeight, crop, iconDataUri }) {
  const productScale = Math.min(520 / crop.width, 646 / crop.height);
  const productWidth = crop.width * productScale;
  const productHeight = crop.height * productScale;
  const productX = 700 + (520 - productWidth) / 2;
  const productY = 102 + (646 - productHeight) / 2;
  const steps = [
    { y: 392, key: "Your shortcut", title: "Open the side panel", detail: "Customize the opener in Chrome." },
    { y: 494, key: "Up / Down", title: "Select a tab", detail: "Move through tabs across windows." },
    { y: 596, key: "Enter", title: "Switch to that tab", detail: "Bring its window into focus." },
  ];

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
    <defs>
      <linearGradient id="keyboardBackground" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#070E2A"/>
        <stop offset="1" stop-color="#1B2456"/>
      </linearGradient>
      <clipPath id="keyboardProductClip"><rect x="${productX}" y="${productY}" width="${productWidth}" height="${productHeight}" rx="16"/></clipPath>
    </defs>
    <rect width="1280" height="800" fill="url(#keyboardBackground)"/>
    <circle cx="1185" cy="65" r="200" fill="#73DCC7" opacity=".04"/>
    <image href="${iconDataUri}" x="60" y="31" width="42" height="42"/>
    <text x="116" y="60" fill="#DCE6FF" font-family="Manrope" font-size="25" font-weight="800" letter-spacing="-.6">ztab</text>
    <text x="1220" y="58" text-anchor="end" fill="#B9C9EC" font-family="Manrope" font-size="14" font-weight="700" letter-spacing="1.2">03 / KEYS AND INTERACTIONS</text>
    <text x="60" y="180" fill="#FFFFFF" font-family="Manrope" font-size="55" font-weight="800" letter-spacing="-2">
      <tspan x="60">Fast keys.</tspan>
      <tspan x="60" dy="65" fill="#B7CCFF">Thoughtful details.</tspan>
    </text>
    <text x="63" y="307" fill="#C6D4FA" font-family="Manrope" font-size="23" font-weight="500">
      <tspan x="63">Keep your hands on the keyboard.</tspan>
      <tspan x="63" dy="34">Get to the right tab in a few keystrokes.</tspan>
    </text>
    ${steps.map(({ y, key, title, detail }) => `
      <rect x="62" y="${y}" width="170" height="62" rx="11" fill="#233158" stroke="#5A6E9F"/>
      <path d="M76 ${y + 55}H218" stroke="#0D1737" stroke-width="2" stroke-linecap="round"/>
      <text x="147" y="${y + 37}" text-anchor="middle" fill="#F3F6FF" font-family="Manrope" font-size="18" font-weight="700">${key}</text>
      <text x="253" y="${y + 23}" fill="#F3F6FF" font-family="Manrope" font-size="21" font-weight="700">${title}</text>
      <text x="253" y="${y + 50}" fill="#B9C9EC" font-family="Manrope" font-size="15" font-weight="500">${detail}</text>
    `).join("")}
    <text x="63" y="728" fill="#8FA5D3" font-family="Manrope" font-size="14" font-weight="500">Keyboard navigation works while the tab list is focused.</text>
    <rect x="${productX}" y="${productY}" width="${productWidth}" height="${productHeight}" rx="16" fill="#071033"/>
    <g clip-path="url(#keyboardProductClip)">
      <svg x="${productX}" y="${productY}" width="${productWidth}" height="${productHeight}" viewBox="${crop.x} ${crop.y} ${crop.width} ${crop.height}" preserveAspectRatio="xMidYMid meet">
        <image href="${screenshotDataUri}" width="${sourceWidth}" height="${sourceHeight}"/>
      </svg>
    </g>
    <rect x="${productX + 0.5}" y="${productY + 0.5}" width="${productWidth - 1}" height="${productHeight - 1}" rx="15.5" fill="none" stroke="#8EA8EF" stroke-opacity=".45"/>
  </svg>`;
}

const iconSvg = await readFile(join(sourceDirectory, "icon.svg"), "utf8");
const smallIconSvg = await readFile(
  join(sourceDirectory, "icon-small.svg"),
  "utf8",
);

await Promise.all([
  renderSvg(smallIconSvg, join(projectRoot, "icons", "icon16.png"), 16),
  renderSvg(iconSvg, join(projectRoot, "icons", "icon32.png"), 32),
  renderSvg(iconSvg, join(projectRoot, "icons", "icon48.png"), 48),
  renderSvg(iconSvg, join(projectRoot, "icons", "icon128.png"), 128),
]);

const renderedIcon = await readFile(join(projectRoot, "icons", "icon128.png"));
const iconDataUri = escapeDataUri(renderedIcon);

await mkdir(screenshotFinalDirectory, { recursive: true });

const screenshotSpecs = [
  {
    source: "side-panel-raw.png",
    output: "screenshot-01-side-panel.png",
    headlineLead: "All your tabs.",
    headlineAccent: "One place.",
    supporting: "View, move, and close tabs, or merge windows from one side panel.",
    pillar: "01 / ACROSS WINDOWS",
  },
  {
    source: "pinned-tabs-raw.png",
    output: "screenshot-02-pinned-tabs.png",
    headlineLead: "Pin once.",
    headlineAccent: "Ready in every window.",
    supporting: "Keep the same pinned apps across every Chrome window.",
    pillar: "02 / PINNED TABS IN SYNC",
  },
  {
    source: "keyboard-raw.png",
    output: "screenshot-03-keyboard.png",
    crop: { x: 1030, y: 84, width: 370, height: 656 },
    render: keyboardScreenshotSvg,
  },
];

const screenshotRenders = screenshotSpecs.map(async (spec) => {
  const source = await readFile(join(screenshotSourceDirectory, spec.source));
  const decoded = PNG.sync.read(source);

  return renderSvg(
    (spec.render || screenshotSvg)({
      ...spec,
      crop: spec.crop || { x: 0, y: 0, width: decoded.width, height: decoded.height },
      screenshotDataUri: escapeDataUri(source),
      sourceWidth: decoded.width,
      sourceHeight: decoded.height,
      iconDataUri,
    }),
    join(screenshotFinalDirectory, spec.output),
    1280,
    { removeAlpha: true },
  );
});

await Promise.all([
  renderSvg(
    promoSvg({
      width: 440,
      height: 280,
      small: true,
      iconDataUri,
    }),
    join(finalDirectory, "promo-small-440x280.png"),
    440,
    { removeAlpha: true },
  ),
  renderSvg(
    promoSvg({
      width: 1400,
      height: 560,
      small: false,
      iconDataUri,
    }),
    join(finalDirectory, "promo-marquee-1400x560.png"),
    1400,
    { removeAlpha: true },
  ),
  ...screenshotRenders,
]);

console.log("Rendered extension icons and Chrome Web Store artwork.");
