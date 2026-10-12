import { NextResponse } from "next/server";
import { z } from "zod";
import { importWorldwide } from "@/modules/dropship/global/global-service";
import { addSupplierProductToStore } from "@/modules/dropship/services/catalog-service";
import { getPayoutAccount } from "@/modules/dropship/services/payout-service";
import { worldwideError, worldwideStore } from "../_shared";

const schema = z.object({ pid: z.string().min(1), price: z.coerce.number().positive(), publish: z.boolean().default(true) });

/** Imports the CJ product (if new) and adds it to the merchant's store at their price. */
export async function POST(request: Request) {
  try {
    const store = await worldwideStore();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Enter your selling price" }, { status: 400 });
    if (!(await getPayoutAccount({ storeId: store.id }))) {
      return NextResponse.json({ error: "Add your bank account first, so your profit can be paid to you." }, { status: 400 });
    }
    const supplierProductId = await importWorldwide(parsed.data.pid);
    const product = await addSupplierProductToStore(store.id, {
      supplierProductId,
      price: parsed.data.price,
      publish: parsed.data.publish,
    });
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    return worldwideError(error);
  }
}
