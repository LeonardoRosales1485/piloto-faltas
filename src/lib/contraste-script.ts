/** Clave y script del modo alto contraste. Sin 'use client': lo usa el layout del servidor. */
export const CLAVE_CONTRASTE = 'faltas-piloto:contraste';
export const MEDIA_CONTRASTE = '(prefers-contrast: more)';

/** Corre en el <head> antes de pintar: elección guardada o, si no hay, la del sistema. */
export const SCRIPT_CONTRASTE = `try{var c=localStorage.getItem('${CLAVE_CONTRASTE}');if(c!=='high'&&c!=='normal'){c=window.matchMedia&&window.matchMedia('${MEDIA_CONTRASTE}').matches?'high':'normal'}document.documentElement.setAttribute('data-contrast',c)}catch(e){}`;
