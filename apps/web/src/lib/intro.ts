const SEEN_KEY = "wbsk-intro-seen";
/** If the page's scripts never start, the veil lifts by itself (the page works without them). */
const FAILSAFE_MS = 6000;

/**
 * Runs in the head, before the first paint, so the homepage is never seen without the veil.
 * Decision 11 and G2: the homepage only, once a visit, never on /#enquire or with data-saver on.
 */
export function introDecisionScript(homePath: string) {
  return `(function(){try{var d=document.documentElement;if(location.pathname.replace(/\\/+$/,"")!==${JSON.stringify(homePath)})return;if(location.hash==="#enquire")return;var c=navigator.connection;if(c&&c.saveData)return;if(sessionStorage.getItem("${SEEN_KEY}"))return;sessionStorage.setItem("${SEEN_KEY}","1");d.dataset.intro="play";setTimeout(function(){if(!window.__wbskIntro)delete d.dataset.intro},${FAILSAFE_MS})}catch(e){}})()`;
}
