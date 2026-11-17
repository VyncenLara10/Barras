# Despliegue y Google AdSense — Barras Studio

## Publicar en Cloudflare Pages
Repositorio: VyncenLara10/Barras. Crea un proyecto nuevo en **Workers & Pages → Create → Pages → Connect to Git**. Selecciona \`main\`, framework **None**, build command \`exit 0\`, output \`.\`. Los commits posteriores en \`main\` se despliegan automáticamente. La publicación real y las DNS se configuran desde tus cuentas de Cloudflare y Namecheap.

El subdominio `barras.vyntools.com` ya tiene proyecto Cloudflare Pages independiente. Si tras cambiar los nameservers de `vyntools.com` no responde, replica/ajusta el CNAME `barras` dentro del DNS de Cloudflare apuntándolo al proyecto `barras-vyntools.pages.dev`, y conserva el dominio personalizado en Pages.

## AdSense compartido
Se registra **vyntools.com** en AdSense. Los subdominios normales no se agregan por separado como nuevos sitios. Utiliza el **mismo** identificador público \`ca-pub-\` en VynTools y Barras; nunca pongas tu contraseña, API keys privadas ni archivos de cuenta en GitHub.

**Antes de que Google apruebe el sitio** usa Node.js (en una copia local del repositorio):

\`\`\`bash
node scripts/configurar-adsense.mjs verify ca-pub-TU_ID_REAL
\`\`\`

El comando agrega únicamente la metatag de verificación al \`index.html\`. El archivo autoritativo `ads.txt` debe publicarse en el dominio raíz desde el repositorio Dashboard, no aquí. Haz commit y push a \`main\`, verifica el dominio en AdSense → Sitios y solicita la revisión.

**Después de obtener estado Listo / Ready**, completa el titular/contacto de la política de privacidad, condiciones aplicables de cookies y configura la plataforma de consentimiento que proceda. Para personas en el EEE, Reino Unido y Suiza, Google exige una CMP certificada cuando corresponda. Entonces ejecuta:

\`\`\`bash
node scripts/configurar-adsense.mjs ads ca-pub-TU_ID_REAL
\`\`\`

El modo \`ads\` inserta el script de anuncios automáticos (Auto ads) en `index.html` (generador público), sin cargar anuncios en `inventario.html` ni `ticket.html`. Activa anuncios automáticos también desde el panel AdSense. Los espacios decorativos de publicidad no son anuncios activos; si quieres anuncios manuales debes crear unidades y copiar su \`data-ad-slot\`.

Para revertir los cambios generados: \`node scripts/configurar-adsense.mjs remove\`. Revisa los cambios con \`git diff\` antes del commit.

## Verificación
- Abrir el sitio HTTPS y consultar el código fuente para confirmar \`google-adsense-account\`.
- Comprobar que \`https://vyntools.com/ads.txt\` devuelve tu línea \`pub-...\`, no un texto de ejemplo.
- No activar anuncios en páginas de inventario, caja o ticket.
- Google puede rechazar la solicitud si hay contenido insuficiente, políticas incompletas o problemas de navegación. La instalación del código no garantiza aprobación.
- Nunca publicar \`ca-pub-TU_ID_REAL\` literalmente: reemplazar por tus 16 dígitos.

Documentación oficial: https://support.google.com/adsense/answer/7584263 y https://developers.cloudflare.com/pages/configuration/custom-domains/
