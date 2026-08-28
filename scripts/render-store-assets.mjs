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

function promoSvg({ width, height, small, backgroundDataUri, iconDataUri }) {
  if (small) {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <defs>
          <linearGradient id="smallShade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#030922" stop-opacity=".98"/>
            <stop offset=".56" stop-color="#030922" stop-opacity=".78"/>
            <stop offset=".76" stop-color="#030922" stop-opacity=".3"/>
            <stop offset="1" stop-color="#030922" stop-opacity=".04"/>
          </linearGradient>
        </defs>
        <rect width="${width}" height="${height}" fill="#071033"/>
        <image href="${backgroundDataUri}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>
        <rect width="${width}" height="${height}" fill="url(#smallShade)"/>
        <rect x="24" y="20" width="38" height="38" rx="11" fill="#111D4C" stroke="#294682" stroke-width="1"/>
        <image href="${iconDataUri}" x="27" y="23" width="32" height="32"/>
        <text x="70" y="45" fill="#DCE6FF" font-family="Manrope" font-size="15" font-weight="700" letter-spacing="-.25">TabSpan</text>
        <text x="28" y="105" fill="#FFFFFF" font-family="Manrope" font-size="43" font-weight="800" letter-spacing="-1.7">
          <tspan x="28" dy="0">Every tab.</tspan>
          <tspan x="28" dy="45" fill="#A9C2FF">Every window.</tspan>
        </text>
      </svg>`;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="marqueeShade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#030922" stop-opacity=".98"/>
          <stop offset=".34" stop-color="#030922" stop-opacity=".88"/>
          <stop offset=".62" stop-color="#030922" stop-opacity=".16"/>
          <stop offset="1" stop-color="#030922" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="bottomShade" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stop-color="#030922" stop-opacity=".38"/>
          <stop offset=".55" stop-color="#030922" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="#071033"/>
      <image href="${backgroundDataUri}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>
      <rect width="${width}" height="${height}" fill="url(#marqueeShade)"/>
      <rect width="${width}" height="${height}" fill="url(#bottomShade)"/>
      <image href="${iconDataUri}" x="96" y="68" width="42" height="42"/>
      <text x="151" y="97" fill="#DCE6FF" font-family="Manrope" font-size="22" font-weight="700" letter-spacing="-.35">TabSpan</text>
      <text x="96" y="205" fill="#FFFFFF" font-family="Manrope" font-size="76" font-weight="800" letter-spacing="-3.1">
        <tspan x="96" dy="0">Every tab.</tspan>
        <tspan x="96" dy="78" fill="#A9C2FF">Across every window.</tspan>
      </text>
      <text x="100" y="376" fill="#C6D4FA" font-family="Manrope" font-size="25" font-weight="500" letter-spacing="-.35">One live side panel for all your Chrome windows.</text>
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
      <text x="116" y="60" fill="#DCE6FF" font-family="Manrope" font-size="21" font-weight="700" letter-spacing="-.3">TabSpan</text>
      <text x="60" y="132" font-family="Manrope" font-size="52" font-weight="800" letter-spacing="-2">
        <tspan fill="#FFFFFF">${headlineLead}</tspan>
        <tspan fill="url(#accent)"> ${headlineAccent}</tspan>
      </text>
      <text x="62" y="179" fill="#C6D4FA" font-family="Manrope" font-size="24" font-weight="500" letter-spacing="-.25">${supporting}</text>

      <rect x="28" y="220" width="1224" height="556" rx="14" fill="#071033" filter="url(#shadow)"/>
      <g clip-path="url(#productClip)">
        <svg x="28" y="220" width="1224" height="556" viewBox="${crop.x} ${crop.y} ${crop.width} ${crop.height}" preserveAspectRatio="xMidYMid slice">
          <image href="${screenshotDataUri}" width="${sourceWidth}" height="${sourceHeight}"/>
        </svg>
      </g>
      <rect x="28.5" y="220.5" width="1223" height="555" rx="13.5" fill="none" stroke="#8EA8EF" stroke-opacity=".45"/>
    </svg>`;
}

const iconSvg = await readFile(join(sourceDirectory, "icon.svg"), "utf8");
const smallIconSvg = await readFile(
  join(sourceDirectory, "icon-small.svg"),
  "utf8",
);
const marqueeBackground = await readFile(
  join(projectRoot, "store-listing", "assets", "source", "tab-flow-marquee-v2.png"),
);
const smallBackground = await readFile(
  join(projectRoot, "store-listing", "assets", "source", "tab-flow-small.png"),
);

await Promise.all([
  renderSvg(smallIconSvg, join(projectRoot, "icons", "icon16.png"), 16),
  renderSvg(iconSvg, join(projectRoot, "icons", "icon32.png"), 32),
  renderSvg(iconSvg, join(projectRoot, "icons", "icon48.png"), 48),
  renderSvg(iconSvg, join(projectRoot, "icons", "icon128.png"), 128),
]);

const renderedIcon = await readFile(join(projectRoot, "icons", "icon128.png"));
const marqueeBackgroundDataUri = escapeDataUri(marqueeBackground);
const smallBackgroundDataUri = escapeDataUri(smallBackground);
const iconDataUri = escapeDataUri(renderedIcon);

await mkdir(screenshotFinalDirectory, { recursive: true });

const screenshotSpecs = [
  {
    source: "side-panel-raw.png",
    output: "screenshot-01-side-panel.png",
    crop: { x: 0, y: 0, width: 4480, height: 2028 },
    headlineLead: "Every tab.",
    headlineAccent: "Across every window.",
    supporting: "See, jump, move, and close tabs from one unified side panel.",
  },
  {
    source: "pinned-tabs-raw.png",
    output: "screenshot-02-pinned-tabs.png",
    crop: { x: 0, y: 0, width: 4448, height: 1994 },
    headlineLead: "Pin once.",
    headlineAccent: "Ready in every window.",
    supporting: "Keep the same pinned apps across every Chrome window.",
  },
];

const screenshotRenders = screenshotSpecs.map(async (spec) => {
  const source = await readFile(join(screenshotSourceDirectory, spec.source));
  const decoded = PNG.sync.read(source);

  return renderSvg(
    screenshotSvg({
      ...spec,
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
      backgroundDataUri: smallBackgroundDataUri,
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
      backgroundDataUri: marqueeBackgroundDataUri,
      iconDataUri,
    }),
    join(finalDirectory, "promo-marquee-1400x560.png"),
    1400,
    { removeAlpha: true },
  ),
  ...screenshotRenders,
]);

console.log("Rendered extension icons and Chrome Web Store artwork.");
