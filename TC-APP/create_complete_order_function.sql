-- Function to allow buyers to mark an order as completed
create or replace function public.complete_order(p_listing_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- Check if the user is the buyer of the order linked to this listing
  if not exists (
    select 1 from public.orders
    where orders.listing_id = p_listing_id
    and orders.buyer_id = auth.uid()
  ) then
    raise exception 'Not authorized';
  end if;

  -- Update the listing status
  update public.listing_items
  set status = 'Completed'
  where id = p_listing_id;
end;
$$;
