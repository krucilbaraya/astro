import mime from 'mime';
import { dim, bold, red, yellow, cyan, green } from 'kleur/colors';
import sizeOf from 'image-size';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { c as createAstro, a as createComponent, r as renderTemplate, m as maybeRenderHead, b as addAttribute, u as unescapeHTML, d as renderHead, e as renderSlot, f as renderComponent } from '../astro.e6e217dc.mjs';
/* empty css                           *//* empty css                              */
const PREFIX = "@astrojs/image";
const dateTimeFormat = new Intl.DateTimeFormat([], {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit"
});
const levels = {
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  silent: 90
};
function getPrefix(level, timestamp) {
  let prefix = "";
  if (timestamp) {
    prefix += dim(dateTimeFormat.format(/* @__PURE__ */ new Date()) + " ");
  }
  switch (level) {
    case "debug":
      prefix += bold(green(`[${PREFIX}] `));
      break;
    case "info":
      prefix += bold(cyan(`[${PREFIX}] `));
      break;
    case "warn":
      prefix += bold(yellow(`[${PREFIX}] `));
      break;
    case "error":
      prefix += bold(red(`[${PREFIX}] `));
      break;
  }
  return prefix;
}
const log = (_level, dest) => ({ message, level, prefix = true, timestamp = true }) => {
  if (levels[_level] >= levels[level]) {
    dest(`${prefix ? getPrefix(level, timestamp) : ""}${message}`);
  }
};
const error = log("error", console.error);

async function metadata(src, data) {
  const file = data || await fs.readFile(src);
  const { width, height, type, orientation } = sizeOf(file);
  const isPortrait = (orientation || 0) >= 5;
  if (!width || !height || !type) {
    return void 0;
  }
  return {
    // We shouldn't call fileURLToPath function if it starts with /@astroimage/ because it will throw Invalid URL error
    src: typeof src === "string" && /^[\/\\]?@astroimage/.test(src) ? src : fileURLToPath(src),
    width: isPortrait ? height : width,
    height: isPortrait ? width : height,
    format: type,
    orientation
  };
}

function isRemoteImage(src) {
  return /^(https?:)?\/\//.test(src);
}

function isOutputFormat(value) {
  return ["avif", "jpeg", "jpg", "png", "webp", "svg"].includes(value);
}
function isAspectRatioString(value) {
  return /^\d*:\d*$/.test(value);
}
function parseAspectRatio(aspectRatio) {
  if (!aspectRatio) {
    return void 0;
  }
  if (typeof aspectRatio === "number") {
    return aspectRatio;
  } else {
    const [width, height] = aspectRatio.split(":");
    return parseInt(width) / parseInt(height);
  }
}
function isSSRService(service) {
  return "transform" in service;
}
class BaseSSRService {
  async getImageAttributes(transform) {
    const { width, height, src, format, quality, aspectRatio, ...rest } = transform;
    return {
      ...rest,
      width,
      height
    };
  }
  serializeTransform(transform) {
    const searchParams = new URLSearchParams();
    if (transform.quality) {
      searchParams.append("q", transform.quality.toString());
    }
    if (transform.format) {
      searchParams.append("f", transform.format);
    }
    if (transform.width) {
      searchParams.append("w", transform.width.toString());
    }
    if (transform.height) {
      searchParams.append("h", transform.height.toString());
    }
    if (transform.aspectRatio) {
      searchParams.append("ar", transform.aspectRatio.toString());
    }
    if (transform.fit) {
      searchParams.append("fit", transform.fit);
    }
    if (transform.background) {
      searchParams.append("bg", transform.background);
    }
    if (transform.position) {
      searchParams.append("p", encodeURI(transform.position));
    }
    searchParams.append("href", transform.src);
    return { searchParams };
  }
  parseTransform(searchParams) {
    if (!searchParams.has("href")) {
      return void 0;
    }
    let transform = { src: searchParams.get("href") };
    if (searchParams.has("q")) {
      transform.quality = parseInt(searchParams.get("q"));
    }
    if (searchParams.has("f")) {
      const format = searchParams.get("f");
      if (isOutputFormat(format)) {
        transform.format = format;
      }
    }
    if (searchParams.has("w")) {
      transform.width = parseInt(searchParams.get("w"));
    }
    if (searchParams.has("h")) {
      transform.height = parseInt(searchParams.get("h"));
    }
    if (searchParams.has("ar")) {
      const ratio = searchParams.get("ar");
      if (isAspectRatioString(ratio)) {
        transform.aspectRatio = ratio;
      } else {
        transform.aspectRatio = parseFloat(ratio);
      }
    }
    if (searchParams.has("fit")) {
      transform.fit = searchParams.get("fit");
    }
    if (searchParams.has("p")) {
      transform.position = decodeURI(searchParams.get("p"));
    }
    if (searchParams.has("bg")) {
      transform.background = searchParams.get("bg");
    }
    return transform;
  }
}

