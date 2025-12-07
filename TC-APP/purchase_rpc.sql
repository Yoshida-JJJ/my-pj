
-- Function to handle item purchase transaction securely
create or replace function public.purchase_item(
  p_listing_id uuid,
  p_buyer_id uuid,
  p_total_amount integer,
  p_payment_method_id text,
  p_shipping_address text
)
returns uuid
language plpgsql
security definer -- Run with privileges of the creator (admin) to bypass RLS for status update
as $$
declare
  v_listing_status listing_status_enum;
  v_new_order_id uuid;
begin
  -- 1. Check if listing exists and is active
  select status into v_listing_status
  from public.listing_items
  where id = p_listing_id
  for update; -- Lock the row to prevent race conditions

  if v_listing_status is null then
    raise exception 'Listing not found';
  end if;

  if v_listing_status != 'Active' then
    raise exception 'Item is no longer available';
  end if;

  -- 2. Create Order
  insert into public.orders (
    listing_id,
    buyer_id,
    payment_method_id,
    total_amount,
    shipping_address,
    status
  ) values (
    p_listing_id,
    p_buyer_id,
    p_payment_method_id,
    p_total_amount,
    p_shipping_address,
    'Paid'
  )
  returning id into v_new_order_id;

  -- 3. Update Listing Status
  update public.listing_items
  set status = 'AwaitingShipment'
  where id = p_listing_id;

  return v_new_order_id;
end;
$$;
