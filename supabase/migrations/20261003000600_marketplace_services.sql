-- =============================================================================
-- BridgeConnect · 0006 · Marketplace, services and orders
-- -----------------------------------------------------------------------------
-- Only verified entities with the `products` / `services` capability can list.
-- Orders are created exclusively through `place_order`, which prices items from
-- the database (never from the client), checks stock and records history.
-- Payment is settled offline (cash / mobile money on pickup or delivery).
-- =============================================================================

create type public.listing_domain as enum ('product', 'service', 'job', 'event');

create table public.listing_categories (
  id uuid primary key default gen_random_uuid(),
  domain public.listing_domain not null,
  name text not null check (char_length(name) between 2 and 60),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  sector public.sector,
  sort_order smallint not null default 0,
  is_active boolean not null default true,
  unique (domain, slug)
);

create type public.product_status as enum ('draft', 'active', 'out_of_stock', 'archived', 'removed');
create type public.service_status as enum ('draft', 'active', 'archived', 'removed');

-- Listing slugs are generated server-side from `name` (products, services) or
-- `title` (jobs, events). JSON access keeps one function for every table.
create or replace function private.assign_listing_slug()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_label text := coalesce(to_jsonb(new) ->> 'name', to_jsonb(new) ->> 'title');
begin
  if tg_op = 'INSERT'
     or new_label is distinct from coalesce(to_jsonb(old) ->> 'name', to_jsonb(old) ->> 'title') then
    new.slug := private.unique_slug(
      (quote_ident(tg_table_schema) || '.' || quote_ident(tg_table_name))::regclass, new_label);
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Products
-- -----------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities (id) on delete cascade,
  category_id uuid references public.listing_categories (id) on delete set null,
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique default '', -- always set by private.assign_listing_slug()
  description text check (char_length(description) <= 5000),
  price numeric(12, 2) not null check (price >= 0 and price <= 10000000),
  currency char(3) not null default 'GHS' check (currency ~ '^[A-Z]{3}$'),
  unit text check (char_length(unit) <= 30),
  -- NULL means stock is not tracked.
  stock_quantity int check (stock_quantity >= 0),
  status public.product_status not null default 'draft',
  moderation_reason text check (char_length(moderation_reason) <= 1000),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'C')
  ) stored
);
create index products_entity_idx on public.products (entity_id);
create index products_public_idx on public.products (status, created_at desc);
create index products_category_idx on public.products (category_id);
create index products_search_idx on public.products using gin (search);

create trigger products_set_updated_at before update on public.products
  for each row execute function private.set_updated_at();
create trigger products_assign_slug before insert or update of name on public.products
  for each row execute function private.assign_listing_slug();

create table public.product_media (
  product_id uuid not null references public.products (id) on delete cascade,
  media_id uuid not null references public.media_assets (id) on delete cascade,
  position smallint not null default 0 check (position between 0 and 9),
  primary key (product_id, media_id)
);
create index product_media_media_idx on public.product_media (media_id);

-- -----------------------------------------------------------------------------
-- Services
-- -----------------------------------------------------------------------------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities (id) on delete cascade,
  category_id uuid references public.listing_categories (id) on delete set null,
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique default '', -- always set by private.assign_listing_slug()
  description text check (char_length(description) <= 5000),
  price_from numeric(12, 2) check (price_from >= 0 and price_from <= 10000000),
  currency char(3) not null default 'GHS' check (currency ~ '^[A-Z]{3}$'),
  price_note text check (char_length(price_note) <= 120),
  service_area text check (char_length(service_area) <= 200),
  status public.service_status not null default 'draft',
  moderation_reason text check (char_length(moderation_reason) <= 1000),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'C')
  ) stored
);
create index services_entity_idx on public.services (entity_id);
create index services_public_idx on public.services (status, created_at desc);
create index services_category_idx on public.services (category_id);
create index services_search_idx on public.services using gin (search);

create trigger services_set_updated_at before update on public.services
  for each row execute function private.set_updated_at();
create trigger services_assign_slug before insert or update of name on public.services
  for each row execute function private.assign_listing_slug();

