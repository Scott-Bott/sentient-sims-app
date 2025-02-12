/* eslint-disable camelcase */
/* eslint-disable class-methods-use-this */
import { SentientMemory } from '../models/SentientMemory';
import { PromptRequest } from '../models/PromptRequest';
import { llamaTokenizer } from '../llama/LLamaTokenizer';
import { defaultCustomLLMPrompt } from '../constants';
import { filterNullAndUndefined } from '../util/filter';
import { removeLastParagraph, trimIncompleteSentence } from './PromptFormatter';

export class MythoMaxPromptFormatter {
  private readonly maxTokens = 3950;

  public readonly userToken = '### Instruction:';

  public readonly assistantToken = '### Response:';

  encode(prompt: string): number[] {
    return llamaTokenizer.encode(prompt);
  }

  combineFormattedPrompt(
    systemPrompt: string,
    participants: string,
    location: string,
    memoriesToInsert: string[],
    actions?: string,
    preResponse?: string
  ): string {
    return filterNullAndUndefined([
      systemPrompt,
      participants,
      '',
      location,
      '',
      memoriesToInsert.join('\n'),
      '',
      actions,
      '',
      this.assistantToken,
      preResponse,
    ]).join('\n');
  }

  formatMemory(memory: SentientMemory) {
    const entries = [
      memory.action && `${this.userToken}\n${memory.action.trim()}`,
      memory.content && `${this.assistantToken}\n${memory.content.trim()}`,
      memory.observation && `${this.userToken}\n${memory.observation.trim()}`,
    ].filter(Boolean);

    if (entries.length > 0) {
      return entries.join('\n');
    }

    return undefined;
  }

  formatOutput(text: string): string {
    let output = text.split(this.userToken, 1)[0].trim();
    output = output.split(this.assistantToken, 1)[0].trim();
    output = trimIncompleteSentence(output);
    output = removeLastParagraph(output);
    return output.trim();
  }

  formatWantsOutput(preResponse: string, text: string): string {
    let output = this.formatOutput(text);
    if (output.includes('I would')) {
      output = output.split('I would', 2)[1].trim();
    }

    return [preResponse.trim(), output].join(' ');
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
      return `${this.userToken}\n${actions.join(' ')}`;
    }

    return undefined;
  }

  formatPrompt({
    memories,
    participants,
    location,
    pre_action,
    action,
    preResponse,
    systemPrompt = defaultCustomLLMPrompt,
  }: PromptRequest) {
    const actions = this.formatActions(pre_action, action);

    const prePromptTokenCount = this.encode(
      this.combineFormattedPrompt(
        systemPrompt,
        participants,
        location,
        [],
        actions,
        preResponse
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
      actions,
      preResponse
    );

    let tokenCount = this.encode(prompt).length;
    while (tokenCount > this.maxTokens) {
      memoriesToInsert.shift();
      prompt = this.combineFormattedPrompt(
        systemPrompt,
        participants,
        location,
        memoriesToInsert,
        actions,
        preResponse
      );
      tokenCount = this.encode(prompt).length;
    }

    return prompt;
  }
}
