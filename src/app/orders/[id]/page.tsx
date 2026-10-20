import { notFound } from "next/navigation";
import { OrderChat } from "@/components/orders/order-chat";
import { requireUser } from "@/server/auth/session";
import { isUserAdmin } from "@/server/auth/admin";
import { getOrderForUser } from "@/server/orders/orders";
import { StorePageHeader } from "@/components/store/store-page-header";

type PageProps = { params: Promise<{ id: string }> };

export default async function OrderPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireUser(`/orders/${encodeURIComponent(id)}`);
  const order = await getOrderForUser(id, user.id);
  if (!order) notFound();
  return (
    <div className="order-page">
      <StorePageHeader backHref="/" />
      <main className="order-page-main">
        <OrderChat admin={isUserAdmin(user)} order={JSON.parse(JSON.stringify(order))} />
      </main>
    </div>
  );
}
