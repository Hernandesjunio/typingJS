import { createRequire } from "module";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const require = createRequire(import.meta.url);
const typingJS = require("./typing.js");

describe("typingJS", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    typingJS.executing = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("opções e validação", () => {
    it("lança erro quando não há container válido (selector inexistente)", () => {
      expect(() => {
        typingJS({ containerSelector: ".nao-existe" });
      }).toThrow(/doesn't contain a valid containerSelector or containerReference/);
    });

    it("lança erro quando containerReference é array vazio", () => {
      expect(() => {
        typingJS({ containerReference: [] });
      }).toThrow(/doesn't contain a valid containerSelector or containerReference/);
    });

    it("aceita container por selector e retorna objeto com execute", () => {
      const container = document.createElement("div");
      container.className = "container-typing";
      container.innerHTML = "Olá";
      document.body.appendChild(container);

      const instance = typingJS({ containerSelector: ".container-typing" });
      expect(instance).toHaveProperty("execute");
      expect(typeof instance.execute).toBe("function");
    });

    it("aceita container por containerReference (elemento único)", () => {
      const container = document.createElement("div");
      container.innerHTML = "Teste";
      document.body.appendChild(container);

      const instance = typingJS({ containerReference: container });
      expect(instance).toHaveProperty("execute");
    });

    it("aceita containerReference como NodeList", () => {
      const div1 = document.createElement("div");
      div1.innerHTML = "A";
      document.body.appendChild(div1);
      const div2 = document.createElement("div");
      div2.innerHTML = "B";
      document.body.appendChild(div2);

      const instance = typingJS({
        containerReference: document.querySelectorAll("div"),
      });
      expect(instance).toHaveProperty("execute");
    });

    it("aceita múltiplos selectors em array", () => {
      const c1 = document.createElement("div");
      c1.className = "c1";
      c1.innerHTML = "1";
      document.body.appendChild(c1);
      const c2 = document.createElement("div");
      c2.className = "c2";
      c2.innerHTML = "2";
      document.body.appendChild(c2);

      const instance = typingJS({ containerSelector: [".c1", ".c2"] });
      expect(instance).toHaveProperty("execute");
    });
  });

  describe("execução e callback", () => {
    it("chama callback ao final da animação (fake timers)", () => {
      vi.useFakeTimers();

      const container = document.createElement("div");
      container.className = "container-typing";
      container.innerHTML = "ab";
      document.body.appendChild(container);

      const callback = vi.fn();
      const instance = typingJS({
        containerSelector: ".container-typing",
        callback,
        typingSpeedMillisecond: 10,
        initialSpeedDelayTime: 10,
      });

      instance.execute();

      // Avançar tempo até passar todos os caracteres (2 chars + delays)
      vi.advanceTimersByTime(5000);
      expect(callback).toHaveBeenCalled();
    });

    it("define typingJS.executing como false após callback", () => {
      vi.useFakeTimers();

      const container = document.createElement("div");
      container.className = "container-typing";
      container.innerHTML = "x";
      document.body.appendChild(container);

      const callback = vi.fn();
      typingJS({
        containerSelector: ".container-typing",
        callback,
        typingSpeedMillisecond: 10,
        initialSpeedDelayTime: 10,
      }).execute();

      expect(typingJS.executing).toBe(true);
      vi.advanceTimersByTime(2000);
      expect(callback).toHaveBeenCalled();
      expect(typingJS.executing).toBe(false);
    });
  });

  describe("bloqueio de execução concorrente", () => {
    it("não inicia nova execução se já estiver executando (apenas avisa)", () => {
      vi.useFakeTimers();

      const container = document.createElement("div");
      container.className = "container-typing";
      container.innerHTML = "longo texto para demorar";
      document.body.appendChild(container);

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const instance = typingJS({
        containerSelector: ".container-typing",
        callback: () => {},
        typingSpeedMillisecond: 100,
        initialSpeedDelayTime: 500,
      });

      instance.execute();
      instance.execute();
      expect(warnSpy).toHaveBeenCalledWith("Already executing");

      warnSpy.mockRestore();
    });
  });

  describe("edge cases", () => {
    it("não quebra com container vazio (sem nós de texto visíveis)", () => {
      vi.useFakeTimers();

      const container = document.createElement("div");
      container.className = "container-typing";
      container.innerHTML = "";
      document.body.appendChild(container);

      const callback = vi.fn();
      const instance = typingJS({
        containerSelector: ".container-typing",
        callback,
      });

      expect(() => instance.execute()).not.toThrow();
      vi.advanceTimersByTime(500);
      expect(callback).toHaveBeenCalled();
    });

    it("aplica opções padrão quando options está vazio", () => {
      const container = document.createElement("div");
      container.className = "container-typing";
      container.innerHTML = "x";
      document.body.appendChild(container);

      const instance = typingJS({ containerSelector: ".container-typing" });
      expect(instance.execute).toBeDefined();
    });

    it("injeta estilo no head na primeira execução", () => {
      const container = document.createElement("div");
      container.className = "container-typing";
      container.innerHTML = "a";
      document.body.appendChild(container);

      expect(document.querySelector("#typingStyle")).toBeNull();
      typingJS({ containerSelector: ".container-typing" }).execute();
      expect(document.querySelector("#typingStyle")).not.toBeNull();
      expect(document.querySelector("#typingStyle").innerHTML).toContain("cursor-typing");
    });
  });
});
