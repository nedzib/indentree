# indentree

Recreación en **HTML, CSS y JavaScript vanilla** de
[tree.nathanfriend.com](https://tree.nathanfriend.com): un generador de
diagramas ASCII de estructuras de carpetas.

Los estilos usan [Terminal CSS](https://terminalcss.xyz/), el framework
minimalista de estética de terminal de Jonas Duri (MIT). Está incluido
localmente en `css/terminal.min.css` para que la app funcione sin conexión.

La versión original en TypeScript/React de la que parte este proyecto está en
[tree-online](https://gitlab.com/nfriend/tree-online) y se mantiene aquí solo
como referencia local.

## Funcionalidades

- Generación del árbol en tiempo real a partir de texto indentado.
- Soporte para viñetas de Markdown (`- archivo`).
- Charset **UTF-8** (fancy) o **ASCII**.
- Opciones de renderizado:
  - Ruta completa (`./carpeta/archivo`).
  - Barra final en directorios.
  - Punto `.` como raíz.
- Copiar el árbol al portapapeles.
- **Descargar el árbol como imagen PNG** (renderizada con Canvas, sin
  librerías externas, a 2x para pantallas de alta densidad).
- **Persistencia automática en `localStorage`**: el texto y las opciones se
  restauran al volver a abrir la página.
- Tema claro/oscuro de Terminal CSS según la preferencia del sistema.
- Diseño responsive (escritorio y móvil).
- Botones, formularios, tipografía y detalles (prompt, bordes punteados, `[x]`)
  con los componentes y variables de Terminal CSS.
- Atajos del editor:
  - `Tab` / `Shift + Tab` para indentar o desindentar.
  - `Enter` conserva la indentación de la línea actual.

## Cómo usarlo

Puedes abrir `index.html` directamente en el navegador o servirlo con
cualquier servidor estático:

```bash
python3 -m http.server 8000
```

Luego visita <http://localhost:8000>.

## Estructura

```
index.html              Interfaz
css/terminal.min.css    Terminal CSS v0.7.5 (MIT)
css/styles.css          Tema, layout y ajustes sobre Terminal CSS
js/parse-input.js       Texto -> árbol de nodos
js/generate-tree.js     Árbol de nodos -> diagrama ASCII/UTF-8
js/storage.js           Persistencia en localStorage
js/download-image.js    Exportación del árbol a PNG con Canvas
js/app.js               Conexión de la UI y eventos
```

## Créditos

Inspirado en [tree-online](https://gitlab.com/nfriend/tree-online) de Nathan
Friend (licencia MIT). La lógica de parseo y generación es una portación
directa de la implementación original.

Estilos: [Terminal CSS](https://terminalcss.xyz/) por Jonas Duri, incluido
bajo licencia MIT.
