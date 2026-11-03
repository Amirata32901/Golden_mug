import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "https://amirata32901.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
const response = (status: number, data: Record<string, unknown>) =>
  new Response(JSON.stringify(data), { status, headers });
const clean = (v: unknown, max: number) => String(v ?? "").trim().replace(/[<>]/g, "").slice(0, max);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return response(405, { error: "Method not allowed" });
  try {
    const body = await req.json();
    const firstName = clean(body.firstName, 60);
    const lastName = clean(body.lastName, 60);
    const phone = clean(body.phone, 20);
    const address = clean(body.address, 500);
    const items = Array.isArray(body.items) ? body.items.slice(0, 20) : [];
    const totalAmount = Number(body.totalAmount);
    if (!firstName || !lastName || !address || !/^09\\d{9}$/.test(phone))
      return response(400, { error: "اطلاعات مشتری کامل یا معتبر نیست." });
    if (!items.length || !Number.isSafeInteger(totalAmount) || totalAmount < 0)
      return response(400, { error: "سبد خرید معتبر نیست." });
    const safeItems = items.map((item: any) => ({
      name: clean(item?.name, 100),
      quantity: Math.max(1, Math.min(50, Number(item?.quantity) || 1)),
      unitPrice: Math.max(0, Math.min(100000000, Number(item?.price) || 0)),
    }));
    if (safeItems.some((item: any) => !item.name))
      return response(400, { error: "نام محصول معتبر نیست." });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const orderCode = "GM-" + crypto.randomUUID().slice(0, 8).toUpperCase();
    const { error } = await supabase.from("orders").insert({
      order_code: orderCode, first_name: firstName, last_name: lastName,
      phone, address, items: safeItems, total_amount: totalAmount, status: "new",
    });
    if (error) {
      console.error("Order insert failed:", error.message);
      return response(500, { error: "ذخیره سفارش انجام نشد. دوباره تلاش کنید." });
    }
    return response(201, { ok: true, orderCode });
  } catch (_error) {
    return response(400, { error: "درخواست نامعتبر است." });
  }
});
