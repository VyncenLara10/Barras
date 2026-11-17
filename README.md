# Barras Studio

Web estática, responsiva y gratuita para generar etiquetas Code 128, Code 39, EAN-13 y QR desde archivos Excel (.xls/.xlsx), CSV o formulario manual.

## Características

- Lectura local de archivos Excel y CSV mediante SheetJS y asignación flexible de columnas.
- Vista previa de etiquetas con nombre, código y precio opcional.
- Código de barras Code 128 (recomendado para SKU internos), Code 39, EAN-13 validado o QR.
- PDF multipágina en A4 o Carta, 2×5, 2×6 o 3×8 etiquetas. El PDF se genera sin dependencias de jsPDF: utiliza el renderizado nativo del navegador.
- Opción de repetir las etiquetas según cantidades importadas; límite de 3000 por descarga.
- Plantilla Excel diseñada con encabezados, formatos, ejemplos e instrucciones; CSV editable.
- Prueba manual o con escáner USB HID: campo de texto que verifica coincidencia exacta.
- Generador sin base de datos ni almacenamiento persistente. Módulo de inventario independiente que guarda datos localmente en el navegador.
- Espacios publicitarios reservados sin cargar anuncios.

## Administrador de inventario (inventario.html)

La aplicación incluye un inventario opcional para un solo dispositivo: registra SKU únicos, existencias iniciales, entradas, salidas, consultas por escáner USB, alertas de stock bajo, historial de movimientos e importación desde Excel/CSV. Permite exportar inventario e historial CSV y un respaldo JSON (incluye productos y movimientos); el JSON se puede restaurar. Desde el inventario puedes enviar temporalmente productos al generador de etiquetas.

**Importante:** el inventario utiliza localStorage en el navegador. No se sincroniza entre dispositivos ni usuarios, se puede perder si borras los datos del sitio y no es adecuado como sistema empresarial multiusuario. Descarga respaldo JSON frecuentemente. Nunca guardes el respaldo únicamente en la misma computadora.

## Corrección de PDF

El botón PDF ya no depende de `window.jspdf` ni de cargar jsPDF desde un CDN. `assets/pdf-native.js` crea un documento PDF 1.4 a partir de páginas rasterizadas con Canvas (152 DPI), con código de barras/QR, nombre, SKU y precio opcional. JsBarcode y QRCode.js siguen requiriendo conexión para cargar sus bibliotecas desde CDN. Si al generar un código aparece un error de librería de barras o QR, verifica conexión y bloqueadores; publicar en GitHub Pages no arregla por sí solo un CDN bloqueado.

## Iniciar

Abrir `index.html` en un navegador moderno **con conexión a Internet** para descargar las bibliotecas externas, o usar un servidor estático:

```bash
python -m http.server 8080
```

Luego visitar http://localhost:8080

## Publicar en GitHub Pages

En GitHub: Settings → Pages → Deploy from a branch → `main` → `/ (root)`. Publicarás la web en `https://TUUSUARIO.github.io/Barras/` (si el repositorio es público).

## Formato de archivo

Descarga `assets/plantilla-productos.xlsx` con hojas `Productos` e `Instrucciones`, o CSV. Encabezados sugeridos: `Nombre del producto`, `Codigo / SKU`, `Precio`, `Cantidad`, `Categoria`, `Descripcion`. Puedes asignar otras columnas en la interfaz. Se utiliza la primera hoja del Excel. Conserva los ceros iniciales guardando los SKU como texto en Excel. El código es el identificador que codifican el QR y las barras; el nombre es texto de apoyo y no se codifica.

## Lectores

Los escáneres USB HID actúan como un teclado. Conecta el escáner, enfoca el campo de prueba y escanea. Code 128 y QR requieren que el lector soporte su simbología; algunos equipos 1D no leen QR. Realizar prueba física con el modelo exacto y calidad de impresión.

## Publicidad / AdSense

Hay dos espacios reservados con clase `.ad`. Para activar AdSense, primero completa y revisa `privacidad.html`, `terminos.html`, la información de contacto del propietario, las obligaciones de consentimiento pertinentes, contenido editorial útil, políticas del programa y dominio propio si corresponde. Luego agrega el script proporcionado por Google, las unidades publicitarias y, si corresponde, `ads.txt` con tu ID real. Nunca inventar el ID de publicador. No hay publicidad activa por defecto.

## Dependencias externas

- SheetJS 0.20.3 (CDN oficial)
- JsBarcode 3.12.1
- QRCode.js 1.0.0
- Sin biblioteca externa de PDF: renderer interno `assets/pdf-native.js`
- Google Fonts (DM Sans y Manrope)

Para operación totalmente sin Internet, aloja localmente estas librerías y sustituye sus URLs. El PDF y los artículos se procesan solo en el navegador.

