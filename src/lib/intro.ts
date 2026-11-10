/**
 * Home intro (the logo writes itself) — once per browser session.
 *
 * `introScript` runs inline in <head>, before first paint. On the first load
 * of "/" in a session it sets `data-tf-intro` on <html>, which is the only
 * thing the intro CSS keys on. It has to run there rather than in a
 * `useEffect`, or the finished hero would paint before the intro starts.
 *
 * The animations are created PAUSED (frozen on their first keyframe: logo
 * centred and unwritten, hero hidden). A CSS animation's clock starts when
 * styles resolve, not when pixels reach the screen, and a real browser can
 * take ~850ms between the two — long enough for the 1100ms write-on to be
 * nearly done before anything is visible. So the script waits for the first
 * paint, then sets `data-tf-intro="play"` on the next frame, and everything
 * starts together on screen. A fallback timer releases it if no paint entry
 * ever arrives, so the hero can never stay hidden.
 *
 * With JS disabled the attribute is never set, and the resting CSS state is
 * the finished page.
 */
export const INTRO_ATTR = "data-tf-intro";
export const INTRO_PLAY = "play";
export const INTRO_SESSION_KEY = "ticofit:intro";

const play = `function p(){if(d.getAttribute(a)!==null)d.setAttribute(a,${JSON.stringify(INTRO_PLAY)})}`;

export const introScript = `try{var d=document.documentElement,a=${JSON.stringify(INTRO_ATTR)},k=${JSON.stringify(
  INTRO_SESSION_KEY,
)};if(location.pathname==="/"&&!sessionStorage.getItem(k)){sessionStorage.setItem(k,"1");d.setAttribute(a,"");${play}var go=function(){requestAnimationFrame(p)};try{var o=new PerformanceObserver(function(l){if(l.getEntries().length){o.disconnect();go()}});o.observe({type:"paint",buffered:true})}catch(e){requestAnimationFrame(go)}setTimeout(p,3000)}}catch(e){}`;
