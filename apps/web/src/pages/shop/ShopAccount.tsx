import { Link } from 'react-router-dom'
import { ChevronRight, LogOut, PackageOpen } from 'lucide-react'
import ShopLayout from '../../components/shop/ShopLayout'
import ShopAuth from '../../components/shop/ShopAuth'
import { ChannelBadge, StatusPill } from '../../components/orders/OrderParts'
import Avatar from '../../components/ui/Avatar'
import { EmptyState } from '../../components/ui/Misc'
import { useShopper, useShopperStore } from '../../store/useShopperStore'
import { useOrderStore } from '../../store/useOrderStore'
import { FULFILLMENT_LABEL, isActive } from '../../utils/orders'
import { formatMoney, timeAgo } from '../../utils/format'

export default function ShopAccount() {
  const shopper = useShopper()
  const logout = useShopperStore((s) => s.logout)
  const orders = useOrderStore((s) => s.orders).filter((o) => o.customerId === shopper?.id)
  const sorted = [...orders].sort((a, b) => Number(isActive(b)) - Number(isActive(a)) || b.createdAt.localeCompare(a.createdAt))

  return (
    <ShopLayout>
      {!shopper ? (
        <div className="card mx-auto max-w-md p-6">
          <ShopAuth title="Entra a tu cuenta" />
        </div>
      ) : (
        <div className="mx-auto max-w-3xl space-y-4">
          <section className="card flex items-center gap-3 p-5">
            <Avatar src={shopper.avatar} name={shopper.name} size="size-12" />
            <div className="mr-auto min-w-0">
              <p className="truncate font-semibold">{shopper.name}</p>
              <p className="text-xs text-ink-soft">
                {shopper.email} · {shopper.phone}
              </p>
            </div>
            <button onClick={logout} className="btn-ghost py-2 text-xs">
              <LogOut className="size-4" /> Salir
            </button>
          </section>
          <section className="card p-5">
            <p className="mb-3 font-semibold">Mis pedidos</p>
            {!sorted.length && <EmptyState icon={PackageOpen} title="Aún no tienes pedidos" action={<Link to="/tienda" className="btn-primary mt-2">Ir al catálogo</Link>} />}
            <div className="space-y-2">
              {sorted.map((o) => (
                <Link key={o.id} to={`/tienda/pedido/${o.code}`} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line p-3 hover:border-brand-300 hover:bg-brand-50">
                  <span className="whitespace-nowrap font-mono text-sm font-bold">{o.code}</span>
                  <ChannelBadge channel={o.channel} />
                  <span className="text-xs text-ink-soft">
                    {FULFILLMENT_LABEL[o.fulfillment]} · {timeAgo(o.createdAt)}
                  </span>
                  <span className="ml-auto flex items-center gap-2">
                    <StatusPill status={o.status} />
                    <span className="text-sm font-semibold">{formatMoney(o.total)}</span>
                    <ChevronRight className="size-4 text-ink-mute" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}
    </ShopLayout>
  )
}
