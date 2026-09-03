import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { AISettingConfig, AIProvider } from './types';

export interface LLMCallOptions {
  role?: 'parse' | 'reason';
  modelOverride?: string;
  providerOverride?: AIProvider;
}

export interface LLMTraceResult<T> {
  data: T;
  thinking?: string;
  model: string;
  provider: string;
  durationMs: number;
}

export async function callLLMJSON<T>(
  prompt: string,
  systemPrompt: string,
  config: AISettingConfig,
  fallbackMockFn: () => T,
  options?: LLMCallOptions
): Promise<T> {
  const res = await callLLMWithTrace<T>(prompt, systemPrompt, config, fallbackMockFn, options);
  return res.data;
}

export async function callLLMWithTrace<T>(
  prompt: string,
  systemPrompt: string,
  config: AISettingConfig,
  fallbackMockFn: () => T,
  options?: LLMCallOptions
): Promise<LLMTraceResult<T>> {
  const provider = options?.providerOverride || config.provider;
  const role = options?.role || 'reason';
  const startTime = Date.now();

  // Role-based model selection
  let selectedModel = options?.modelOverride || config.model;
  if (provider === 'nvidia') {
    if (role === 'parse') {
      selectedModel = config.modelParse || process.env.MODEL_PARSE || 'meta/llama-3.2-11b-vision-instruct';
    } else {
      selectedModel = config.modelReason || process.env.MODEL_REASON || 'meta/llama-3.2-90b-vision-instruct';
    }
  } else if (provider === 'groq') {
    if (role === 'parse') {
      selectedModel = config.modelParse || 'qwen/qwen3.8-27b';
    } else {
      selectedModel = config.modelReason || 'groq/compound-mini';
    }
  } else if (provider === 'gemini') {
    if (role === 'parse') {
      selectedModel = config.modelParse || process.env.MODEL_PARSE || 'gemini-3.6-flash';
    } else {
      selectedModel = config.modelReason || process.env.MODEL_REASON || 'gemini-3.6-flash';
    }
  }

  // If user explicitly set provider to 'mock', run the offline rule-based heuristic
  if (provider === 'mock') {
    return {
      data: fallbackMockFn(),
      thinking: 'Local offline heuristic rule engine executed.',
      model: 'heuristic-engine',
      provider: 'mock',
      durationMs: 10,
    };
  }

  try {
    if (provider === 'groq') {
      const apiKey = config?.apiKeys?.groq || process.env.GROQ_API_KEY;
      if (!apiKey) {
        throw new Error('Groq API Key is missing. Please ensure GROQ_API_KEY is configured in server environment variables.');
      }

      const groq = new OpenAI({
        apiKey,
        baseURL: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
      });

      const response = await groq.chat.completions.create({
        model: selectedModel || (role === 'parse' ? 'qwen/qwen3.8-27b' : 'groq/compound-mini'),
        messages: [
          { role: 'system', content: `${systemPrompt}\n\nIMPORTANT: Respond strictly with valid JSON only. Keep responses compact and fully well-formed.` },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 8192,
      });

      const rawMsg: any = response.choices[0]?.message;
      const text = rawMsg?.content || '{}';
      const thinking = rawMsg?.reasoning_content || extractThinkingTags(text);
      const parsed = parseCleanJSON<T>(text);

      return {
        data: parsed,
        thinking,
        model: selectedModel,
        provider,
        durationMs: Date.now() - startTime,
      };
    }

    if (provider === 'nvidia') {
      const apiKey = config?.apiKeys?.nvidia || process.env.NVIDIA_API_KEY;
      if (!apiKey) {
        throw new Error('NVIDIA API Key is missing. Please ensure NVIDIA_API_KEY is configured in server environment variables.');
      }

      const nvidia = new OpenAI({
        apiKey,
        baseURL: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
      });

      const response = await nvidia.chat.completions.create({
        model: selectedModel || (role === 'parse' ? 'meta/llama-3.2-11b-vision-instruct' : 'meta/llama-3.2-90b-vision-instruct'),
        messages: [
          { role: 'system', content: `${systemPrompt}\n\nIMPORTANT: Respond with pure, valid JSON only. Do not wrap in markdown or commentary.` },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 8192,
      });

      const rawMsg: any = response.choices[0]?.message;
      const text = rawMsg?.content || '{}';
      const thinking = rawMsg?.reasoning_content || extractThinkingTags(text);
      const parsed = parseCleanJSON<T>(text);

      return {
        data: parsed,
        thinking,
        model: selectedModel,
        provider,
        durationMs: Date.now() - startTime,
      };
    }

    if (provider === 'gemini') {
      const apiKey = config?.apiKeys?.gemini || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Gemini API Key is missing. Please ensure GEMINI_API_KEY is configured in server environment variables.');
      }
      const genAI = new GoogleGenerativeAI(apiKey);

      const geminiModel = genAI.getGenerativeModel({
        model: selectedModel || 'gemini-3.6-flash',
        systemInstruction: systemPrompt,
        generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 8192 },
      });

      const result = await geminiModel.generateContent(prompt);
      const text = result.response.text();
      const thinking = extractThinkingTags(text);
      const parsed = parseCleanJSON<T>(text);

      return {
        data: parsed,
        thinking,
        model: selectedModel,
        provider,
        durationMs: Date.now() - startTime,
      };
    }

    if (provider === 'openai') {
      const apiKey = config?.apiKeys?.openai || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API Key is missing. Please ensure OPENAI_API_KEY is configured in server environment variables.');
      }
      const openai = new OpenAI({ apiKey });
      const response = await openai.chat.completions.create({
        model: selectedModel || (role === 'parse' ? 'gpt-4o-mini' : 'gpt-4o'),
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt + '\nRespond strictly with JSON.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 8192,
      });
      const rawMsg: any = response.choices[0]?.message;
      const text = rawMsg?.content || '{}';
      const thinking = rawMsg?.reasoning_content || extractThinkingTags(text);
      const parsed = parseCleanJSON<T>(text);

      return {
        data: parsed,
        thinking,
        model: selectedModel,
        provider,
        durationMs: Date.now() - startTime,
      };
    }

    if (provider === 'anthropic') {
      const apiKey = config?.apiKeys?.anthropic || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('Anthropic API Key is missing. Please ensure ANTHROPIC_API_KEY is configured in server environment variables.');
      }
      const anthropic = new Anthropic({ apiKey });
      const response = await anthropic.messages.create({
        model: selectedModel || (role === 'parse' ? 'claude-3-5-haiku-20241022' : 'claude-3-5-sonnet-20241022'),
        max_tokens: 8192,
        system: systemPrompt + '\nIMPORTANT: Output strictly valid JSON.',
        messages: [{ role: 'user', content: prompt }],
      });

      const block = response.content[0];
      const text = block.type === 'text' ? block.text : '{}';
      const thinking = extractThinkingTags(text);
      const parsed = parseCleanJSON<T>(text);

      return {
        data: parsed,
        thinking,
        model: selectedModel,
        provider,
        durationMs: Date.now() - startTime,
      };
    }

    throw new Error(`Unsupported provider: ${provider}`);
  } catch (error: any) {
    const errorMsg = error?.message || 'Inference call failed or timed out';
    console.error(`LLM Call Failed (${provider} - ${selectedModel}):`, errorMsg);
    throw new Error(`Model Error [${provider.toUpperCase()} - ${selectedModel}]: ${errorMsg}`);
  }
}