## Limitaciones

- El PDF usa texto dibujado en Canvas para preservar acentos y se exporta como páginas JPEG a 152 DPI. Para impresión profesional de alta densidad convendría generar PDF vectorial.
- EAN-13 exige longitud y dígito de control válidos para 13 dígitos; cuando se ingresan 12, la biblioteca calcula el control.
- La vista previa muestra la primera hoja; el PDF genera todas las hojas.
- Los identificadores muy extensos pueden no escanearse en etiquetas pequeñas; prueba siempre antes de imprimir grandes lotes.
- El código de barras está diseñado para caracteres ASCII imprimibles. Para otros caracteres usa QR.

## Licencia

MIT. Revisa las licencias individuales de las bibliotecas externas.

## Caja rápida, tickets e inventario (actualización)

1. En `index.html` importa Excel/CSV o agrega artículos con SKU único, precio y cantidad. Haz clic en **Registrar estos códigos en el inventario**. Esto lleva los productos al administrador en la misma pestaña y origen web.
2. En `inventario.html`, confirma la transferencia. Solo se añaden códigos **nuevos** con la cantidad de cada fila como **existencia inicial**. Los productos ya registrados **no cambian su stock**, para no reponer accidentalmente productos vendidos.
3. Imprime etiquetas desde el inventario (todos los productos o una etiqueta desde la fila). Siempre se imprime el mismo código SKU; el lector identifica el artículo por ese código. **Imprimir o escanear no cambia existencias automáticamente**.
4. En la sección **Caja rápida y ventas**, conecta el lector USB al equipo, enfoca el campo y escanea. Cada lectura agrega al carrito; puedes quitar productos o vaciarlo sin afectar el inventario. El botón **Confirmar venta y descontar stock** valida cantidades, descuenta existencias, registra la venta y genera un enlace a su ticket.
5. El ticket `ticket.html?venta=...` se abre desde el inventario, se puede imprimir en impresora térmica de 80 mm o con otra impresora, y **NO es factura fiscal ni documento FEL**. Para facturación real debes utilizar un sistema FEL autorizado y una integración separada.
6. Exporta historial de ventas CSV y **respaldo JSON**, que ahora incluye productos, movimientos y ventas. Los respaldos antiguos sin ventas siguen siendo compatibles.

**Restricciones:** precios en quetzales; el parser admite `Q 125.00`, `125,50`, etc. Si no se definió precio, el artículo suma Q 0.00: revisar antes de confirmar. El registro se guarda en localStorage solo para un navegador/dispositivo, sin sincronización, permisos de cajeros, respaldo en nube ni facturación; no lo uses como caja multipunto real. Al borrar datos del navegador puedes perder las ventas. No es necesario un `.exe` para usarlo con escáner USB HID.

## Conectar Google AdSense

La página debe estar **publicada y accesible públicamente** antes de completar el proceso de revisión AdSense. Puedes desplegar primero con GitHub Pages y luego asociar un dominio personalizado (recomendado para un producto comercial). Un dominio propio no se exige universalmente por el código, pero el sitio/URL deben ser elegibles para AdSense.

1. Publica la web y comprueba que todas las rutas, política de privacidad y contenido funcionan.
2. En tu cuenta de [AdSense](https://adsense.google.com), ve a **Sitios → Nuevo sitio** e indica la URL publicada.
3. Abre `adsense-config.example.html`. En el `<head>` de `index.html`, pega el **código exacto de verificación** que aparece en tu panel (fragmento o etiqueta meta) usando el ID **público** `ca-pub-...`. No pegues usuarios, contraseñas, cookies o claves de pago en GitHub.
4. En AdSense pulsa **Verificar** y **Solicitar revisión**. Google no publica anuncios hasta que el sitio esté aprobado y tenga estado **Listo**.
5. Cuando AdSense te solicite `ads.txt`, copia la línea generada por Google usando tu `pub-...` real (ver `ads.txt.example`) y publícala en la **raíz del dominio**, normalmente `https://tudominio.com/ads.txt`; no uses una línea de ejemplo con valores ficticios. Los alojamientos con subrutas (p. ej. GitHub Pages de proyectos) requieren verificar que el archivo responda desde la raíz del dominio.
6. Una vez autorizado, configura anuncios automáticos o bloques en las zonas publicitarias reservadas del generador público. **No se cargan anuncios en inventario ni tickets**. Revisa los requisitos de consentimiento y actualiza `privacidad.html` con identidad del responsable, dirección de contacto y el uso de anuncios/cookies.

Documentación: [Conectar sitio](https://support.google.com/adsense/answer/7584263) · [ads.txt](https://support.google.com/adsense/answer/12171612) · [estado del sitio](https://support.google.com/adsense/answer/12170222).
