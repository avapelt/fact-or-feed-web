// Removes [3]-style source numbers from text before it is shown. Only for display:
// the original text (with the numbers) is still used to find which sources were cited.
export function stripCites(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/[ \t]*\[\d+(?:\s*[,–-]\s*\d+)*\](?:\s*\[\d+(?:\s*[,–-]\s*\d+)*\])*/g, '')
    .replace(/[ \t]+([.,;:!?。，、])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
