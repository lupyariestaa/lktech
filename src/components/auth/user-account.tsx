"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, LogOut, ShieldAlert, X } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useAccountStatus } from "@/components/account-status-provider";
import { getIdToken, signOutUser } from "@/lib/auth";
import { fetchMyOrders, type MyOrder } from "@/lib/order-api";
import {
  createAddress,
  deleteAddress,
  fetchAddresses,
  fetchWishlist,
  removeWishlist,
  updateAddress,
  type AddressInput,
} from "@/lib/user-account-api";
import { useCart } from "@/components/cart-provider";
import { toCartItem } from "@/lib/cart";
import { hasVariants } from "@/lib/product-format";
import type { Product } from "@/lib/product-types";
import type { SavedAddress, UserProfile } from "@/lib/user-types";
import { AccountTabs, type AccountTab } from "@/components/auth/account-tabs";
import { AccountOverview } from "@/components/auth/account-overview";
import { AccountOrders } from "@/components/auth/account-orders";
import { AccountPoints } from "@/components/auth/account-points";
import { AccountWishlist } from "@/components/auth/account-wishlist";
import { AccountAddresses } from "@/components/auth/account-addresses";
import { AccountProfile } from "@/components/auth/account-profile";
import { cn } from "@/lib/utils";

/** Toast ringan (pesan aksi cepat). */
type Toast = { id: number; text: string; tone: "success" | "error" };

const VALID_TABS: AccountTab[] = [
  "ringkasan",
  "pesanan",
  "favorit",
  "alamat",
  "profil",
];

/** Baca tab awal dari query string (?tab=) — dipakai sebagai state awal. */
function initialTab(): AccountTab {
  if (typeof window === "undefined") return "ringkasan";
  const t = new URLSearchParams(window.location.search).get("tab");
  return t && (VALID_TABS as string[]).includes(t) ? (t as AccountTab) : "ringkasan";
}