const imagePoolModulePromise = import('../image-pool.0520c561.mjs');
class SquooshService extends BaseSSRService {
  async processAvif(image, transform) {
    const encodeOptions = transform.quality ? { avif: { quality: transform.quality } } : { avif: {} };
    await image.encode(encodeOptions);
    const data = await image.encodedWith.avif;
    return {
      data: data.binary,
      format: "avif"
    };
  }
  async processJpeg(image, transform) {
    const encodeOptions = transform.quality ? { mozjpeg: { quality: transform.quality } } : { mozjpeg: {} };
    await image.encode(encodeOptions);
    const data = await image.encodedWith.mozjpeg;
    return {
      data: data.binary,
      format: "jpeg"
    };
  }
  async processPng(image) {
    await image.encode({ oxipng: {} });
    const data = await image.encodedWith.oxipng;
    return {
      data: data.binary,
      format: "png"
    };
  }
  async processWebp(image, transform) {
    const encodeOptions = transform.quality ? { webp: { quality: transform.quality } } : { webp: {} };
    await image.encode(encodeOptions);
    const data = await image.encodedWith.webp;
    return {
      data: data.binary,
      format: "webp"
    };
  }
  async autorotate(transform, inputBuffer) {
    try {
      const meta = await metadata(transform.src, inputBuffer);
      switch (meta == null ? void 0 : meta.orientation) {
        case 3:
        case 4:
          return { type: "rotate", numRotations: 2 };
        case 5:
        case 6:
          return { type: "rotate", numRotations: 1 };
        case 7:
        case 8:
          return { type: "rotate", numRotations: 3 };
      }
    } catch {
      error({
        level: "info",
        prefix: false,
        message: red(`Cannot read metadata for ${transform.src}`)
      });
    }
  }
  async transform(inputBuffer, transform) {
    if (transform.format === "svg") {
      return {
        data: inputBuffer,
        format: transform.format
      };
    }
    const operations = [];
    if (!isRemoteImage(transform.src)) {
      const autorotate = await this.autorotate(transform, inputBuffer);
      if (autorotate) {
        operations.push(autorotate);
      }
    } else if (transform.src.startsWith("//")) {
      transform.src = `https:${transform.src}`;
    }
    if (transform.width || transform.height) {
      const width = transform.width && Math.round(transform.width);
      const height = transform.height && Math.round(transform.height);
      operations.push({
        type: "resize",
        width,
        height
      });
    }
    if (!transform.format) {
      error({
        level: "info",
        prefix: false,
        message: red(`Unknown image output: "${transform.format}" used for ${transform.src}`)
      });
      throw new Error(`Unknown image output: "${transform.format}" used for ${transform.src}`);
    }
    const { processBuffer } = await imagePoolModulePromise;
    const data = await processBuffer(inputBuffer, operations, transform.format, transform.quality);
    return {
      data: Buffer.from(data),
      format: transform.format
    };
  }
}
const service = new SquooshService();
var squoosh_default = service;

const squoosh = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: squoosh_default
}, Symbol.toStringTag, { value: 'Module' }));

const fnv1a52 = (str) => {
  const len = str.length;
  let i = 0, t0 = 0, v0 = 8997, t1 = 0, v1 = 33826, t2 = 0, v2 = 40164, t3 = 0, v3 = 52210;
  while (i < len) {
    v0 ^= str.charCodeAt(i++);
    t0 = v0 * 435;
    t1 = v1 * 435;
    t2 = v2 * 435;
    t3 = v3 * 435;
    t2 += v0 << 8;
    t3 += v1 << 8;
    t1 += t0 >>> 16;
    v0 = t0 & 65535;
    t2 += t1 >>> 16;
    v1 = t1 & 65535;
    v3 = t3 + (t2 >>> 16) & 65535;
    v2 = t2 & 65535;
  }
  return (v3 & 15) * 281474976710656 + v2 * 4294967296 + v1 * 65536 + (v0 ^ v3 >> 4);
};
const etag = (payload, weak = false) => {
  const prefix = weak ? 'W/"' : '"';
  return prefix + fnv1a52(payload).toString(36) + payload.length.toString(36) + '"';
};

