import { describe, expect, it } from "vitest";

import { normalizeName, stripNumbersFromName } from "../tools/shared/listUtils.js";
import { parseInviteLine, parseInvites, normalizePhone } from "../tools/shared/inviteUtils.mjs";

describe("listUtils", () => {
  it("stripNumbersFromName removes numeric noise while preserving separators", () => {
    expect(stripNumbersFromName(" Ana 11988776655 ")).toBe("Ana");
    expect(stripNumbersFromName("Carlos Jr. (11) 4444-3333"))
      .toBe("Carlos Jr");
    expect(stripNumbersFromName("Maria-Clara 9988"))
      .toBe("Maria-Clara");
  });

  it("normalizeName capitalizes preserving accents, hifens and apostrophes", () => {
    expect(normalizeName("  mário   d'ávila  ")).toBe("Mário d'Ávila");
    expect(normalizeName("ana-clara    de  souza"))
      .toBe("Ana-Clara de Souza");
    expect(normalizeName("JOÃO da SILVA-neto"))
      .toBe("João da Silva-Neto");
  });
});

describe("inviteUtils", () => {
  it("normalizePhone keeps longest brazilian number", () => {
    expect(normalizePhone("+55 (11) 98888-7777"))
      .toBe("(11) 98888-7777");
    expect(normalizePhone("11 2345-6789")).toBe("(11) 2345-6789");
  });

  it("parseInviteLine parses titular, acompanhantes e telefone complexos", () => {
    const invite = parseInviteLine(
      "  maria-clara d'Ávila +55 (11) 98888-7777, joao-pedro 21, ana lúcia  "
    );

    expect(invite).not.toBeNull();
    expect(invite?.titular).toBe("Maria-Clara d'Ávila");
    expect(invite?.acompanhantes).toEqual(["Joao-Pedro", "Ana Lúcia"]);
    expect(invite?.telefone).toBe("(11) 98888-7777");
    expect(invite?.total).toBe(3);
  });

  it("parseInvites ignora linhas vazias e normaliza nomes", () => {
    const result = parseInvites(`\nJoão da Silva 11999990000; maria\n\n  ana  `);
    expect(result).toHaveLength(2);
    expect(result[0].titular).toBe("João da Silva");
    expect(result[0].acompanhantes).toEqual(["Maria"]);
    expect(result[0].telefone).toBe("(11) 99999-0000");
    expect(result[1].titular).toBe("Ana");
  });
});