function extractThinkingTags(text: string): string | undefined {
  const match = text.match(/<think>([\s\S]*?)<\/think>/i);
  return match ? match[1].trim() : undefined;
}

/**
 * Robust JSON parser with automatic boundary extraction and syntax repair
 */
function parseCleanJSON<T>(text: string): T {
  // Remove markdown fences
  let cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Locate JSON boundaries
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let startIdx = -1;
  let isArray = false;

  if (firstBrace !== -1 && firstBracket !== -1) {
    if (firstBrace < firstBracket) {
      startIdx = firstBrace;
      isArray = false;
    } else {
      startIdx = firstBracket;
      isArray = true;
    }
  } else if (firstBrace !== -1) {
    startIdx = firstBrace;
    isArray = false;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    isArray = true;
  }

  if (startIdx !== -1) {
    cleaned = cleaned.substring(startIdx);
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch (err1) {
    const repaired = repairTruncatedJSON(cleaned, isArray);
    try {
      return JSON.parse(repaired) as T;
    } catch (err2) {
      console.error('Failed to parse and repair JSON response from LLM:', text.slice(0, 300) + '...');
      throw new Error(`Unterminated or invalid JSON from model (${(err1 as any)?.message || 'SyntaxError'})`);
    }
  }
}

function repairTruncatedJSON(jsonStr: string, isArray: boolean): string {
  let s = jsonStr.trim();
  s = s.replace(/,\s*$/, '');

  let inString = false;
  let escapeNext = false;
  const openStack: string[] = [];

  for (let i = 0; i < s.length; i++) {
    const char = s[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{') openStack.push('}');
      else if (char === '[') openStack.push(']');
      else if (char === '}' || char === ']') {
        if (openStack.length > 0 && openStack[openStack.length - 1] === char) {
          openStack.pop();
        }
      }
    }
  }

  if (inString) {
    s += '"';
  }

  s = s.replace(/,\s*$/, '');

  while (openStack.length > 0) {
    const closer = openStack.pop();
    s += closer;
  }

  return s;
}
