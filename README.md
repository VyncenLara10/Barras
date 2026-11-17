# Barras Studio

Web estática, responsiva y gratuita para generar etiquetas Code 128, Code 39, EAN-13 y QR desde archivos Excel (.xls/.xlsx), CSV o formulario manual.

## Características

- Lectura local de archivos Excel y CSV mediante SheetJS y asignación flexible de columnas.
- Vista previa de etiquetas con nombre, código y precio opcional.
- Código de barras Code 128 (recomendado para SKU internos), Code 39, EAN-13 validado o QR.
- PDF multipágina en A4 o Carta, 2×5, 2×6 o 3×8 etiquetas.
- Opción de repetir las etiquetas según cantidades importadas; límite de 3000 por descarga.
- Plantillas de Excel y CSV para descargar.
- Prueba manual o con escáner USB HID: campo de texto que verifica coincidencia exacta.
- Sin base de datos, registro de usuarios ni envío del inventario al servidor.
- Espacios publicitarios reservados sin cargar anuncios.

## Iniciar

Abrir `index.html` en un navegador moderno **con conexión a Internet** para descargar las bibliotecas externas, o usar un servidor estático:

```bash
python -m http.server 8080
```

Luego visitar http://localhost:8080

## Publicar en GitHub Pages

En GitHub: Settings → Pages → Deploy from a branch → `main` → `/ (root)`. Publicarás la web en `https://TUUSUARIO.github.io/Barras/` (si el repositorio es público).

## Formato de archivo

Columnas sugeridas: `nombre,codigo,precio,cantidad`. Puedes asignar otras columnas en la interfaz. Se utiliza la primera hoja del Excel. Conserva los ceros iniciales guardando los SKU como texto en Excel. El código es el identificador que codifican el QR y las barras; el nombre es texto de apoyo y no se codifica.

## Lectores

Los escáneres USB HID actúan como un teclado. Conecta el escáner, enfoca el campo de prueba y escanea. Code 128 y QR requieren que el lector soporte su simbología; algunos equipos 1D no leen QR. Realizar prueba física con el modelo exacto y calidad de impresión.

## Publicidad / AdSense

Hay dos espacios reservados con clase `.ad`. Para activar AdSense, primero completa y revisa `privacidad.html`, `terminos.html`, la información de contacto del propietario, las obligaciones de consentimiento pertinentes, contenido editorial útil, políticas del programa y dominio propio si corresponde. Luego agrega el script proporcionado por Google, las unidades publicitarias y, si corresponde, `ads.txt` con tu ID real. Nunca inventar el ID de publicador. No hay publicidad activa por defecto.

## Dependencias externas

- SheetJS 0.20.3 (CDN oficial)
- JsBarcode 3.12.1
- QRCode.js 1.0.0
- jsPDF 2.5.2
- Google Fonts (DM Sans y Manrope)

Para operación totalmente sin Internet, aloja localmente estas librerías y sustituye sus URLs. El PDF y los artículos se procesan solo en el navegador.

## Limitaciones

- El PDF usa las fuentes estándar de jsPDF para texto (algunos caracteres Unicode pueden no renderizarse); el código QR admite UTF-8.
- EAN-13 exige longitud y dígito de control válidos para 13 dígitos; cuando se ingresan 12, la biblioteca calcula el control.
- La vista previa muestra la primera hoja; el PDF genera todas las hojas.
- Los identificadores muy extensos pueden no escanearse en etiquetas pequeñas; prueba siempre antes de imprimir grandes lotes.
- El código de barras está diseñado para caracteres ASCII imprimibles. Para otros caracteres usa QR.

## Licencia

MIT. Revisa las licencias individuales de las bibliotecas externas.
