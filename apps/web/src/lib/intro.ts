/** Only the browser tests set this, so they can reach the page without sitting through the intro. */
const SKIP_KEY = "wbsk-intro-skip-for-tests";
/** If the page's scripts never start, the veil lifts by itself (the page works without them). */
const FAILSAFE_MS = 6000;

/**
 * Runs in the head, before the first paint, so the homepage is never seen without the veil. It also
 * starts the intro's small files downloading as soon as the page is parsed, ahead of its scripts.
 * Decision 11 and G2: the homepage only, each time it's opened or refreshed, never on /#enquire or
 * with data-saver on. Moving within the site and browser Back keep the place, so they don't replay it.
 */
export function introDecisionScript(homePath: string) {
  return `(function(){try{var d=document.documentElement;if(location.pathname.replace(/\\/+$/,"")!==${JSON.stringify(homePath)})return;if(location.hash==="#enquire")return;var c=navigator.connection;if(c&&c.saveData)return;if(sessionStorage.getItem("${SKIP_KEY}"))return;var n=performance.getEntriesByType("navigation")[0];if(n&&n.type==="back_forward")return;if(n&&n.type==="reload"){history.scrollRestoration="manual";var t=function(){scrollTo(0,0)};addEventListener("DOMContentLoaded",t);addEventListener("load",t)}d.dataset.intro="play";document.addEventListener("DOMContentLoaded",function(){document.querySelectorAll(".wbsk-intro [data-src]").forEach(function(e){e.src=innerWidth<820&&e.dataset.srcPhone||e.dataset.src})});setTimeout(function(){if(!window.__wbskIntro)delete d.dataset.intro},${FAILSAFE_MS})}catch(e){}})()`;
}
