import type { ExtractionInput, LlmProvider, ProviderTier } from "./types";

type MockResponse = unknown | Error;

/** Test provider: replays queued responses (or throws queued errors) and records inputs. */
export class MockProvider implements LlmProvider {
  readonly calls: ExtractionInput[] = [];
  private readonly queue: MockResponse[];

  constructor(
    responses: MockResponse[],
    readonly tier: ProviderTier = 1,
    readonly name = "mock",
  ) {
    this.queue = [...responses];
  }

  async extract(input: ExtractionInput): Promise<unknown> {
    this.calls.push(input);
    if (this.queue.length === 0) throw new Error("MockProvider: no responses left");
    const next = this.queue.shift();
    if (next instanceof Error) throw next;
    return next;
  }
}
