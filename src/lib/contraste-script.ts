/** Claves y scripts de preferencias visuales (contraste y tamaño de texto). Sin 'use client': lo usa el layout del servidor. */
export const CLAVE_CONTRASTE = 'faltas-piloto:contraste';
export const MEDIA_CONTRASTE = '(prefers-contrast: more)';

/** Corre en el <head> antes de pintar: elección guardada o, si no hay, la del sistema. */
export const SCRIPT_CONTRASTE = `try{var c=localStorage.getItem('${CLAVE_CONTRASTE}');if(c!=='high'&&c!=='normal'){c=window.matchMedia&&window.matchMedia('${MEDIA_CONTRASTE}').matches?'high':'normal'}document.documentElement.setAttribute('data-contrast',c)}catch(e){}`;

/** Tamaño de texto (A11Y paso 5): escala del root en <html data-text-size>. */
export const CLAVE_TEXTO = 'faltas-piloto:texto';
export const NIVELES_TEXTO = ['normal', 'grande', 'muy-grande'] as const;

/** Corre en el <head> antes de pintar: aplica el tamaño guardado (sin elección, «normal»). */
export const SCRIPT_TEXTO = `try{var t=localStorage.getItem('${CLAVE_TEXTO}');if(t!=='grande'&&t!=='muy-grande'){t='normal'}document.documentElement.setAttribute('data-text-size',t)}catch(e){}`;
