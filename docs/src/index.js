import { Canvg, presets } from "canvg";
import Reveal from "reveal.js";
import RevealMarkdown from "reveal.js/plugin/markdown/markdown.esm.js";
import RevealMenu from "reveal.js-menu/menu.esm.js";
import "reveal.js/dist/reveal.css";
import "reveal.js/dist/theme/black.css";
import "@fontsource/source-sans-pro";
import "reveal.js-menu/menu.css";
import mermaid from "mermaid";
import RevealNotes from "reveal.js/plugin/notes/notes.esm.js";

const preset = presets.offscreen();

let x = RevealMarkdown;
let $ = require("jquery");
globalThis.jQuery = $;
globalThis.$ = $;

mermaid.startOnLoad = false;

export function UseReveal(
  document,
  deckid,
  useMermaid,
  mermaidSelector = "code.mermaid",
  embed = true,
  showMenu = false
) {
  $(() => {
    LoadUpReveal(
      document,
      deckid,
      useMermaid,
      mermaidSelector,
      embed,
      showMenu
    );
  });
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

function LoadUpReveal(
  document,
  deckid,
  useMermaid,
  mermaidSelector = "code.mermaid",
  embed = true,
  showMenu = false
) {
  let pluginsToLoad = [];
  pluginsToLoad.push(RevealMarkdown);
  if (showMenu) pluginsToLoad.push(RevealMenu);
  pluginsToLoad.push(RevealNotes);
  let selectorToUseOnSlideChange = "div.mermaid, code.mermaid";
  let deck1 = new Reveal(document.querySelector("div." + deckid), {
    embedded: embed,
    keyboardCondition: "focused",
    controls: true,
    controlsTutorial: true,
    controlsLayout: "bottom-right",
    controlsBackArrows: "faded",
    progress: true,
    autoSlide: 5000,
    slideNumber: true,
    showSlideNumber: "all",
    loop: true,
    plugins: pluginsToLoad,
    backgroundTransition: "none",
    transition: "none",
    center: false,
  });

  deck1
    .initialize({
      menu: {
        path: "/assets-webpack/reveal.js-menu",
        side: "left",
        width: "normal",
        numbers: false,
        titleSelector: "h1, h2, h3, h4, h5, h6",
        useTextContentForMissingTitles: false,
        hideMissingTitles: false,
        markers: true,
        custom: false,
        themes: false,
        themesPath: "dist/theme/",
        transitions: false,
        openButton: true,
        openSlideNumber: false,
        keyboard: true,
        sticky: true,
        autoOpen: true,
        delayInit: false,
        openOnInit: false,
        loadIcons: true,
        showNotes: true,
        preloadIframes: true,
      },
    })
    .then(() => {
      let currentSlide;

      if (useMermaid) {
        currentSlide = deck1.getCurrentSlide();
      }
      UseMermaidNow(currentSlide, selectorToUseOnSlideChange);
    });

  deck1.on("slidechanged", (event) => {
    if (useMermaid) {
      RemoveProcessed(event.previousSlide);
      UseMermaidNow(event.currentSlide, selectorToUseOnSlideChange);
    }
  });

  deck1.on("slidetransitionend", (event) => {
    // event.previousSlide, event.currentSlide, event.indexh, event.indexv
  });

  deck1.addEventListener("menu-ready", function (event) {
    // your code
  });
}

function RemoveProcessed(slideToRemoveFrom) {
  let processedAttribName = "data-processed";
  let selectorToUse =
    "div.mermaid[data-processed], code.mermaid[data-processed]";
  let toRender = slideToRemoveFrom.querySelectorAll(selectorToUse);
  for (const item of toRender) {
    if (item.hasAttribute(processedAttribName)) {
      while (item.firstChild) {
        item.firstChild.remove();
      }
      item.removeAttribute(processedAttribName);

      let rawCode = item.rawCode;
      item.innerHTML = rawCode;
    }
  }
}

function mermaidCb(id, addlinks) {
  console.log("Callback happening from mermaid init being finished");
  if (addlinks) {
    console.log(id);
    addLinks(id);
  }
}

export function MermaidInit(addlinks = true) {
  mermaid.initialize({
    logLevel: 1,
    securityLevel: "loose",
    htmlLabels: true,
    flowchart: { useMaxWidth: true, htmlLabels: false },
    c4: {
      useMaxWidth: true,
      htmlLabels: true,
      diagramMarginX: 10,
      c4ShapeMargin: 20,
      c4ShapePadding: 20,
    },
    mermaid: {
      startOnLoad: false,
      callback: function (id) {
        mermaidCb(id, addlinks);
      },
    },
  });

  // copy-pasta from the documentation
  mermaid.registerIconPacks([
    {
      name: "logos",
      loader: () =>
        fetch("https://unpkg.com/@iconify-json/logos@1/icons.json").then(
          (res) => res.json()
        ),
    },
    {
      name: "aws",
      loader: () =>
        fetch(
          "/assets/aws-icons-mermaid.json"
        ).then((res) => res.json()),
    },
  ]);
}

export async function UseMermaidNow(
  useMermaidOn,
  selector = ".language-mermaid",
  addlinks = true
) {
  let toRender = useMermaidOn.querySelectorAll(selector);
  if (toRender.length > 0) {
    for (const item of toRender) {
      if (!item.hasOwnProperty("rawCode")) item.rawCode = item.innerHTML;
    }

    mermaid.init(undefined, toRender, (id) => {
      mermaidCb(id, addlinks);
    });
  }
}

export async function UseMermaid(
  document,
  addlinks = true,
  selector = ".language-mermaid"
) {
  $(async function () {
    MermaidInit(addlinks);
    await UseMermaidNow(document, selector, addlinks);
  });
}

function addLinks(id) {
  let svg = document.getElementById(id);
  let btn = document.createElement("button");
  btn.id = id + "_button";
  let pre = svg.parentNode.parentNode;
  pre.id = id + "_pre";
  btn.innerHTML = "View diagram as PNG (" + id + ")";

  //Remove to enable the png button.
  btn.style.display = "none";

  svg.parentNode.parentNode.before(btn);

  svg.addEventListener("mouseover", (event) => {
    event.target.style.cursor = "pointer";
  });

  svg.addEventListener("click", (event) => {
    console.log(event);
    let pngVersion = document.getElementById(id + "_png");
    if (pngVersion) {
      window.open(pngVersion.src);
    } else {
      drawCanvas(id, (img) => {
        img.style.display = "none";
        let p = document.createElement("p");
        btn.after(p);
        p.appendChild(img);
        window.open(img.src);
      });
    }
  });

  btn.addEventListener("click", function () {
    let pngVersion = document.getElementById(id + "_png");
    if (pngVersion) {
      if (pngVersion.style.display === "none") {
        pngVersion.style.display = "block";
        pre.style.display = "none";
        btn.innerHTML = "View diagram as SVG (" + id + ")";
      } else {
        pngVersion.style.display = "none";
        pre.style.display = "block";
        btn.innerHTML = "View diagram as PNG (" + id + ")";
      }
    } else {
      btn.innerHTML = "View diagram as SVG (" + id + ")";
      drawCanvas(id, (img) => {
        img.style.display = "block";
        let p = document.createElement("p");
        btn.after(p);
        p.appendChild(img);
        pre.style.display = "none";
      });
    }
  });
}

function drawCanvas(id, callback) {
  let svg = document.getElementById(id);
  let { width, height } = svg.getBoundingClientRect();
  let pixelRatio = 2;

  // lets scale the canvas and change its CSS width/height to make it high res.
  //  canvas.style.width = canvas.width +'px';
  let newWidth = width * pixelRatio;
  let newHeight = height * pixelRatio;

  let canvas = new OffscreenCanvas(newWidth, newHeight); // document.createElement('canvas'); // Create a Canvas element.
  let ctx = canvas.getContext("2d"); // For Canvas returns 2D graphic.

  // Now that its high res we need to compensate so our images can be drawn as
  //normal, by scaling everything up by the pixelRatio.
  //  ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);

  let img = document.createElement("img");
  let data = svg.outerHTML; // Get SVG element as HTML code.
  Canvg.from(ctx, data, preset).then((result) => {
    result.resize(canvas.width, canvas.height, "xMidYMid meet");
    result.render().then(function () {
      // toDataURL return DataURI as Base64 format.
      img.id = id + "_png";

      canvas.convertToBlob().then((blobresult) => {
        img.src = URL.createObjectURL(blobresult);
        callback(img);
      });
    });
  });
}

export function hookFullScreen() {
  let cb = document.getElementById("fullscreenCheckbox");
  cb.checked = localStorage.getItem("cb-checked") === "true";

  fullScreen();
  cb.onchange = function () {
    fullScreen();
  };
}

function fullScreen() {
  let cb = document.getElementById("fullscreenCheckbox");
  let sideBar = document.getElementsByClassName("side-bar")[0];
  let main = document.getElementsByClassName("main")[0];
  let pageInfo = document.getElementsByClassName("page-info")[0];
  localStorage.setItem("cb-checked", cb.checked);

  if (cb.checked) {
    sideBar.style.display = "none";
    main.style.maxWidth = "100%";
    main.style.marginLeft = "0px";
    pageInfo.style.display = "none";
  } else {
    sideBar.style.display = "";
    main.style.maxWidth = "";
    main.style.marginLeft = "";
    pageInfo.style.display = "";
  }
}
