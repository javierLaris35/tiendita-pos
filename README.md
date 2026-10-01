# Tiendita POS

Punto de venta para tiendas de abarrotes construido con **React 19 + TypeScript (strict) + Vite + Tailwind CSS 4 + Zustand**.

```bash
npm install
npm run dev        # servidor de desarrollo
npm run typecheck  # verificación de tipos (tsc -b)
npm run build      # typecheck + build de producción
```

Acceso demo (contraseña `demo123`):

- `admin@tiendita.mx` — administrador, entra al **Panel**
- `alicia@tiendita.mx` — cajera, entra directo a la **Caja** (ya tiene la Caja 02 abierta)

## Dos experiencias separadas

**Caja (`/caja`)** — pantalla completa, sin menú de administración:

1. **Apertura de turno**: se elige la caja libre y se cuenta el fondo inicial tocando billetes y monedas.
2. **Venta**: buscador/escáner siempre enfocado (`F2`), `3*código` para varias piezas, catálogo de frecuentes, ofertas y categorías. Los productos a granel piden el peso (en kg o “dame $20”).
3. **Ofertas automáticas**: se aplican solas en el ticket y la caja sugiere completarlas (“agrega 1 más y llévate 3x2”, “¡llévate las galletas gratis!”).
4. **Cobro**: efectivo (`F4`) con miniaturas de billetes y monedas, sugerencias de pago según el total y desglose del cambio; tarjeta (`F6`) o transferencia.
5. **Ventas en espera** (`F8`), entradas/retiros de efectivo, corte X (parcial) y **corte Z** con arqueo por denominación y diferencia.
6. **Herramientas en modal**: **Consultar precio** (`F9`, sin tocar el ticket), **Clientes y crédito** (`F10`) y **Buscar ticket** (`F11`, reimprimir o devolver).

## Crédito a clientes (fiado)

- Cada cliente puede tener crédito autorizado con **límite** y **plazo** (lo autorizan administradores y gerentes).
- En caja se asigna el cliente y se cobra **a crédito** solo si el ticket cabe en su disponible; el ticket sale con saldo y firma de conformidad.
- **Abonos** desde la caja o desde Clientes, con comprobante de folio. Los abonos en efectivo entran al efectivo esperado del corte.
- El saldo se calcula de las ventas a crédito (no devueltas) menos los abonos, así una devolución baja el saldo sola. Si pasa el plazo sin abonar, el cliente aparece como **vencido**.
- El Panel muestra las **cuentas por cobrar** y Clientes permite filtrar por saldo pendiente.

## Pedidos en línea, WhatsApp y Escanea y paga

Los tres canales generan el mismo tipo de **pedido** (`P-2001`): canal, entrega (domicilio, recoger en sucursal o en tienda), pagado o por cobrar, estatus con historial y avisos al cliente.

| Ruta | Para quién | Qué hace |
| --- | --- | --- |
| `/tienda` | Cliente | Catálogo con ofertas y existencia real, carrito, registro/inicio de sesión, domicilio o recoger en sucursal, pago en línea (simulado) o al recibir |
| `/tienda/pedido/:code` | Cliente | Seguimiento con línea de estatus, avisos y QR para pagar/recoger en caja |
| `/whatsapp` | Demo | Simulador del chat al **644 423 0374**: el asistente registra al cliente, interpreta la lista (“2 cocas, medio kilo de jitomate”), pregunta cuando hay varias opciones, confirma total, entrega y pago, y avisa cada cambio de estatus |
| `/scan` | Cliente en tienda | **Escanea y paga**: escanea los QR de anaquel con su teléfono, ve ofertas y total, y paga en línea o genera un QR para pagar en caja |
| `/pedidos` | Personal | Tablero por estatus (nuevos, confirmados, armando, listos/por cobrar, en camino, cerrados) con lista de surtido, avisos y cobro |

- **Inventario apartado**: cada pedido activo aparta su mercancía; tienda, WhatsApp, Escanea y paga y la caja física venden solo lo disponible (existencia − apartado). Al cancelar se libera.
- **En caja**: escanear el QR del cliente (o `F12 · Pedidos`) carga el pedido en el ticket para cobrarlo, o lo marca entregado si ya se pagó en línea.
- **QR de producto**: en Inventario cada producto tiene su QR (`/scan?p=<código>`) y hay hoja de **etiquetas de anaquel** para imprimir.
- **Sincronización entre pestañas**: cliente y personal pueden estar en pestañas distintas; los cambios se reflejan al instante (en producción: backend con websockets).
- Cuenta demo de cliente: `juan.perez@correo.mx` / `cliente123`.

**Panel (`/`)** — administración: resumen del día, estado de cajas, ofertas, cortes, inventario, clientes, empleados, reportes, sucursales y ajustes.

## Ofertas (`/ofertas`)

Cuatro tipos: **Lleva N paga M** (2x1, 3x2), **Compra y llévate** (regalo o con % de descuento), **Descuento %** (por producto o categoría) y **Paquete** (N piezas por $X). Con vigencia, sucursales y vista previa con un ticket de ejemplo. `/pantalla-ofertas` es una vista para la TV de la tienda que rota las ofertas vigentes.

Precios con IVA incluido; el ticket lo desglosa como informativo.

## Estructura

```
src/
  types.ts            tipos de dominio
  dataVersion.ts      reinicia localStorage cuando cambia el modelo de datos
  data/seed.ts        catálogo, clientes, empleados, ~90 días de ventas, turnos de caja y ofertas
  data/money.ts       billetes y monedas en circulación
  utils/promotions.ts motor de ofertas (computeTicket) y textos/insignias
  utils/cash.ts       desglose de efectivo, sugerencias de pago y resumen de turno
  store/              un store de Zustand por dominio (persistidos con prefijo `tiendita-`)
  components/caja/    pantalla de caja: catálogo, ticket, cobro, peso, apertura y cortes
  components/money/   miniaturas de billetes/monedas y contador de efectivo
  components/promos/  formulario de ofertas
  pages/              una página por ruta
```

Las miniaturas de billetes son ilustraciones estilizadas con los colores y motivos de la familia G de Banxico, no reproducciones.

Todos los datos viven en el navegador; **Ajustes → Reiniciar** restaura el estado inicial.
