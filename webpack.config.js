const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");
const basePath = __dirname;

// Configuración central de Webpack: compila TypeScript/React, procesa el CSS
// y genera automáticamente el index.html final dentro de la carpeta dist.
module.exports = {
  // Las rutas relativas de entry y de la plantilla parten de src.
  context: path.join(basePath, "src"),

  // Permite importar módulos sin escribir la extensión del archivo.
  resolve: {
    extensions: [".js", ".ts", ".tsx"],
  },
  // Punto de entrada único. Las hojas CSS se importan desde app.tsx en el
  // orden necesario, por lo que no se acopla Webpack a un archivo monolítico.
  entry: {
    app: "./principal.tsx",
  },
  // Mapas de código para localizar errores durante el desarrollo.
  devtool: "eval-source-map",
  stats: "errors-only",
  // Los nombres con hash evitan que el navegador reutilice versiones antiguas.
  output: {
    filename: "[name].[chunkhash].js",
    publicPath: "/",
  },
  // Devuelve index.html para rutas de React como /detail/123.
  devServer: {
    historyApiFallback: true,
  },
  // Reglas que indican cómo transformar cada tipo de archivo importado.
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        // Babel transforma TypeScript y JSX en JavaScript compatible.
        loader: "babel-loader",
      },
      {
        test: /\.(png|jpg|svg)$/,
        // Copia imágenes importadas a la salida final y devuelve su URL.
        type: "asset/resource",
      },
      {
        test: /\.html$/,
        // Permite que Webpack procese la plantilla HTML.
        loader: "html-loader",
      },
      {
        test: /\.css$/,
        exclude: /node_modules/,
        // css-loader interpreta imports y style-loader inserta el CSS en la página.
        use: [
          {
            loader: "style-loader",
          },
          {
            loader: "css-loader",
          },
        ],
      },
    ],
  },
  plugins: [
    // Genera index.html en dist e incorpora automáticamente el bundle compilado.
    new HtmlWebpackPlugin({
      filename: "index.html", //Name of file in ./dist/
      template: "plantilla.html", // Plantilla fuente situada dentro de src.
    }),
  ],
};