-- -----------------------------------------------------------------------------
-- Orders
-- -----------------------------------------------------------------------------
create type public.order_status as enum (
  'pending', 'confirmed', 'ready', 'completed', 'cancelled', 'declined'
);
create type public.fulfilment_method as enum ('pickup', 'delivery');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  buyer_id uuid not null references public.profiles (id) on delete restrict,
  entity_id uuid not null references public.entities (id) on delete restrict,
  status public.order_status not null default 'pending',
  fulfilment public.fulfilment_method not null,
  delivery_address text check (char_length(delivery_address) <= 300),
  contact_phone text not null check (contact_phone ~ '^\+?[0-9 ]{7,20}$'),
  buyer_note text check (char_length(buyer_note) <= 500),
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  currency char(3) not null,
  status_reason text check (char_length(status_reason) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_delivery_address_required
    check (fulfilment = 'pickup' or delivery_address is not null)
);
create index orders_buyer_idx on public.orders (buyer_id, created_at desc);
create index orders_entity_idx on public.orders (entity_id, status, created_at desc);

create trigger orders_set_updated_at before update on public.orders
  for each row execute function private.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  quantity int not null check (quantity between 1 and 1000),
  line_total numeric(12, 2) generated always as (unit_price * quantity) stored
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

create table public.order_status_history (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  status public.order_status not null,
  actor_id uuid references public.profiles (id) on delete set null,
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);
create index order_status_history_order_idx on public.order_status_history (order_id, created_at);

