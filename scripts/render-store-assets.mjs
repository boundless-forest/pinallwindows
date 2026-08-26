import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { Resvg } from "@resvg/resvg-js";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirectory = join(projectRoot, "store-listing", "source");
const finalDirectory = join(projectRoot, "store-listing", "assets", "final");
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
  const scale = small ? 1.26 : 1;
  const imageWidth = width * scale;
  const imageHeight = height * scale;
  const imageX = (width - imageWidth) / 2;
  const imageY = small ? height - imageHeight : (height - imageHeight) / 2;

  if (small) {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <defs>
          <linearGradient id="smallShade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#030922" stop-opacity=".96"/>
            <stop offset=".58" stop-color="#030922" stop-opacity=".55"/>
            <stop offset="1" stop-color="#030922" stop-opacity=".12"/>
          </linearGradient>
        </defs>
        <rect width="${width}" height="${height}" fill="#071033"/>
        <image href="${backgroundDataUri}" x="${imageX}" y="${imageY}" width="${imageWidth}" height="${imageHeight}" preserveAspectRatio="xMidYMid slice"/>
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
      <image href="${backgroundDataUri}" x="${imageX}" y="${imageY}" width="${imageWidth}" height="${imageHeight}" preserveAspectRatio="xMidYMid slice"/>
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

const iconSvg = await readFile(join(sourceDirectory, "icon.svg"), "utf8");
const smallIconSvg = await readFile(
  join(sourceDirectory, "icon-small.svg"),
  "utf8",
);
const background = await readFile(
  join(projectRoot, "store-listing", "assets", "source", "connected-windows.png"),
);

await Promise.all([
  renderSvg(smallIconSvg, join(projectRoot, "icons", "icon16.png"), 16),
  renderSvg(iconSvg, join(projectRoot, "icons", "icon32.png"), 32),
  renderSvg(iconSvg, join(projectRoot, "icons", "icon48.png"), 48),
  renderSvg(iconSvg, join(projectRoot, "icons", "icon128.png"), 128),
]);

const renderedIcon = await readFile(join(projectRoot, "icons", "icon128.png"));
const backgroundDataUri = escapeDataUri(background);
const iconDataUri = escapeDataUri(renderedIcon);

await Promise.all([
  renderSvg(
    promoSvg({
      width: 440,
      height: 280,
      small: true,
      backgroundDataUri,
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
      backgroundDataUri,
      iconDataUri,
    }),
    join(finalDirectory, "promo-marquee-1400x560.png"),
    1400,
    { removeAlpha: true },
  ),
]);

console.log("Rendered extension icons and Chrome Web Store promotional assets.");
