/** Loader con el logo municipal: se llena de gris a color mientras giran círculos alrededor. */
export function LoaderLogo({ texto = 'Cargando…', pantalla = false, tam = 96 }: { texto?: string; pantalla?: boolean; tam?: number }) {
  const logo = '/images/Municipio_malvinas_argentinas_logo.png';
  return (
    <div className={`loader-logo ${pantalla ? 'loader-pantalla' : ''}`} role="status" aria-live="polite" style={{ ['--tam' as string]: `${tam}px` }}>
      <div className="loader-escena">
        <span className="loader-orbita o1"><i /></span>
        <span className="loader-orbita o2"><i /></span>
        <span className="loader-orbita o3"><i /></span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="loader-base" src={logo} alt="" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="loader-color" src={logo} alt="" />
      </div>
      <span className="loader-texto">{texto}</span>
    </div>
  );
}
