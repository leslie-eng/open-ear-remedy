/**
 * A deliberately simple safety net under the AI Companion: if a message mentions suicide,
 * self-harm or wanting to die, the reply always carries the Crisis Help link, whatever the
 * model says. It errs towards flagging; a false alarm only shows a link.
 * English, Swahili and common Sheng phrasings.
 */
const CRISIS_PATTERNS = [
  /\bsuicid/,
  /\bkill(ing)? my ?self\b/,
  /\bend(ing)? (my|it all|my own) li(fe|ves)\b/,
  /\bend it all\b/,
  /\bself[- ]?harm/,
  /\b(hurt|harm|cut|cutting)(ing)? my ?self\b/,
  /\b(want|wanna|wish) to die\b/,
  /\bbetter off dead\b/,
  /\b(don'?t|do not) want to (live|be alive|exist)\b/,
  /\bno reason to live\b/,
  /\boverdose\b/,
  /\bkujiua\b/,
  /\bnataka kufa\b/,
  /\bsitaki kuishi\b/,
];

export function mentionsCrisis(text) {
  const t = String(text).toLowerCase().replace(/[’']/g, "'");
  return CRISIS_PATTERNS.some((p) => p.test(t));
}
