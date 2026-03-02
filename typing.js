/**
 * typingJS - Simula digitação com cursor piscando em elementos do DOM.
 * Use apenas com conteúdo confiável; innerHTML dos containers não é sanitizado (tags são preservadas no processamento).
 * @param {Object} options - Ver defaultOptions no código.
 * @returns {{ execute: () => void }}
 */
function typingJS(options) {
  const createStyle = () => {
    if (document.querySelector("#typingStyle")) return;
    const css = `.hide-element-typing{opacity:0;font-size:20px}.show-element-typing{opacity:1;transition:opacity .3s;font-size:20px}.cursor-typing{position:absolute;color:transparent}.cursor-typing:before{content:".";width:4px;height:10px;background-color:green;color:green;animation:cursor .8s infinite}@keyframes cursor{0%{opacity:1}50%{opacity:0}100%{opacity:1}}`;
    const $style = document.createElement("style");
    $style.innerHTML = css;
    $style.id = "typingStyle";
    document.head.appendChild($style);
  };

  const processText = (element) => {
    let index = 0;
    const wrapChar = (char) => `<span class="hide-element-typing char-typing">${char}</span>`;
    const replaceHtmlSymbols = (text) => text.replace(/&\w+;/g, (c) => wrapChar(c));

    const split = replaceHtmlSymbols(element.innerHTML).split("");

    const hasSplitElements = () => index < split.length;

    const skipTag = () => {
      const isNotTagOpening = () => split[index] != "<";
      const isTagClosing = () => split[index - 1] == ">";

      if (isNotTagOpening()) return;

      while (hasSplitElements()) {
        index++;
        if (isTagClosing()) break;
      }
    };

    const skipHtmlOpeningClosingSymbols = () => {
      const isNotHtmlOpeningTagSymbol = () => split.slice(index - 1, index + 1).join("") != ">&";

      const isNotHtmlClosingTagSymbol = () => split.slice(index - 1, index + 1).join("") != ";<";

      if (isNotHtmlOpeningTagSymbol()) return;

      while (hasSplitElements() && isNotHtmlClosingTagSymbol()) {
        index++;
      }
    };

    const processArray = () => {
      const isOpeningTag = () => split[index] == "<";

      while (hasSplitElements() && !isOpeningTag()) {
        split[index] = wrapChar(split[index]);
        index++;
      }
    };

    if (element.classList.contains("typing-ready")) return;

    element.classList.add("typing-ready");

    const steps = [skipTag, skipHtmlOpeningClosingSymbols, processArray];

    while (hasSplitElements()) {
      steps.forEach((stepFn) => stepFn());
    }

    element.innerHTML = split.join("");
  };

  function processHiddenElements(cursorElement, options) {
    let index = 0;
    const hiddenElements = [...document.querySelectorAll(".hide-element-typing")].filter((c) => c.innerText.length);

    const currentHiddenElement = () => hiddenElements[index];

    const calculateDelayTime = () => {
      const result = [
        {
          keyFn: () => index == 0,
          value: options.initialSpeedDelayTime,
        },
        {
          keyFn: () => currentHiddenElement().innerText.trim().length == 0,
          value: 0,
        },
        {
          keyFn: () => currentHiddenElement().classList.contains(options.typingSpeedDelayClass),
          value: options.typingSpeedDelay,
        },
        { keyFn: () => true, value: options.typingSpeedMillisecond },
      ].find((truthy) => truthy.keyFn());

      return result.value;
    };

    const setCursorOnLastElementCharacter = () => {
      const charElements = hiddenElements.filter((c) => c.classList.contains("char-typing"));
      const lastElement = charElements.slice(-1)[0];

      if (lastElement) {
        lastElement.append(cursorElement);
      }
      cursorElement.setAttribute("style", `top:auto;left:auto;position:absolute;opacity:1`);
    };

    (function removeClass() {
      if (index == hiddenElements.length) {
        setCursorOnLastElementCharacter();
        options.callback();
        return;
      }

      let time = calculateDelayTime();

      setCursorPosition(currentHiddenElement(), cursorElement);
      currentHiddenElement().classList.add("show-element-typing");

      setTimeout(() => {
        index++;
        removeClass();
      }, time);
    })();
  }

  const setCursorPosition = (element, cursorElement) => {
    const offsetY = 2 + window.scrollY,
      offsetX = 8 + window.scrollX;

    if (!element.classList.contains("char-typing")) return;

    const { x, y } = element.getBoundingClientRect();

    cursorElement.setAttribute("style", `top:${y + offsetY}px;left:${x + offsetX}px;opacity:1`);
  };

  const setClassDeepElements = (element, tagNames) => {
    for (let child of element.children || []) {
      setClassDeepElements(child, tagNames);
    }

    element.classList.contains("hide-element-typing") === false && element.classList.add("hide-element-typing");
    element.classList.contains("show-element-typing") && element.classList.remove("show-element-typing");

    tagNames.includes(element.tagName) && element.classList.add("char-typing");
  };

  const createCursor = () => {
    const cursor = document.createElement("span");
    cursor.classList.add("cursor-typing", "hide-element-typing");
    cursor.innerText = ".";
    document.body.append(cursor);
    return cursor;
  };

  const getCursor = () => {
    const cursor = document.querySelector(".cursor-typing");
    cursor && cursor.parentNode.removeChild(cursor);
    return createCursor();
  };

  options = options || {};
  const defaultOptions = {
    typingSpeedDelayClass: "stop",
    containerSelector: ".container-typing",
    containerReference: undefined,
    typingSpeedMillisecond: 20,
    typingSpeedDelay: 500,
    initialSpeedDelayTime: 1000,
    tagNamesToHide: ["LI"],
    callback: () => {},
  };

  options = { ...defaultOptions, ...options };

  const containersSelectorElements = [options.containerSelector].flat().map((selector) => ({
    selector: selector,
    element: document.querySelector(selector),
  }));
 
  const containerReference = [options.containerReference]
    .filter((c) => c)
    .flatMap((c) => (c instanceof NodeList && [...c]) || c)    
    .map((element) => ({ element: element }));

  const containersElements = [...containerReference, ...containersSelectorElements].filter(
    (container) => container.element
  );

  if (!containersElements.length)
    throw new Error(`Options doesn't contain a valid containerSelector or containerReference`);

   containersElements.forEach((container) => container.element.classList.add("hide-element-typing"));

  if (typeof typingJS.executing == "undefined") typingJS.executing = false;

  const proxy = options.callback;

  options.callback = () => {
    typingJS.executing = false;
    proxy();
  };

  createStyle();

  const step1 = (ctx) => (ctx.cursorElement = getCursor());
  const step2 = () =>
    containersElements.forEach((container) => setClassDeepElements(container.element, options.tagNamesToHide));
  const step3 = () => containersElements.forEach((container) => processText(container.element));
  const step4 = (ctx) => processHiddenElements(ctx.cursorElement, options);

  const chainOfResponsability = {
    steps: [step1, step2, step3, step4],
    context: {},
    execute: function () {
      this.steps.forEach((stepFn) => {
        stepFn(this.context);
      });
    },
  };

  const executeFn = () => {
    if (typingJS.executing) {
      console.warn("Already executing");
      return;
    }

    typingJS.executing = true;

    chainOfResponsability.execute();
  };
  return { execute: executeFn };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = typingJS;
}
