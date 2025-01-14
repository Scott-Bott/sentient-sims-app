/* eslint-disable camelcase */
/* eslint-disable class-methods-use-this */
import { encode as gpt3Encoder } from '@nem035/gpt-3-encoder';
import { SentientMemory } from '../models/SentientMemory';
import { PromptRequest } from '../models/PromptRequest';
import { defaultSystemPrompt } from '../constants';
import { removeLastParagraph, trimIncompleteSentence } from './PromptFormatter';

export class OpenAIPromptFormatter {
  private readonly maxTokens = 3950;

  encode(prompt: string): number[] {
    return gpt3Encoder(prompt);
  }

  combineFormattedPrompt(
    systemPrompt: string,
    participants: string,
    location: string,
    memoriesToInsert: string[],
    actions?: string
  ): string {
    return [participants, location, memoriesToInsert.join('\n'), actions].join(
      '\n'
    );
  }

  formatMemory(memory: SentientMemory) {
    const entries = [
      memory.action && memory.action.trim(),
      memory.content && memory.content.trim(),
      memory.observation && memory.observation.trim(),
    ].filter(Boolean);

    if (entries.length > 0) {
      return entries.join('\n');
    }

    return undefined;
  }

  formatOutput(text: string): string {
    let output = removeLastParagraph(text);
    output = trimIncompleteSentence(text);
    return output.trim();
  }

  formatActions(preAction?: string, action?: string) {
    const actions: string[] = [];

    if (preAction) {
      actions.push(preAction.trim());
    }
    if (action) {
      actions.push(action.trim());
    }

    if (actions.length > 0) {
      return actions.join(' ');
    }

    return undefined;
  }

  formatPrompt({
    memories,
    participants,
    location,
    pre_action,
    action,
    systemPrompt = defaultSystemPrompt,
  }: PromptRequest) {
    const actions = this.formatActions(pre_action, action);

    const prePromptTokenCount = this.encode(
      systemPrompt +
        this.combineFormattedPrompt(
          systemPrompt,
          participants,
          location,
          [],
          actions
        )
    ).length;

    const memoriesToInsert: string[] = [];
    let memoryTokenCount = 0;
    // eslint-disable-next-line no-plusplus
    for (let i = memories.length - 1; i >= 0; i--) {
      const memory = memories[i];
      if (memoryTokenCount + prePromptTokenCount > this.maxTokens) {
        break;
      }

      const formattedMemory = this.formatMemory(memory);
      if (formattedMemory) {
        memoriesToInsert.unshift(formattedMemory);
        const { length } = this.encode(formattedMemory);
        memoryTokenCount += length;
      }
    }

    let prompt = this.combineFormattedPrompt(
      systemPrompt,
      participants,
      location,
      memoriesToInsert,
      actions
    );

    let tokenCount = this.encode(systemPrompt + prompt).length;
    while (tokenCount > this.maxTokens) {
      memoriesToInsert.shift();
      prompt = this.combineFormattedPrompt(
        systemPrompt,
        participants,
        location,
        memoriesToInsert,
        actions
      );
      tokenCount = this.encode(systemPrompt + prompt).length;
    }

    return prompt;
  }
}
