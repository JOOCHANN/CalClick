import { describe, it, expect, vi, beforeEach } from "vitest";

const createMock = vi.fn();

vi.mock("@/services/openai", () => ({
  getOpenAI: () => ({
    chat: { completions: { create: createMock } },
  }),
}));

vi.mock("@/services/foods", () => ({
  findFoodByAlias: vi.fn(async () => null),
  findFoodsByAliases: vi.fn(async () => new Map()),
}));

import { POST } from "./route";

function makeRequest(image?: Blob): Request {
  const form = new FormData();
  if (image) form.append("image", image, "test.jpg");
  return new Request("http://localhost/api/recognize", {
    method: "POST",
    body: form,
  });
}

const validResponse = (content: string) => ({
  choices: [{ message: { content } }],
});

describe("POST /api/recognize", () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it("returns 400 when image missing", async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
  });

  it("returns 200 + parsed result on success", async () => {
    createMock.mockResolvedValueOnce(
      validResponse(
        JSON.stringify({
          candidates: [{ name: "김치찌개", grams: 350, confidence: 0.9 }],
        }),
      ),
    );
    const blob = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], {
      type: "image/jpeg",
    });
    const res = await POST(makeRequest(blob));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.candidates[0].name).toBe("김치찌개");
  });

  it("returns 502 on schema violation", async () => {
    createMock.mockResolvedValueOnce(
      validResponse(JSON.stringify({ candidates: [] })),
    );
    const blob = new Blob([new Uint8Array([0xff])], { type: "image/jpeg" });
    const res = await POST(makeRequest(blob));
    expect(res.status).toBe(502);
  });
});