async function loadRemoteImage(src) {
  try {
    const res = await fetch(src);
    if (!res.ok) {
      return void 0;
    }
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    console.error(err);
    return void 0;
  }
}
const get = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const transform = squoosh_default.parseTransform(url.searchParams);
    let inputBuffer = void 0;
    const sourceUrl = isRemoteImage(transform.src) ? new URL(transform.src) : new URL(transform.src, url.origin);
    inputBuffer = await loadRemoteImage(sourceUrl);
    if (!inputBuffer) {
      return new Response("Not Found", { status: 404 });
    }
    const { data, format } = await squoosh_default.transform(inputBuffer, transform);
    return new Response(data, {
      status: 200,
      headers: {
        "Content-Type": mime.getType(format) || "",
        "Cache-Control": "public, max-age=31536000",
        ETag: etag(data.toString()),
        Date: (/* @__PURE__ */ new Date()).toUTCString()
      }
    });
  } catch (err) {
    console.error(err);
    return new Response(`Server Error: ${err}`, { status: 500 });
  }
};

const _page0 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  get
}, Symbol.toStringTag, { value: 'Module' }));

const $$Astro$4 = createAstro();
const $$Hero = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$4, $$props, $$slots);
  Astro2.self = $$Hero;
  return renderTemplate`${maybeRenderHead($$result)}<section class="astro-BBE6DXRZ">
    <h1 class="astro-BBE6DXRZ">Hello, web friend! 🌎 Thanks for visiting</h1>
    <p class="astro-BBE6DXRZ"></p>
</section>`;
}, "C:/Users/asus/Desktop/ASTRO/src/components/Hero.astro");

const $$Astro$3 = createAstro();
const $$PostCard = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$3, $$props, $$slots);
  Astro2.self = $$PostCard;
  const { post } = Astro2.props;
  return renderTemplate`${maybeRenderHead($$result)}<article class="astro-IYIQI2SO">
    <a class="post-link astro-IYIQI2SO"${addAttribute(post.uri, "href")}${addAttribute(post.title, "aria-label")}>
        <h3 class="astro-IYIQI2SO">${post.title}</h3>    
        <section class="astro-IYIQI2SO">
            <img${addAttribute(post?.featuredImage?.node?.mediaItemUrl, "src")}${addAttribute(post?.featuredImage?.node?.altText, "alt")}${addAttribute(post?.featuredImage?.node?.srcSet, "srcset")} loading="lazy"${addAttribute(post?.featuredImage?.node?.mediaDetails?.width, "width")}${addAttribute(post?.featuredImage?.node?.mediaDetails?.height, "height")} class="astro-IYIQI2SO">
            <div class="astro-IYIQI2SO">
                <p class="astro-IYIQI2SO">${unescapeHTML(post.excerpt)}</p> 
                ${post.categories.nodes.map((category) => {
    return renderTemplate`<a class="term-link astro-IYIQI2SO"${addAttribute(category.uri, "href")}>${category.name}</a>`;
  })}
                <span class="astro-IYIQI2SO"><time${addAttribute(post.date, "datetime")} class="astro-IYIQI2SO">${new Date(post.date).toLocaleDateString()}</time></span>
            </div>
        </section>
    </a>
</article>`;
}, "C:/Users/asus/Desktop/ASTRO/src/components/PostCard.astro");

const $$Astro$2 = createAstro();
const $$SiteFooter = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$2, $$props, $$slots);
  Astro2.self = $$SiteFooter;
  return renderTemplate`
${maybeRenderHead($$result)}<hr class="astro-GCN2MC3V">
<footer class="astro-GCN2MC3V">
    <p class="astro-GCN2MC3V">Made with ❤️ by <a href="https://developers.wpengine.com/" class="astro-GCN2MC3V">WP Engine Dev Rel</a></p>
</footer>`;
}, "C:/Users/asus/Desktop/ASTRO/src/components/SiteFooter.astro");

async function navQuery() {
  const siteNavQueryRes = await fetch("https://chekoutinaja.my.id/graphql", {
    method: 'post',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `{
                menus(where: {}) {
                  nodes {
                    name
                    menuItems {
                        nodes {
                            uri
                            url
                            order
                            label
                        }
                    }
                  }
                }
                generalSettings {
                    title
                    url
                    description
                }
            }
            `
    })
  });
  const { data, errors } = await siteNavQueryRes.json();
  return data;
}

async function homePagePostsQuery() {
  const response = await fetch("https://chekoutinaja.my.id/graphql", {
    method: 'post',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `{
                posts {
                  nodes {
                    date
                    uri
                    title
                    commentCount
                    excerpt
                    categories {
                      nodes {
                        name
                        uri
                      }
                    }
                    featuredImage {
                      node {
                        srcSet
                        sourceUrl
                        altText
                        mediaDetails {
                          height
                          width
                        }
                      }
                    }
                  }
                }
              }
            `
    })
  });
  const { data } = await response.json();
  return data;
}


