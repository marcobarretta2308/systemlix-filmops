// OpenAI client stub — connect when OPENAI_API_KEY is configured.

export interface BreakdownRequest {
  projectId: string;
  scriptText: string;
}

export interface BreakdownResponse {
  scenes: unknown[];
  model: string;
}

export async function generateScriptBreakdown(
  _request: BreakdownRequest
): Promise<BreakdownResponse | null> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  // When openai SDK is installed:
  // const openai = new OpenAI({ apiKey })
  // const completion = await openai.chat.completions.create({ ... })
  return null;
}

export const isOpenAIConfigured = () => Boolean(process.env.OPENAI_API_KEY);
