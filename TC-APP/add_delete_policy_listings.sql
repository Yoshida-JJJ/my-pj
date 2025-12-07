-- Add delete policy for listing_items
create policy "Users can delete their own listings." 
on public.listing_items for delete 
using (auth.uid() = seller_id);