create or replace function private.notify_entity_staff(
  p_entity uuid, p_min_role public.membership_role,
  p_type text, p_title text, p_body text, p_link text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m record;
begin
  for m in select user_id from public.entity_memberships
           where entity_id = p_entity
             and private.membership_rank(role) >= private.membership_rank(p_min_role) loop
    perform private.notify(m.user_id, p_type, p_title, p_body, p_link);
  end loop;
end;
$$;

-- p_items: [{"product_id": "<uuid>", "quantity": 2}, ...]
create or replace function public.place_order(
  p_entity uuid,
  p_items jsonb,
  p_fulfilment public.fulfilment_method,
  p_contact_phone text,
  p_delivery_address text default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  buyer uuid := (select auth.uid());
  new_order uuid;
  item jsonb;
  prod public.products%rowtype;
  qty int;
  total numeric(12, 2) := 0;
  order_currency char(3);
  item_count int;
begin
  if buyer is null or not private.is_active_user() then
    raise exception 'Sign in to place an order' using errcode = '42501';
  end if;
  if not exists (select 1 from public.entities where id = p_entity and status = 'active')
     or not private.entity_has_capability(p_entity, 'orders') then
    raise exception 'This seller is not accepting orders' using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'Invalid items' using errcode = '22023';
  end if;
  item_count := jsonb_array_length(p_items);
  if item_count < 1 or item_count > 50 then
    raise exception 'An order must contain between 1 and 50 items' using errcode = '22023';
  end if;
  if (select count(*) from public.orders
      where buyer_id = buyer and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Order limit reached. Please try again later.' using errcode = '54000';
  end if;
  if p_fulfilment = 'delivery' and char_length(coalesce(trim(p_delivery_address), '')) < 5 then
    raise exception 'A delivery address is required' using errcode = '22023';
  end if;

  insert into public.orders (buyer_id, entity_id, fulfilment, delivery_address,
                             contact_phone, buyer_note, subtotal, currency)
  values (buyer, p_entity, p_fulfilment, nullif(trim(p_delivery_address), ''),
          p_contact_phone, nullif(trim(p_note), ''), 0, 'GHS')
  returning id into new_order;

  for item in select * from jsonb_array_elements(p_items) loop
    begin
      qty := (item ->> 'quantity')::int;
    exception when others then
      raise exception 'Invalid quantity' using errcode = '22023';
    end;
    if qty is null or qty < 1 or qty > 1000 then
      raise exception 'Invalid quantity' using errcode = '22023';
    end if;

    select * into prod from public.products
    where id = (item ->> 'product_id')::uuid and entity_id = p_entity
    for update;
    if not found or prod.status <> 'active' then
      raise exception 'A product in your order is no longer available' using errcode = '22023';
    end if;
    if order_currency is null then
      order_currency := prod.currency;
    elsif order_currency <> prod.currency then
      raise exception 'Mixed currencies are not supported' using errcode = '22023';
    end if;
    if prod.stock_quantity is not null then
      if prod.stock_quantity < qty then
        raise exception 'Only % of "%" left in stock', prod.stock_quantity, prod.name
          using errcode = '22023';
      end if;
      update public.products
      set stock_quantity = stock_quantity - qty,
          status = case when stock_quantity - qty = 0 then 'out_of_stock'::public.product_status else status end
      where id = prod.id;
    end if;

    insert into public.order_items (order_id, product_id, product_name, unit_price, quantity)
    values (new_order, prod.id, prod.name, prod.price, qty);
    total := total + prod.price * qty;
  end loop;

  update public.orders set subtotal = total, currency = order_currency where id = new_order;
  insert into public.order_status_history (order_id, status, actor_id)
  values (new_order, 'pending', buyer);

  perform private.notify_entity_staff(p_entity, 'editor', 'marketplace.new_order',
    'New order received', 'Order total ' || order_currency || ' ' || total::text,
    '/workspace/' || p_entity::text || '/orders/' || new_order::text);
  return new_order;
end;
$$;

-- Restore tracked stock for an order that will not be fulfilled.
create or replace function private.restock_order(p_order uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.products p
  set stock_quantity = p.stock_quantity + oi.quantity,
      status = case when p.status = 'out_of_stock' then 'active'::public.product_status else p.status end
  from public.order_items oi
  where oi.order_id = p_order and oi.product_id = p.id and p.stock_quantity is not null;
$$;

-- Status transitions. Sellers: pending→confirmed|declined, confirmed→ready|cancelled,
-- ready→completed|cancelled. Buyers: pending|confirmed→cancelled.
create or replace function public.update_order_status(
  p_order uuid,
  p_status public.order_status,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders%rowtype;
  uid uuid := (select auth.uid());
  is_seller boolean;
  is_buyer boolean;
  allowed boolean := false;
begin
  select * into o from public.orders where id = p_order for update;
  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;
  is_seller := private.entity_can(o.entity_id, 'orders', 'editor');
  is_buyer := o.buyer_id = uid and private.is_active_user();
  if not is_seller and not is_buyer then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  if is_seller then
    allowed := (o.status = 'pending' and p_status in ('confirmed', 'declined'))
            or (o.status = 'confirmed' and p_status in ('ready', 'cancelled'))
            or (o.status = 'ready' and p_status in ('completed', 'cancelled'));
  end if;
  if not allowed and is_buyer then
    allowed := o.status in ('pending', 'confirmed') and p_status = 'cancelled';
  end if;
  if not allowed then
    raise exception 'Cannot change order from % to %', o.status, p_status using errcode = '22023';
  end if;

  update public.orders set status = p_status, status_reason = left(p_note, 500) where id = p_order;
  insert into public.order_status_history (order_id, status, actor_id, note)
  values (p_order, p_status, uid, left(p_note, 500));

  if p_status in ('cancelled', 'declined') then
    perform private.restock_order(p_order);
  end if;

  if uid = o.buyer_id then
    perform private.notify_entity_staff(o.entity_id, 'editor', 'marketplace.order_updated',
      'Order ' || o.order_number || ' was ' || p_status::text, left(p_note, 300),
      '/workspace/' || o.entity_id::text || '/orders/' || o.id::text);
  else
    perform private.notify(o.buyer_id, 'marketplace.order_updated',
      'Order ' || o.order_number || ' is ' || p_status::text, left(p_note, 300),
      '/orders/' || o.id::text);
  end if;
end;
$$;

revoke all on function public.place_order(uuid, jsonb, public.fulfilment_method, text, text, text) from public, anon;
revoke all on function public.update_order_status(uuid, public.order_status, text) from public, anon;
grant execute on function public.place_order(uuid, jsonb, public.fulfilment_method, text, text, text) to authenticated;
grant execute on function public.update_order_status(uuid, public.order_status, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.listing_categories enable row level security;
alter table public.products enable row level security;
alter table public.product_media enable row level security;
alter table public.services enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;

grant select on public.listing_categories to anon, authenticated;
grant insert, update on public.listing_categories to authenticated;
create policy "Categories are public"
  on public.listing_categories for select to anon, authenticated
  using (is_active or private.has_permission('marketplace.manage'));
create policy "Marketplace managers add categories"
  on public.listing_categories for insert to authenticated
  with check (private.has_permission('marketplace.manage'));
create policy "Marketplace managers edit categories"
  on public.listing_categories for update to authenticated
  using (private.has_permission('marketplace.manage'))
  with check (private.has_permission('marketplace.manage'));

-- Products
grant select on public.products to anon, authenticated;
grant insert (entity_id, category_id, name, description, price, unit, stock_quantity, status)
  on public.products to authenticated;
grant update (category_id, name, description, price, unit, stock_quantity, status)
  on public.products to authenticated;

create policy "Active products of active entities are public"
  on public.products for select to anon, authenticated
  using (status in ('active', 'out_of_stock') and private.entity_is_public(entity_id)
         and private.entity_has_capability(entity_id, 'products'));
create policy "Entity members see their products"
  on public.products for select to authenticated
  using (private.is_entity_member(entity_id));
create policy "Marketplace admins see products in scope"
  on public.products for select to authenticated
  using (private.has_permission('marketplace.manage', private.entity_community(entity_id)));
create policy "Entity editors create products"
  on public.products for insert to authenticated
  with check (private.entity_can(entity_id, 'products', 'editor') and status <> 'removed');
create policy "Entity editors edit products"
  on public.products for update to authenticated
  using (private.entity_can(entity_id, 'products', 'editor') and status <> 'removed')
  with check (private.entity_can(entity_id, 'products', 'editor') and status <> 'removed');

grant select on public.product_media to anon, authenticated;
grant insert, delete on public.product_media to authenticated;
create policy "Product media is public"
  on public.product_media for select to anon, authenticated using (true);
create policy "Entity editors attach product media"
  on public.product_media for insert to authenticated
  with check (exists (
    select 1 from public.products p
    join public.media_assets m on m.id = media_id
    where p.id = product_id and m.entity_id = p.entity_id
      and private.entity_can(p.entity_id, 'products', 'editor')));
create policy "Entity editors detach product media"
  on public.product_media for delete to authenticated
  using (exists (select 1 from public.products p where p.id = product_id
                 and private.entity_can(p.entity_id, 'products', 'editor')));

-- Services
grant select on public.services to anon, authenticated;
grant insert (entity_id, category_id, name, description, price_from, price_note, service_area, status)
  on public.services to authenticated;
grant update (category_id, name, description, price_from, price_note, service_area, status)
  on public.services to authenticated;

create policy "Active services of active entities are public"
  on public.services for select to anon, authenticated
  using (status = 'active' and private.entity_is_public(entity_id)
         and private.entity_has_capability(entity_id, 'services'));
create policy "Entity members see their services"
  on public.services for select to authenticated
  using (private.is_entity_member(entity_id));
create policy "Marketplace admins see services in scope"
  on public.services for select to authenticated
  using (private.has_permission('marketplace.manage', private.entity_community(entity_id)));
create policy "Entity editors create services"
  on public.services for insert to authenticated
  with check (private.entity_can(entity_id, 'services', 'editor') and status <> 'removed');
create policy "Entity editors edit services"
  on public.services for update to authenticated
  using (private.entity_can(entity_id, 'services', 'editor') and status <> 'removed')
  with check (private.entity_can(entity_id, 'services', 'editor') and status <> 'removed');

-- Orders: read-only via RLS; all writes through RPCs.
grant select on public.orders, public.order_items, public.order_status_history to authenticated;

create policy "Buyers see their orders"
  on public.orders for select to authenticated
  using (buyer_id = (select auth.uid()));
create policy "Sellers see orders for their entity"
  on public.orders for select to authenticated
  using (private.is_entity_member(entity_id, 'editor'));
create policy "Order admins see orders in scope"
  on public.orders for select to authenticated
  using (private.has_permission('orders.read_all', private.entity_community(entity_id)));

create policy "Order items follow order visibility"
  on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id));
create policy "Order history follows order visibility"
  on public.order_status_history for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id));
