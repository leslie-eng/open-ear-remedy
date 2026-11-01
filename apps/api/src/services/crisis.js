/**
 * A deliberately simple safety net under the AI Companion: if a message mentions suicide,
 * self-harm, wanting to die, harming someone else, or being abused, the reply always carries
 * the Crisis Help link, whatever the model says. It errs towards flagging; a false alarm only
 * shows a link. English, Swahili and common Sheng phrasings.
 */
const CRISIS_PATTERNS = [
  // Suicide and wanting to die
  /\bsuicid/,
  /\bkill(ing)? my ?self\b/,
  /\btake my (own )?life\b/,
  /\bend(ing)? (my|my own) li(fe|ves)\b/,
  /\bend it all\b/,
  /\b(want|wanna|wish) to die\b/,
  /\bbetter off dead\b/,
  /\b(don'?t|do not) want to (live|be alive|exist)\b/,
  /\bno reason to live\b/,
  /\b(not|never) wake up\b/,
  /\boverdose\b/,
  /\bhow many (pills|tablets)\b/,
  /\bkujiua\b/,
  /\bnataka kufa\b/,
  /\bsitaki kuishi\b/,
  // Self-harm
  /\bself[- ]?harm/,
  /\b(hurt|harm|cut|cutting|burn|burning)(ing)? my ?self\b/,
  // Harming others
  /\b(hurt|hurting|harm|harming|kill|killing) (someone|somebody|him|her|them|people|my (child|baby|kids?|wife|husband|partner))\b/,
  // Abuse and danger at home
  /\b(hits|beats|beat|chokes|choked|rapes?|raped|abuses?|abused) me\b/,
  /\bscared to go home\b/,
  /\bananipiga\b/,
];

export function mentionsCrisis(text) {
  const t = String(text).toLowerCase().replace(/[’']/g, "'");
  return CRISIS_PATTERNS.some((p) => p.test(t));
}
