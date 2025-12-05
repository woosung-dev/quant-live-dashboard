-- Create api_keys table
create table if not exists public.api_keys (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  exchange text not null,
  api_key text not null,
  api_secret text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.api_keys enable row level security;

-- Policies
create policy "Users can view their own api keys" on api_keys
  for select using (auth.uid() = user_id);

create policy "Users can insert their own api keys" on api_keys
  for insert with check (auth.uid() = user_id);

create policy "Users can delete their own api keys" on api_keys
  for delete using (auth.uid() = user_id);
