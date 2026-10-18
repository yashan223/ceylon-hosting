import { getDatabase } from "@/server/db/mongodb";
import type { Product } from "@/types/product";

type ProductDocument = Product & { createdAt?: Date; updatedAt?: Date };

export async function getAdminOverview() {
  const database = await getDatabase();
  const products = database.collection<ProductDocument>("products");
  const orders = database.collection("orders");
  const users = database.collection("users");
  const subscriptions = database.collection("server_subscriptions");
  const [
    totalProducts,
    activeProducts,
    serverProducts,
    modProducts,
    serviceProducts,
    totalOrders,
    totalUsers,
    activeSubscriptions,
    totalFiles,
    storageAgg,
  ] = await Promise.all([
    products.countDocuments(),
    products.countDocuments({ active: true }),
    products.countDocuments({ type: "server", active: true }),
    products.countDocuments({ type: "mod", active: true }),
    products.countDocuments({ type: "service", active: true }),
    orders.countDocuments(),
    users.countDocuments(),
    subscriptions.countDocuments({ status: { $ne: "cancelled" } }),
    products.countDocuments({ downloadKey: { $exists: true, $ne: "" } }),
    products
      .aggregate<{ totalBytes: number }>([
        { $match: { downloadKey: { $exists: true, $ne: "" } } },
        { $group: { _id: null, totalBytes: { $sum: "$downloadSize" } } },
      ])
      .toArray(),
  ]);

  const totalStorageBytes = storageAgg[0]?.totalBytes ?? 0;

  return {
    totalProducts,
    activeProducts,
    serverProducts,
    modProducts,
    serviceProducts,
    totalOrders,
    totalUsers,
    activeSubscriptions,
    totalFiles,
    totalStorageBytes,
  };
}

export async function getAdminProducts() {
  const database = await getDatabase();
  const products = await database
    .collection<ProductDocument>("products")
    .find({})
    .sort({ updatedAt: -1 })
    .toArray();
  return products.map(({ _id, createdAt, updatedAt, ...product }) => ({
    ...product,
    id: product.id || _id.toString(),
    createdAt: createdAt?.toISOString(),
    updatedAt: updatedAt?.toISOString(),
  }));
}