async function getNodeByURI(uri) {
  const response = await fetch("https://chekoutinaja.my.id/graphql", {
    method: 'post',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query GetNodeByURI($uri: String!) {
                nodeByUri(uri: $uri) {
                  __typename
                  isContentNode
                  isTermNode
                  ... on Post {
                    id
                    title
                    date
                    uri
                    excerpt
                    content
                    categories {
                      nodes {
                        name
                        uri
                      }
                    }
                    featuredImage {
                      node {
                        srcSet
                        sourceUrl
                        altText
                        mediaDetails {
                          height
                          width
                        }
                      }
                    }
                  }
                  ... on Page {
                    id
                    title
                    uri
                    date
                    content
                  }
                  ... on Category {
                    id
                    name
                    posts {
                      nodes {
                        date
                        title
                        excerpt
                        uri
                        categories {
                          nodes {
                            name
                            uri
                          }
                        }
                        featuredImage {
                          node {
                            srcSet
                            sourceUrl
                            altText
                            mediaDetails {
                              height
                              width
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            `,
      variables: {
        uri: uri
      }
    })
  });
  const { data } = await response.json();
  return data;
}

async function getAllUris() {
  const response = await fetch("https://chekoutinaja.my.id/graphql", {
    method: 'post',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query GetAllUris {
            terms {
              nodes {
                uri
              }
            }
            posts(first: 100) {
              nodes {
                uri
              }
            }
            pages(first: 100) {
              nodes {
                uri
              }
            }
          }
          `
    })
  });
  const { data } = await response.json();
  const uris = Object.values(data)
    .reduce(function (acc, currentValue) {
      return acc.concat(currentValue.nodes)
    }, [])
    .filter(node => node.uri !== null)
    .map(node => {
      let trimmedURI = node.uri.substring(1);
      trimmedURI = trimmedURI.substring(0, trimmedURI.length - 1);
      return {
        params: {
          uri: trimmedURI
        }
      }
    });

  return uris;

}

const $$Astro$1 = createAstro();
const $$MainLayout = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$MainLayout;
  const { menus, generalSettings } = await navQuery();
  menus.nodes[0];
  const { title, description } = Astro2.props;
  return renderTemplate`<html lang="en" class="astro-OUAMJN2I">
	<head>
		<meta charset="utf-8">
		<link rel="icon" type="image/svg+xml" href="/favicon.svg">
		<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" <meta name="generator"${addAttribute(Astro2.generator, "content")}>
		<title>${`${title} | ${generalSettings.title}`}</title>
		<meta name="description"${addAttribute(description, "content")}>
		<link rel="stylesheet" id="landingpress-css" href="https://chekoutinaja.my.id/wp-content/themes/landingpress-wp/style.css?ver=3.4.3" type="text/css" media="all">		
			<link rel="stylesheet" id="elementor-frontend-css" href="https://chekoutinaja.my.id/wp-content/plugins/elementor/assets/css/frontend.min.css?ver=3.26.3" type="text/css" media="all">

			<link rel="stylesheet" id="widget-icon-box-css" href="https://chekoutinaja.my.id/wp-content/plugins/elementor/assets/css/widget-icon-box.min.css?ver=3.26.3" type="text/css" media="all">
			<link rel="stylesheet" id="widget-icon-list-css" href="https://chekoutinaja.my.id/wp-content/plugins/elementor/assets/css/widget-icon-list.min.css?ver=3.26.3" type="text/css" media="all">
			
	${renderHead($$result)}</head>
	<body class="astro-OUAMJN2I">
		<main class="astro-OUAMJN2I">
			${renderSlot($$result, $$slots["default"])}
		</main>
		${renderComponent($$result, "SiteFooter", $$SiteFooter, { "class": "astro-OUAMJN2I" })}
	</body></html>`;
}, "C:/Users/asus/Desktop/ASTRO/src/layouts/MainLayout.astro");

const $$Astro = createAstro();
const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Index;
  const data = await homePagePostsQuery();
  const posts = data.posts.nodes;
  Astro2.response.headers.set("Cache-Control", "max-age=600, must-revalidate");
  return renderTemplate`${renderComponent($$result, "MainLayout", $$MainLayout, { "title": "Home Page" }, { "default": () => renderTemplate`${maybeRenderHead($$result)}<main>
		${renderComponent($$result, "Hero", $$Hero, {})}
		<h2>Recent Posts</h2>
		${posts.map((post) => {
    return renderTemplate`${renderComponent($$result, "PostCard", $$PostCard, { "post": post })}`;
  })}
	</main>` })}`;
}, "C:/Users/asus/Desktop/ASTRO/src/pages/index.astro");

const $$file = "C:/Users/asus/Desktop/ASTRO/src/pages/index.astro";
const $$url = "";

const _page1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

export { $$PostCard as $, _page0 as _, isSSRService as a, $$MainLayout as b, getAllUris as c, _page1 as d, getNodeByURI as g, isRemoteImage as i, parseAspectRatio as p, squoosh as s };
