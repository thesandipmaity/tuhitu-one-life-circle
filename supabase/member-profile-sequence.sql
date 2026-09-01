create sequence if not exists public.member_signup_seq
  as bigint
  start with 1
  increment by 1
  minvalue 1;

create or replace function public.member_initials(full_name text)
returns text
language sql
immutable
as $$
  select upper(
    coalesce(nullif(substring(split_part(trim(coalesce(full_name, '')), ' ', 1) from 1 for 1), ''), 'O') ||
    coalesce(nullif(substring(split_part(trim(coalesce(full_name, '')), ' ', 2) from 1 for 1), ''), 'L') ||
    coalesce(nullif(substring(split_part(trim(coalesce(full_name, '')), ' ', 3) from 1 for 1), ''), 'C')
  )
$$;

create table if not exists public.member_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  signup_number bigint not null unique default nextval('public.member_signup_seq'),
  member_id text unique,
  full_name text not null default '',
  email text not null default '',
  mobile text not null default '',
  city text not null default '',
  locality text not null default '',
  age_group text not null default '',
  interest text not null default '',
  plan_id text not null default 'community',
  plan_name text not null default 'Community Member',
  status text not null default 'payment_pending',
  can_access_store boolean not null default false,
  payment_verified boolean not null default false,
  valid_until timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.assign_member_profile_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  year_code text;
begin
  if new.signup_number is null then
    new.signup_number := nextval('public.member_signup_seq');
  end if;

  year_code := to_char(coalesce(new.created_at, timezone('utc', now())), 'YY');

  if new.member_id is null or trim(new.member_id) = '' then
    new.member_id := format(
      'OLC-%s-%s-%s',
      public.member_initials(new.full_name),
      year_code,
      lpad(new.signup_number::text, 5, '0')
    );
  end if;

  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists member_profiles_defaults on public.member_profiles;
create trigger member_profiles_defaults
before insert or update on public.member_profiles
for each row
execute function public.assign_member_profile_defaults();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.member_profiles (
    user_id,
    full_name,
    email,
    mobile,
    city,
    locality,
    age_group,
    interest,
    plan_id,
    plan_name,
    status,
    can_access_store,
    payment_verified,
    created_at,
    updated_at
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'fullName', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.email, new.raw_user_meta_data ->> 'email', ''),
    coalesce(new.phone, new.raw_user_meta_data ->> 'mobile', ''),
    coalesce(new.raw_user_meta_data ->> 'city', ''),
    coalesce(new.raw_user_meta_data ->> 'locality', ''),
    coalesce(new.raw_user_meta_data ->> 'ageGroup', ''),
    coalesce(new.raw_user_meta_data ->> 'interest', ''),
    coalesce(new.raw_user_meta_data ->> 'planId', 'community'),
    coalesce(new.raw_user_meta_data ->> 'planName', 'Community Member'),
    coalesce(new.raw_user_meta_data ->> 'status', 'payment_pending'),
    coalesce((new.raw_user_meta_data ->> 'canAccessStore')::boolean, false),
    coalesce((new.raw_user_meta_data ->> 'paymentVerified')::boolean, false),
    coalesce(new.created_at, timezone('utc', now())),
    timezone('utc', now())
  )
  on conflict (user_id) do update
  set
    full_name = excluded.full_name,
    email = excluded.email,
    mobile = excluded.mobile,
    city = excluded.city,
    locality = excluded.locality,
    age_group = excluded.age_group,
    interest = excluded.interest,
    plan_id = excluded.plan_id,
    plan_name = excluded.plan_name,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_member_profile on auth.users;
create trigger on_auth_user_created_member_profile
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

alter table public.member_profiles enable row level security;

drop policy if exists "member_profiles_select_own" on public.member_profiles;
create policy "member_profiles_select_own"
on public.member_profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "member_profiles_update_own" on public.member_profiles;
create policy "member_profiles_update_own"
on public.member_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

insert into public.member_profiles (
  user_id,
  full_name,
  email,
  mobile,
  city,
  locality,
  age_group,
  interest,
  plan_id,
  plan_name,
  status,
  can_access_store,
  payment_verified,
  created_at,
  updated_at
)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'fullName', u.raw_user_meta_data ->> 'name', ''),
  coalesce(u.email, u.raw_user_meta_data ->> 'email', ''),
  coalesce(u.phone, u.raw_user_meta_data ->> 'mobile', ''),
  coalesce(u.raw_user_meta_data ->> 'city', ''),
  coalesce(u.raw_user_meta_data ->> 'locality', ''),
  coalesce(u.raw_user_meta_data ->> 'ageGroup', ''),
  coalesce(u.raw_user_meta_data ->> 'interest', ''),
  coalesce(u.raw_user_meta_data ->> 'planId', 'community'),
  coalesce(u.raw_user_meta_data ->> 'planName', 'Community Member'),
  coalesce(u.raw_user_meta_data ->> 'status', 'payment_pending'),
  coalesce((u.raw_user_meta_data ->> 'canAccessStore')::boolean, false),
  coalesce((u.raw_user_meta_data ->> 'paymentVerified')::boolean, false),
  coalesce(u.created_at, timezone('utc', now())),
  timezone('utc', now())
from auth.users u
on conflict (user_id) do nothing;
