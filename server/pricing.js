// USD per million tokens. Cache writes are the 5-minute TTL rate (1.25x input);
// cache reads are 0.1x input unless the model has its own rate.
const MODELS = [
  { match: /fable-5-1|mythos-5-1/, input: 10, output: 50, cacheRead: 0.25, window: 1_000_000, name: 'Fable 5.1' },
  { match: /fable-5|mythos-5/, input: 10, output: 50, window: 1_000_000, name: 'Fable 5' },
  { match: /opus-5-5/, input: 4, output: 20, cacheRead: 0.2, window: 1_000_000, name: 'Opus 5.5' },
  { match: /opus-5/, input: 5, output: 25, window: 1_000_000, name: 'Opus 5' },
  { match: /opus-4-[678]/, input: 5, output: 25, window: 1_000_000, name: 'Opus 4' },
  { match: /opus-4-5/, input: 5, output: 25, window: 200_000, name: 'Opus 4.5' },
  { match: /opus/, input: 15, output: 75, window: 200_000, name: 'Opus' },
  { match: /sonnet-5/, input: 2, output: 10, window: 1_000_000, name: 'Sonnet 5' },
  { match: /sonnet-4-6/, input: 3, output: 15, window: 1_000_000, name: 'Sonnet 4.6' },
  { match: /sonnet/, input: 3, output: 15, window: 200_000, name: 'Sonnet' },
  { match: /haiku-4-5/, input: 1, output: 5, window: 200_000, name: 'Haiku 4.5' },
  { match: /haiku-3-5|3-5-haiku/, input: 0.8, output: 4, window: 200_000, name: 'Haiku 3.5' },
  { match: /haiku/, input: 0.25, output: 1.25, window: 200_000, name: 'Haiku' },
];

const FALLBACK = MODELS.find(m => m.name === 'Sonnet 5');

function modelInfo(modelId = '') {
  return MODELS.find(m => m.match.test(modelId)) || FALLBACK;
}

function costOf(modelId, usage) {
  const p = modelInfo(modelId);
  const cacheWrite = p.input * 1.25;
  const cacheRead = p.cacheRead ?? p.input * 0.1;
  return (
    usage.input * p.input +
    usage.output * p.output +
    usage.cacheCreation * cacheWrite +
    usage.cacheRead * cacheRead
  ) / 1e6;
}

module.exports = { modelInfo, costOf };
