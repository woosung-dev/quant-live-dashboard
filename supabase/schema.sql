-- Create profiles table
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for profiles
alter table public.profiles enable row level security;

create policy "Users can view their own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can update their own profile" on profiles
  for update using (auth.uid() = id);

-- Create strategies table
create table public.strategies (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  name text not null,
  type text not null, -- 'SMA_CROSS', 'RSI', etc.
  code text, -- Custom strategy code
  parameters jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for strategies
alter table public.strategies enable row level security;

create policy "Users can view their own strategies" on strategies
  for select using (auth.uid() = user_id);

create policy "Users can insert their own strategies" on strategies
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own strategies" on strategies
  for update using (auth.uid() = user_id);

create policy "Users can delete their own strategies" on strategies
  for delete using (auth.uid() = user_id);

-- Create backtest_history table (Optional for now)
create table public.backtest_history (
  id uuid default gen_random_uuid() primary key,
  strategy_id uuid references public.strategies(id) on delete cascade not null,
  pnl numeric,
  win_rate numeric,
  trades_count integer,
  executed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.backtest_history enable row level security;

create policy "Users can view their own backtest history" on backtest_history
  for select using (
    exists (
      select 1 from strategies
      where strategies.id = backtest_history.strategy_id
      and strategies.user_id = auth.uid()
    )
  );

-- Trigger to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
