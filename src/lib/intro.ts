/**
 * Home intro (the logo writes itself) — once per browser session.
 *
 * `introScript` runs inline in <head>, before first paint. On the first load
 * of "/" in a session it sets `data-tf-intro` on <html>, which is the only
 * thing the intro CSS keys on. It has to run there rather than in a
 * `useEffect`: the animation starts at first paint, and an effect only runs
 * after hydration — by then the finished hero has already been painted.
 *
 * With JS disabled the attribute is never set, and the resting CSS state is
 * the finished page.
 */
export const INTRO_ATTR = "data-tf-intro";
export const INTRO_SESSION_KEY = "ticofit:intro";

export const introScript = `try{if(location.pathname==="/"&&!sessionStorage.getItem(${JSON.stringify(
  INTRO_SESSION_KEY,
)})){sessionStorage.setItem(${JSON.stringify(INTRO_SESSION_KEY)},"1");document.documentElement.setAttribute(${JSON.stringify(
  INTRO_ATTR,
)},"")}}catch(e){}`;
