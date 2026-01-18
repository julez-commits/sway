create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  text_content text not null,
  yes_votes integer not null default 0,
  no_votes integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.questions enable row level security;

create policy "Questions are viewable by everyone"
  on public.questions
  for select
  using (true);

create policy "Authenticated users can insert questions"
  on public.questions
  for insert
  with check (auth.uid() = user_id);

create policy "Authenticated users can update votes"
  on public.questions
  for update
  using (auth.uid() is not null);

alter publication supabase_realtime add table public.questions;
