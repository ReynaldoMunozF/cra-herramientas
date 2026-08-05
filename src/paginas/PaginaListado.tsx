import React from "react";
import { Link } from "react-router-dom";

// Forma normalizada de los datos que se muestran en el listado.
interface Miembro {
  id: string;
  login: string;
  avatar_url: string;
}

export const PaginaListado: React.FC = () => {
  // Miembros que se representan actualmente en la tabla.
  const [miembros, establecerMiembros] = React.useState<Miembro[]>([]);

  // Conserva la respuesta original de la segunda API para fines de aprendizaje.
  const [nuevaOrganizacion, establecerNuevaOrganizacion] = React.useState([]);

  // El array vacío hace que esta petición se ejecute una sola vez al montar la página.
  React.useEffect(() => {
    fetch(`https://api.github.com/orgs/lemoncode/members`)
      .then((respuesta) => respuesta.json())
      .then((datos) => establecerMiembros(datos));
  }, []);

  // Valor controlado por el campo de texto.
  const [nombreOrganizacion, establecerNombreOrganizacion] = React.useState("Lemoncode");

  // Sincroniza el texto escrito por el usuario con el estado de React.
  const gestionarCambio = (evento: React.ChangeEvent<HTMLInputElement>) => {
    establecerNombreOrganizacion(evento.target.value);
  };

  const gestionarEnvio = () => {
    console.log("Valor del input:", nombreOrganizacion);

    // Petición de ejemplo que sustituye los miembros por personajes.
    fetch("https://rickandmortyapi.com/api/character")
      .then((respuesta) => respuesta.json())
      .then((datos) => {
        establecerNuevaOrganizacion(datos.results);

        // Adaptamos la respuesta externa al formato MemberEntity de la tabla.
        const miembrosNormalizados = datos.results.map((personaje: any) => ({
          id: personaje.id,
          login: personaje.name,
          avatar_url: personaje.image,
        }));

        establecerMiembros(miembrosNormalizados);
      })
      .catch((error) => console.error("Error al obtener los datos:", error));
  };

  // Muestra la respuesta guardada en la consola durante el desarrollo.
  console.log(nuevaOrganizacion);
 

  return (
    <>
      <div>
        <input
          type="text"
          value={nombreOrganizacion}
          onChange={gestionarCambio}
          placeholder={nombreOrganizacion}
        />
        <button onClick={gestionarEnvio}>Enviar</button>
      </div>
      <h2>Hello from List page</h2>+{" "}
      <div className="list-user-list-container">
        <span className="list-header">Avatar</span>
        <span className="list-header">Id</span>
        <span className="list-header">Name</span>
        {/* Creamos una fila visual por cada elemento del estado members. */}
        {miembros.map((miembro) => (
          <>
            <img src={miembro.avatar_url} />
            <span>{miembro.id}</span>
            {/* El nombre enlaza con la pantalla de detalle correspondiente. */}
            <Link to={`/detail/${miembro.login}`}>{miembro.login}</Link>
          </>
        ))}
      </div>
      <Link to="/detail">Navigate to detail page</Link>
    </>
  );
};
