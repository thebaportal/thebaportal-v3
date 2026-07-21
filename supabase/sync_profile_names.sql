-- Trigger: copy full_name from auth metadata into profiles on sign-up
-- Backfill: fix existing users whose profiles.full_name is null

-- 1. Function that runs on every new sign-up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, subscription_tier)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    'free'
  )
  on conflict (id) do update
    set full_name = coalesce(excluded.full_name, public.profiles.full_name);
  return new;
end;
$$ language plpgsql security definer;

-- 2. Attach trigger to auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Backfill existing users whose name is missing in profiles
update public.profiles p
set full_name = u.raw_user_meta_data->>'full_name'
from auth.users u
where p.id = u.id
  and (p.full_name is null or p.full_name = '')
  and u.raw_user_meta_data->>'full_name' is not null;
