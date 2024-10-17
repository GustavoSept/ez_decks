export const OPENAI_SDK = 'OPENAI_SDK';

export const OPENAI_DEFAULT_FALLBACK_MODEL = 'gpt-4o-mini';

export const DEFAULT_MAX_TOKEN_OUTPUT = 1152; // 1024 + 128

export const DEFAULT_USER_MESSAGE_PREFIX = 'Translate the following words: ';

export const DEFAULT_SYS_MESSAGE = `Translate the provided German words into English. Return the response as an object with a key "response". The value should be an array of objects, where each object contains:
   - "german_word": The German word being translated.
   - "translations": An object with keys representing grammatical attributes (such as 'verb', 'noun', 'adjective').
   - For each grammatical attribute, provide a list of possible English translations.

   Respond only with the JSON object in a single line.

   Example response:
   {"response": [{"german_word": "gehen","translations": {"verb": ["go", "walk"],"noun": ["going", "walk"]}},{"german_word": "Haus","translations": {"noun": ["house", "home"]}},{"german_word": "schön","translations": {"adjective": ["beautiful", "pretty"]}}]}`;
