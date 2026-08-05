import React from "react";

const consejos = [
  "Llevas tiempo sentado: estira suavemente cuello, hombros y espalda.",
  "Recuerda hidratarte. Ten agua cerca y bebe con regularidad.",
  "Descansa la vista unos segundos mirando a un punto lejano.",
  "Apoya bien la espalda y mantén ambos pies sobre el suelo.",
  "Relaja los hombros y evita sostener tensión mientras gestionas señales.",
  "Antes de continuar, respira profundamente y recupera la concentración.",
  "Revisa el volumen de los auriculares y evita mantenerlo demasiado alto.",
  "En una pausa breve, mueve muñecas, manos y tobillos suavemente.",
];

/** Recomendaciones breves que rotan sin interrumpir el trabajo operativo. */
export const ConsejosOperador: React.FC = () => {
  const [indice, establecerIndice] = React.useState(0);

  React.useEffect(() => {
    const intervalo = window.setInterval(
      () => establecerIndice((actual) => (actual + 1) % consejos.length),
      15000
    );
    return () => window.clearInterval(intervalo);
  }, []);

  return (
    <aside className="consejo-operador" aria-live="polite">
      <span aria-hidden="true">●</span>
      <p key={indice}>{consejos[indice]}</p>
    </aside>
  );
};