/** Halaman akun user: portal ber-tab (ringkasan, pesanan, favorit, alamat, profil). */
export function UserAccount() {
  const { user } = useAuth();
  const { blocked } = useAccountStatus();
  const router = useRouter();
  const { add } = useCart();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [tab, setTab] = useState<AccountTab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reordering, setReordering] = useState<string | null>(null);
  const [removingFav, setRemovingFav] = useState<string | null>(null);
  const [addrBusy, setAddrBusy] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback((text: string, tone: Toast["tone"]) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const changeTab = useCallback((next: AccountTab) => {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url.toString());
  }, []);

  // Muat data akun.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const token = await getIdToken();
        const res = await fetch("/api/user/profile", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Gagal memuat profil.");
        const data = await res.json();
        if (active) setProfile(data.profile ?? null);

        // Best-effort: kegagalan salah satu tidak memblokir yang lain.
        const [ordersRes, wishlistRes, addrRes] = await Promise.allSettled([
          fetchMyOrders(),
          fetchWishlist(),
          fetchAddresses(),
        ]);
        if (!active) return;
        if (ordersRes.status === "fulfilled") setOrders(ordersRes.value);
        if (wishlistRes.status === "fulfilled") setWishlist(wishlistRes.value.products);
        if (addrRes.status === "fulfilled") setAddresses(addrRes.value);
      } catch (err) {
        if (active)
          setError(err instanceof Error ? err.message : "Gagal memuat profil.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const onLogout = async () => {
    await signOutUser();
    router.replace("/");
  };

  const displayName =
    profile?.displayName || user?.displayName || "Pengguna LKTech";
  const email = profile?.email || user?.email || "";
  const photoURL = profile?.photoURL || user?.photoURL || "";
  const initial = (displayName || email || "U").charAt(0).toUpperCase();
  const createdAt = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

  const orderCount = Math.max(profile?.orderCount ?? 0, orders.length);

  // "Pesan lagi": masukkan item pesanan ke keranjang. Harga/validasi final tetap
  // diverifikasi server saat checkout, jadi aman memakai data item pesanan.
  const onReorder = useCallback(
    (order: MyOrder) => {
      if (blocked) {
        pushToast("Akun Anda sedang diblokir.", "error");
        return;
      }
      setReordering(order.id);
      for (const it of order.items) {
        add({
          slug: it.slug,
          name: it.name,
          price: it.price,
          cover: "default",
          qty: it.qty,
          variantSlug: it.variantSlug,
          variantName: it.variantName,
        });
      }
      setReordering(null);
      pushToast(
        `${order.items.length} item ditambahkan ke keranjang.`,
        "success",
      );
      router.push("/keranjang");
    },
    [add, router, pushToast, blocked],
  );

  const onRemoveFav = useCallback(
    async (slug: string) => {
      setRemovingFav(slug);
      try {
        await removeWishlist(slug);
        setWishlist((list) => list.filter((p) => p.slug !== slug));
        pushToast("Dihapus dari favorit.", "success");
      } catch (err) {
        pushToast(
          err instanceof Error ? err.message : "Gagal menghapus favorit.",
          "error",
        );
      } finally {
        setRemovingFav(null);
      }
    },
    [pushToast],
  );

  const onAddFavToCart = useCallback(
    (product: Product) => {
      if (blocked) {
        pushToast("Akun Anda sedang diblokir.", "error");
        return;
      }
      if (hasVariants(product)) {
        router.push(`/produk/${product.slug}`);
        return;
      }
      add(toCartItem(product, null, 1));
      pushToast("Ditambahkan ke keranjang.", "success");
    },
    [add, router, pushToast, blocked],
  );

  const onAddressCreate = useCallback(
    async (input: AddressInput) => {
      if (blocked) throw new Error("Akun Anda sedang diblokir.");
      setAddrBusy(true);
      try {
        const next = await createAddress(input);
        setAddresses(next);
        pushToast("Alamat disimpan.", "success");
      } finally {
        setAddrBusy(false);
      }
    },
    [pushToast, blocked],
  );

  const onAddressUpdate = useCallback(
    async (id: string, patch: Partial<AddressInput>) => {
      if (blocked) throw new Error("Akun Anda sedang diblokir.");
      setAddrBusy(true);
      try {
        const next = await updateAddress(id, patch);
        setAddresses(next);
        pushToast("Alamat diperbarui.", "success");
      } finally {
        setAddrBusy(false);
      }
    },
    [pushToast, blocked],
  );

  const onAddressDelete = useCallback(
    async (id: string) => {
      if (blocked) throw new Error("Akun Anda sedang diblokir.");
      setAddrBusy(true);
      try {
        const next = await deleteAddress(id);
        setAddresses(next);
        pushToast("Alamat dihapus.", "success");
      } finally {
        setAddrBusy(false);
      }
    },
    [pushToast, blocked],
  );

  const badges = useMemo(
    () => ({ pesanan: orderCount, favorit: wishlist.length }),
    [orderCount, wishlist.length],
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-28">
      {/* Header akun */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoURL}
              alt={displayName}
              width={56}
              height={56}
              className="h-14 w-14 rounded-2xl object-cover"
            />
          ) : (
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-light text-xl font-bold text-white">
              {initial}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-secondary">{displayName}</h1>
            <p className="truncate text-sm text-muted">{email}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-rose-200 hover:text-rose-500"
        >
          <LogOut className="h-4 w-4" />
          Keluar
        </button>
      </div>

      {blocked && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm text-rose-700">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Akun Anda sedang diblokir</p>
            <p className="mt-0.5 text-xs leading-relaxed text-rose-600">
              Anda tidak dapat melakukan checkout, menambah ke keranjang,
              mengelola favorit, atau alamat. Hubungi kami via WhatsApp untuk
              info lebih lanjut.
            </p>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      )}

      {/* Tabs */}
      <div className="mt-8">
        <AccountTabs active={tab} onChange={changeTab} badges={badges} />
      </div>

      {/* Panels */}
      <div className="mt-8">
        {tab === "ringkasan" && (
          <div role="tabpanel" id="panel-ringkasan" aria-labelledby="tab-ringkasan">
            <AccountOverview
              displayName={displayName}
              email={email}
              photoURL={photoURL}
              initial={initial}
              createdAt={createdAt}
              orderCount={orderCount}
              wishlistCount={wishlist.length}
              onLogout={onLogout}
              onGoTab={(t) => changeTab(t)}
            />
          </div>
        )}

        {tab === "pesanan" && (
          <div role="tabpanel" id="panel-pesanan" aria-labelledby="tab-pesanan">
            <AccountOrders
              orders={orders}
              onReorder={onReorder}
              reordering={reordering}
            />
          </div>
        )}

        {tab === "poin" && (
          <div role="tabpanel" id="panel-poin" aria-labelledby="tab-poin">
            <AccountPoints />
          </div>
        )}

        {tab === "favorit" && (
          <div role="tabpanel" id="panel-favorit" aria-labelledby="tab-favorit">
            <AccountWishlist
              products={wishlist}
              removing={removingFav}
              onRemove={onRemoveFav}
              onAddToCart={onAddFavToCart}
            />
          </div>
        )}

        {tab === "alamat" && (
          <div role="tabpanel" id="panel-alamat" aria-labelledby="tab-alamat">
            <AccountAddresses
              addresses={addresses}
              busy={addrBusy}
              onCreate={onAddressCreate}
              onUpdate={onAddressUpdate}
              onDelete={onAddressDelete}
            />
          </div>
        )}

        {tab === "profil" && (
          <div role="tabpanel" id="panel-profil" aria-labelledby="tab-profil">
            <AccountProfile
              key={`${displayName}|${profile?.whatsapp ?? ""}`}
              email={email}
              initialDisplayName={displayName}
              initialWhatsapp={profile?.whatsapp ?? ""}
            />
          </div>
        )}
      </div>

      {loading && (
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Memuat profil...
        </div>
      )}

      {/* Toasts */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-[200] flex flex-col items-center gap-2 px-6"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-lg",
              t.tone === "success" ? "bg-secondary" : "bg-rose-500",
            )}
          >
            {t.tone === "success" ? (
              <Check className="h-4 w-4" />
            ) : (
              <X className="h-4 w-4" />
            )}
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
