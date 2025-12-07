
-- Create user_collections table for manually added cards
create table public.user_collections (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  catalog_id uuid references public.card_catalogs(id) not null,
  images jsonb not null default '[]'::jsonb,
  condition text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for user_collections
alter table public.user_collections enable row level security;

create policy "Users can view their own collection." 
on public.user_collections for select 
using (auth.uid() = user_id);

create policy "Users can insert into their own collection." 
on public.user_collections for insert 
with check (auth.uid() = user_id);

create policy "Users can update their own collection." 
on public.user_collections for update 
using (auth.uid() = user_id);

create policy "Users can delete from their own collection." 
on public.user_collections for delete 
using (auth.uid() = user_id);
