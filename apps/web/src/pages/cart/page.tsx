import { Link } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import SiteFooter from '../../components/feature/SiteFooter';
import { useCart } from '../../contexts/CartContext';
import { formatMoney } from '../../lib/api';

export default function CartPage() {
  const { items, removeItem, totalItems, totalPrice } = useCart();
  const currency = items[0]?.ebook.currency || 'KES';

  return (
    <div className="min-h-screen bg-oe-bg text-oe-ink">
      <Navbar />

      <main className="oe-route mx-auto max-w-[1120px] px-5 pb-20 pt-28 md:px-8">
        {/* Header */}
        <p className="inline-flex items-center gap-1.5 rounded-full bg-oe-accent-tint px-3 py-1 text-xs font-medium uppercase tracking-wide text-oe-accent">
          <i className="ri-shopping-bag-line" aria-hidden="true" /> Your cart
        </p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">Your reading pile.</h1>
        <p className="mt-3 max-w-2xl text-lg text-oe-muted">
          {items.length > 0
            ? `${totalItems} book${totalItems !== 1 ? 's' : ''} in your cart`
            : 'Your cart is empty'}
        </p>

        {items.length === 0 ? (
          /* Empty cart */
          <div className="mx-auto mt-10 max-w-md rounded-3xl border border-oe-line bg-white p-8 text-center">
            <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-oe-surface text-2xl text-oe-muted">
              <i className="ri-shopping-bag-line" />
            </span>
            <h2 className="mt-4 text-2xl font-semibold">Nothing here yet</h2>
            <p className="mt-2 text-oe-muted">Have a look through our self-help books to get started.</p>
            <Link
              to="/ebook-store"
              className="oe-btn mt-6 inline-flex items-center gap-2 rounded-full bg-oe-primary px-6 py-3 font-semibold text-white hover:bg-oe-primary-hover"
            >
              <i className="ri-book-open-line" aria-hidden="true"></i>
              Browse books
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Items */}
            <div className="space-y-4 lg:col-span-2">
              <ul className="space-y-4">
                {items.map(item => (
                  <li key={item.ebook.id} className="flex gap-4 rounded-3xl border border-oe-line bg-white p-4 md:gap-5 md:p-5">
                    <div className="flex h-28 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-oe-surface-low">
                      {item.ebook.cover_image_url ? (
                        <img src={item.ebook.cover_image_url} alt={item.ebook.title} className="h-full w-full object-cover" />
                      ) : (
                        <i className="ri-book-line text-2xl text-oe-muted" aria-hidden="true"></i>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="line-clamp-2 text-lg font-semibold leading-snug">{item.ebook.title}</h3>
                          {item.ebook.author && <p className="mt-1 text-sm text-oe-muted">by {item.ebook.author}</p>}
                        </div>
                        <button
                          onClick={() => removeItem(item.ebook.id)}
                          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-oe-muted transition-colors hover:bg-oe-crisis-tint hover:text-oe-crisis"
                          title="Remove from cart"
                          aria-label={`Remove ${item.ebook.title} from cart`}
                        >
                          <i className="ri-delete-bin-line text-lg" aria-hidden="true"></i>
                        </button>
                      </div>

                      <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                        <div className="flex items-center gap-2 text-sm text-oe-muted">
                          {item.ebook.file_format && (
                            <span className="rounded-full bg-oe-surface px-2.5 py-0.5 text-xs font-medium">{item.ebook.file_format}</span>
                          )}
                          <span>Qty: {item.quantity}</span>
                        </div>
                        <span className="text-lg font-semibold text-oe-primary-deep">
                          {formatMoney(item.ebook.price, item.ebook.currency)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <Link to="/ebook-store" className="inline-flex items-center gap-2 pt-2 font-medium text-oe-primary hover:text-oe-primary-hover">
                <i className="ri-arrow-left-line" aria-hidden="true"></i>
                Keep browsing
              </Link>
            </div>

            {/* Summary */}
            <aside className="lg:col-span-1">
              <div className="rounded-3xl border border-oe-line bg-white p-6 md:p-8 lg:sticky lg:top-28">
                <h2 className="text-2xl font-semibold">Summary</h2>

                <dl className="mt-6 space-y-3 rounded-2xl bg-oe-surface-low p-4 text-sm">
                  <div className="flex justify-between text-oe-muted">
                    <dt>Subtotal ({totalItems} {totalItems === 1 ? 'book' : 'books'})</dt>
                    <dd>{formatMoney(totalPrice, currency)}</dd>
                  </div>
                  <div className="flex justify-between text-oe-muted">
                    <dt>Tax</dt>
                    <dd>{formatMoney(0, currency)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-oe-line pt-3 text-base font-semibold text-oe-ink">
                    <dt>Total</dt>
                    <dd>{formatMoney(totalPrice, currency)}</dd>
                  </div>
                </dl>

                <Link
                  to="/checkout"
                  className="oe-btn mt-6 block w-full rounded-full bg-oe-primary px-6 py-3 text-center font-semibold text-white hover:bg-oe-primary-hover"
                >
                  Go to checkout
                </Link>

                <ul className="mt-5 space-y-2 text-sm text-oe-muted">
                  <li className="flex items-center gap-2">
                    <i className="ri-smartphone-line text-oe-primary" aria-hidden="true"></i>
                    Pay with M-Pesa
                  </li>
                  <li className="flex items-center gap-2">
                    <i className="ri-download-line text-oe-primary" aria-hidden="true"></i>
                    Read or download right away from My Library
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
