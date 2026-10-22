// Decision Lab "gate" replies: the model asks for more options instead of analysing.
// Shared by the client (to allow a re-run) and the server (a gate reply is not a
// full analysis, so it never consumes a Free user's monthly allowance).

const ONE_OPTION_GATE = "I can see one option in what you've described";
const ZERO_OPTION_GATE = "I couldn't identify multiple options to compare";

export function isOneOptionGate(content: string) { return content.includes(ONE_OPTION_GATE); }
export function isZeroOptionGate(content: string) { return content.includes(ZERO_OPTION_GATE); }
export function isGateMessage(content: string) { return isOneOptionGate(content) || isZeroOptionGate(content); }
